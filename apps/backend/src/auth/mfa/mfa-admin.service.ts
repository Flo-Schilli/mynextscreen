import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import {
  AUDIT_AUTH_MFA_RESET,
  AUDIT_ORGANISATION_MFA_REQUIREMENT_CHANGED,
  AUTH_MFA_RESET,
  AUTH_ORG_MFA_REQUIRED,
  AuditMfaResetEvent,
  AuditOrganisationEvent,
  AuthMfaResetEvent,
  AuthOrgMfaRequiredEvent,
  type MfaResetBy,
} from '../../audit-log/audit.events';
import { DRIZZLE } from '../../db/database.constants';
import type { DrizzleDB } from '../../db/drizzle.types';
import {
  organisations,
  userMfa,
  userOrganisationMemberships,
  users,
  type Organisation,
  type User,
} from '../../db/schema';
import { REDIS_CLIENT } from '../../redis';
import { OrganisationRole } from '../../user/organisation-role.enum';
import { UserService } from '../../user/user.service';
import type { AuthenticatedUser } from '../jwt-auth.guard';
import { TokenService } from '../token.service';
import {
  MFA_RESET_NEEDS_SUPER_ADMIN,
  MFA_RESET_SELF,
  MFA_RESET_TARGET_SUPER_ADMIN,
  MFA_SELF_REQUIRED,
  mfaRedisKeys,
} from './mfa.constants';
import { mfaForbidden, mfaNotEnabled, mfaResetNotMember } from './mfa.errors';
import { RecoveryCodeService } from './recovery-code.service';

/** `GET|PATCH /api/organisations/:orgId/mfa-requirement` (mirrored in shared-types). */
export interface OrgMfaRequirementView {
  requireMfa: boolean;
  /** ISO timestamp of when it was switched on, null while off. */
  requireMfaSince: string | null;
}

/**
 * Admin-side MFA: the per-org `requireMfa` switch and the two resets (by a
 * super-admin, by an org-admin). MFA is bound to the USER, so a reset is
 * global — which is why the org-admin variant refuses whenever the target is
 * also in an org the caller does not administer.
 */
