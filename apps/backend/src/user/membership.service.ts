import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  users,
  userOrganisationMemberships,
  type User,
  type UserOrganisationMembership,
} from '../db/schema';
import { OrganisationRole } from './organisation-role.enum';
import {
  AUDIT_USER_INVITED,
  AUDIT_USER_ROLE_CHANGED,
  AUDIT_USER_REMOVED,
  AUTH_USER_INVITED,
  AuditUserEvent,
  AuthUserInvitedEvent,
} from '../audit-log/audit.events';

const SET_PASSWORD_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type MembershipWithUser = UserOrganisationMembership & { user: User };

@Injectable()
export class MembershipService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listMembers(organisationId: string): Promise<MembershipWithUser[]> {
    return this.db.query.userOrganisationMemberships.findMany({
      where: eq(userOrganisationMemberships.organisationId, organisationId),
      with: { user: true },
    });
  }

  async addMember(
    organisationId: string,
    email: string,
    role: OrganisationRole,
  ): Promise<MembershipWithUser> {
    const normalisedEmail = email.toLowerCase();
    // Find or provision the user (invitee) by email. New invitees have a null
    // password hash and must activate via a set-password link.
    let [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, normalisedEmail))
      .limit(1);
    const isNewInvitee = !user;
    if (!user) {
      [user] = await this.db
        .insert(users)
        .values({ email: normalisedEmail, name: null, passwordHash: null })
        .returning();
    }

    // Check if membership already exists
    const [existing] = await this.db
      .select()
      .from(userOrganisationMemberships)
      .where(
        and(
          eq(userOrganisationMemberships.userId, user.id),
          eq(userOrganisationMemberships.organisationId, organisationId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new ConflictException('User is already a member of this organisation');
    }

    const [saved] = await this.db
      .insert(userOrganisationMemberships)
      .values({ userId: user.id, organisationId, role })
      .returning();

    // For brand-new invitees, issue a set-password token and let the auth layer
    // email the activation link (decoupled via event to avoid a circular dep).
    if (isNewInvitee) {
      const token = randomBytes(32).toString('base64url');
      await this.db
        .update(users)
        .set({
          passwordResetToken: token,
          passwordResetTokenExpiresAt: new Date(Date.now() + SET_PASSWORD_TOKEN_TTL_MS),
        })
        .where(eq(users.id, user.id));
      this.eventEmitter.emit(AUTH_USER_INVITED, new AuthUserInvitedEvent(user.email, token));
    }

    this.eventEmitter.emit(
      AUDIT_USER_INVITED,
      new AuditUserEvent(user.id, organisationId, null, { email: normalisedEmail, role }),
    );
    return { ...saved, user };
  }

  async updateRole(
    organisationId: string,
    userId: string,
    role: OrganisationRole,
  ): Promise<MembershipWithUser> {
    const membership = await this.db.query.userOrganisationMemberships.findFirst({
      where: and(
        eq(userOrganisationMemberships.userId, userId),
        eq(userOrganisationMemberships.organisationId, organisationId),
      ),
      with: { user: true },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // If demoting from OrgAdmin, ensure they are not the last one
    if (membership.role === OrganisationRole.OrgAdmin && role !== OrganisationRole.OrgAdmin) {
      await this.ensureNotLastAdmin(organisationId);
    }

    const oldRole = membership.role;
    const [saved] = await this.db
      .update(userOrganisationMemberships)
      .set({ role })
      .where(eq(userOrganisationMemberships.id, membership.id))
      .returning();
    this.eventEmitter.emit(
      AUDIT_USER_ROLE_CHANGED,
      new AuditUserEvent(userId, organisationId, null, {
        oldRole,
        newRole: role,
      }),
    );
    return { ...saved, user: membership.user };
  }

  async removeMember(organisationId: string, userId: string): Promise<void> {
    const [membership] = await this.db
      .select()
      .from(userOrganisationMemberships)
      .where(
        and(
          eq(userOrganisationMemberships.userId, userId),
          eq(userOrganisationMemberships.organisationId, organisationId),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Cannot remove the last Org Admin
    if (membership.role === OrganisationRole.OrgAdmin) {
      await this.ensureNotLastAdmin(organisationId);
    }

    await this.db
      .delete(userOrganisationMemberships)
      .where(eq(userOrganisationMemberships.id, membership.id));
    this.eventEmitter.emit(
      AUDIT_USER_REMOVED,
      new AuditUserEvent(userId, organisationId, null, null),
    );
  }

  private async ensureNotLastAdmin(organisationId: string): Promise<void> {
    const adminCount = await this.db.$count(
      userOrganisationMemberships,
      and(
        eq(userOrganisationMemberships.organisationId, organisationId),
        eq(userOrganisationMemberships.role, OrganisationRole.OrgAdmin),
      ),
    );
    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot remove or demote the last Org Admin of this organisation',
      );
    }
  }
}