@Injectable()
export class MfaAdminService {
  private readonly logger = new Logger(MfaAdminService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly recoveryCodes: RecoveryCodeService,
    private readonly tokens: TokenService,
    private readonly users: UserService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Org requirement ───────────────────────────────────────────────────────

  async getOrgRequirement(organisationId: string): Promise<OrgMfaRequirementView> {
    return toRequirementView(await this.findOrganisation(organisationId));
  }

  /**
   * Switch `requireMfa`. Turning it on needs the caller's own session to be
   * MFA-confirmed (else the admin would lock himself into the wizard), mails
   * every member who has no TOTP yet and is audited; a no-op change is not.
   */
  async setOrgRequirement(
    organisationId: string,
    requireMfa: boolean,
    actor: AuthenticatedUser,
  ): Promise<OrgMfaRequirementView> {
    if (requireMfa && !actor.mfa) {
      throw mfaForbidden(
        MFA_SELF_REQUIRED,
        'Set up multi-factor authentication for yourself before requiring it',
      );
    }
    const before = await this.findOrganisation(organisationId);
    if (before.requireMfa === requireMfa) {
      return toRequirementView(before);
    }
    const [saved] = await this.db
      .update(organisations)
      .set({ requireMfa, requireMfaSince: requireMfa ? new Date() : null })
      .where(eq(organisations.id, organisationId))
      .returning();

    this.logger.log(
      `Org MFA requirement changed organisationId=${organisationId} requireMfa=${requireMfa} actorId=${actor.userId}`,
    );
    this.events.emit(
      AUDIT_ORGANISATION_MFA_REQUIREMENT_CHANGED,
      new AuditOrganisationEvent(organisationId, actor.userId, {
        name: saved.name,
        requireMfa,
      }),
    );
    if (requireMfa) {
      await this.notifyMembersWithoutMfa(saved);
    }
    return toRequirementView(saved);
  }

  // ── Resets ────────────────────────────────────────────────────────────────

  /** Any user but the caller, other super-admins included. */
  async resetBySuperAdmin(targetUserId: string, actor: AuthenticatedUser): Promise<void> {
    this.assertNotSelf(targetUserId, actor);
    const target = await this.requireUser(targetUserId);
    await this.reset(target, actor, 'super_admin');
  }

  /**
   * Org-admin reset, refused (one code per reason) unless: the caller's session
   * is MFA-confirmed, the target is another member of `organisationId`, not a
   * super-admin, and every org of the target is one the caller administers.
   * A super-admin calling this route gets the super-admin rules.
   */
  async resetByOrgAdmin(
    organisationId: string,
    targetUserId: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (actor.isSuperAdmin) {
      if (!(await this.users.getMembership(targetUserId, organisationId))) {
        throw mfaResetNotMember();
      }
      return this.resetBySuperAdmin(targetUserId, actor);
    }
    if (!actor.mfa) {
      throw mfaForbidden(
        MFA_SELF_REQUIRED,
        'Your session must be confirmed with multi-factor authentication',
      );
    }
    this.assertNotSelf(targetUserId, actor);
    if (!(await this.users.getMembership(targetUserId, organisationId))) {
      throw mfaResetNotMember();
    }
    const target = await this.requireUser(targetUserId);
    if (target.isSuperAdmin) {
      throw mfaForbidden(
        MFA_RESET_TARGET_SUPER_ADMIN,
        'Only a platform administrator can reset a platform administrator',
      );
    }
    if (!(await this.administersAllOrgsOf(actor.userId, targetUserId))) {
      throw mfaForbidden(
        MFA_RESET_NEEDS_SUPER_ADMIN,
        'This user belongs to other organisations — ask a platform administrator',
      );
    }
    await this.reset(target, actor, 'org_admin');
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Drop factor + recovery codes (one transaction), the pending enrolment and
   * the failure counter, revoke every session, then audit in every org of the
   * target and mail them. A user whose MFA is mandatory lands in the wizard on
   * the next sign-in.
   */
  private async reset(target: User, actor: AuthenticatedUser, by: MfaResetBy): Promise<void> {
    const removed = await this.db.transaction(async (tx) => {
      const rows = await tx
        .delete(userMfa)
        .where(eq(userMfa.userId, target.id))
        .returning({ userId: userMfa.userId });
      await this.recoveryCodes.deleteAll(target.id, tx);
      return rows.length > 0;
    });
    if (!removed) {
      throw mfaNotEnabled();
    }
    await this.redis.del(mfaRedisKeys.enrolment(target.id));
    await this.redis.del(mfaRedisKeys.failures(target.id));
    const revoked = await this.tokens.revokeAllForUser(target.id);
    this.logger.log(
      `MFA reset userId=${target.id} by=${by} actorId=${actor.userId} revokedSessions=${revoked}`,
    );

    const details = { by, actorId: actor.userId, email: target.email };
    const orgIds = await this.organisationIdsOf(target.id);
    for (const organisationId of orgIds.length > 0 ? orgIds : [null]) {
      this.events.emit(
        AUDIT_AUTH_MFA_RESET,
        new AuditMfaResetEvent(target.id, organisationId, actor.userId, details),
      );
    }
    this.events.emit(AUTH_MFA_RESET, new AuthMfaResetEvent(target.email, by));
  }

  private async notifyMembersWithoutMfa(organisation: Organisation): Promise<void> {
    // Invitees without a password have no account to protect yet — the
    // requirement greets them when they first sign in.
    const rows = await this.db
      .select({ email: users.email })
      .from(userOrganisationMemberships)
      .innerJoin(users, eq(users.id, userOrganisationMemberships.userId))
      .leftJoin(userMfa, eq(userMfa.userId, userOrganisationMemberships.userId))
      .where(
        and(
          eq(userOrganisationMemberships.organisationId, organisation.id),
          isNull(userMfa.userId),
          isNotNull(users.passwordHash),
        ),
      );
    for (const { email } of rows) {
      this.events.emit(
        AUTH_ORG_MFA_REQUIRED,
        new AuthOrgMfaRequiredEvent(email, organisation.name),
      );
    }
  }

  /** True when the caller is OrgAdmin in every organisation the target belongs to. */
  private async administersAllOrgsOf(callerId: string, targetUserId: string): Promise<boolean> {
    const [targetOrgs, callerAdminOrgs] = await Promise.all([
      this.organisationIdsOf(targetUserId),
      this.db
        .select({ organisationId: userOrganisationMemberships.organisationId })
        .from(userOrganisationMemberships)
        .where(
          and(
            eq(userOrganisationMemberships.userId, callerId),
            eq(userOrganisationMemberships.role, OrganisationRole.OrgAdmin),
          ),
        ),
    ]);
    const administered = new Set(callerAdminOrgs.map((row) => row.organisationId));
    return targetOrgs.every((id) => administered.has(id));
  }

  private async organisationIdsOf(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ organisationId: userOrganisationMemberships.organisationId })
      .from(userOrganisationMemberships)
      .where(eq(userOrganisationMemberships.userId, userId));
    return rows.map((row) => row.organisationId);
  }

  private assertNotSelf(targetUserId: string, actor: AuthenticatedUser): void {
    if (targetUserId === actor.userId) {
      throw mfaForbidden(
        MFA_RESET_SELF,
        'You cannot reset your own multi-factor authentication — use your security settings',
      );
    }
  }

  private async findOrganisation(organisationId: string): Promise<Organisation> {
    const [organisation] = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId));
    if (!organisation) {
      throw new NotFoundException('Organisation not found');
    }
    return organisation;
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

function toRequirementView(organisation: Organisation): OrgMfaRequirementView {
  return {
    requireMfa: organisation.requireMfa,
    requireMfaSince: organisation.requireMfaSince?.toISOString() ?? null,
  };
}
