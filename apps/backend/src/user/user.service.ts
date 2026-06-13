import { ConflictException, ForbiddenException, Injectable, Inject } from '@nestjs/common';
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';

/** The transaction-scoped Drizzle client passed to `db.transaction(tx => …)`. */
type DrizzleTx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];
import {
  organisations,
  users,
  userOrganisationMemberships,
  type User,
  type UserOrganisationMembership,
  type Organisation,
} from '../db/schema';
import { OrganisationRole } from './organisation-role.enum';

/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = '23505';

interface PgErrorLike {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

/**
 * Detect a Postgres unique-violation. Drizzle wraps the driver error in a
 * `DrizzleQueryError`, so the SQLSTATE `code` (and `constraint`) live on
 * `error.cause`; unwrap one level before checking.
 */
function findUniqueViolation(error: unknown): { constraint?: string } | null {
  for (let current: unknown = error, depth = 0; current && depth < 3; depth++) {
    const e = current as PgErrorLike;
    if (e.code === PG_UNIQUE_VIOLATION) {
      return { constraint: typeof e.constraint === 'string' ? e.constraint : undefined };
    }
    current = e.cause;
  }
  return null;
}

export interface UserMembershipView {
  organisationId: string;
  organisationName: string;
  role: string;
}

export interface UserWithMembershipsView {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  memberships: UserMembershipView[];
}

export interface SignupInput {
  email: string;
  passwordHash: string;
  name: string | null;
  organisationName: string;
  verificationToken: string;
  verificationTokenExpiresAt: Date;
  storageOriginalLimitBytes: number;
  storageTranscodedLimitBytes: number;
  timeZone?: string;
}

@Injectable()
export class UserService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Self-signup: atomically create an unverified user, their own new
   * organisation, and an OrgAdmin membership linking the two. Email + org-name
   * uniqueness are enforced at the DB level; a unique violation maps to a 409 so
   * the SPA can surface "email already in use" / "organisation name taken".
   * The user starts `emailVerified:false` — login stays blocked until they
   * click the emailed verification link.
   */
  async createUserWithOrganisation(input: SignupInput): Promise<User> {
    const normalised = input.email.toLowerCase();
    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            email: normalised,
            name: input.name,
            passwordHash: input.passwordHash,
            emailVerified: false,
            emailVerificationToken: input.verificationToken,
            emailVerificationTokenExpiresAt: input.verificationTokenExpiresAt,
          })
          .returning();
        const [organisation] = await tx
          .insert(organisations)
          .values({
            name: input.organisationName,
            timeZone: input.timeZone ?? 'UTC',
            storageOriginalLimitBytes: input.storageOriginalLimitBytes,
            storageTranscodedLimitBytes: input.storageTranscodedLimitBytes,
          })
          .returning();
        await tx.insert(userOrganisationMemberships).values({
          userId: user.id,
          organisationId: organisation.id,
          role: OrganisationRole.OrgAdmin,
        });
        return user;
      });
    } catch (error: unknown) {
      const violation = findUniqueViolation(error);
      if (violation) {
        const target = violation.constraint?.includes('name') ? 'Organisation name' : 'Email';
        throw new ConflictException(`${target} is already in use`);
      }
      throw error;
    }
  }

  async findById(userId: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  /** True if at least one user exists. Drives the first-run setup gate. */
  async hasAnyUser(): Promise<boolean> {
    const [user] = await this.db.select({ id: users.id }).from(users).limit(1);
    return !!user;
  }

  /**
   * First-run setup: create the very first system super-admin via the UI
   * (replaces env-based seeding). Atomic — the existence check and insert run in
   * one transaction so a concurrent setup race cannot create two "first" admins.
   * Throws ConflictException once any user exists.
   */
  async createFirstSuperAdmin(
    email: string,
    passwordHash: string,
    name: string | null = null,
  ): Promise<User> {
    const normalised = email.toLowerCase();
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: users.id }).from(users).limit(1);
      if (existing) {
        throw new ConflictException('Setup already completed');
      }
      const [user] = await tx
        .insert(users)
        // First-run super-admin is provisioned directly by the operator — there
        // is no verification email for them, so mark verified up front or login
        // would be blocked by the email-not-verified gate on every subsequent visit.
        .values({ email: normalised, name, passwordHash, isSuperAdmin: true, emailVerified: true })
        .returning();
      return user;
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user ?? null;
  }

  /**
   * Create an invitee: a user provisioned by an admin who has no password yet
   * (null hash). They activate via the set-password link. Idempotent on email.
   */
  async createInvitee(email: string, name: string | null = null): Promise<User> {
    const normalised = email.toLowerCase();
    const existing = await this.findByEmail(normalised);
    if (existing) {
      return existing;
    }
    const [user] = await this.db
      .insert(users)
      .values({ email: normalised, name, passwordHash: null })
      .returning();
    return user;
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token))
      .limit(1);
    return user ?? null;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordResetToken: token, passwordResetTokenExpiresAt: expiresAt })
      .where(eq(users.id, userId));
  }

  /**
   * Apply a new password hash and clear any outstanding reset token. Also marks
   * the account email-verified: an invitee activating via the set-password link
   * has, by definition, proven control of their inbox (the link was emailed to
   * them), so they must not be blocked by the unverified-login gate afterwards.
   */
  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        emailVerified: true,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      })
      .where(eq(users.id, userId));
  }

  async getMemberships(
    userId: string,
  ): Promise<(UserOrganisationMembership & { organisation: Organisation })[]> {
    return this.db.query.userOrganisationMemberships.findMany({
      where: eq(userOrganisationMemberships.userId, userId),
      with: { organisation: true },
    });
  }

  // ── Email verification ──────────────────────────────────────────────────────

  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerificationToken: token, emailVerificationTokenExpiresAt: expiresAt })
      .where(eq(users.id, userId));
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token))
      .limit(1);
    return user ?? null;
  }

  /** Mark the user verified and clear the one-time verification token. */
  async markEmailVerified(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      })
      .where(eq(users.id, userId));
  }

  /**
   * Within a transaction: delete the given users (cascading their memberships)
   * and then drop any of the supplied organisations that no longer has a single
   * remaining member — i.e. the orphan org each deleted user left behind. The org
   * has no FK to the user, so it is removed explicitly here. Returns the ids of
   * the orgs that were actually dropped (callers use them for media cleanup).
   *
   * Shared by `deleteStaleUnverifiedSignups` (cron) and `deleteUser` (self-delete
   * / super-admin delete) so the orphan-org logic lives in exactly one place.
   */
  async deleteOrphanUsers(
    tx: DrizzleTx,
    userIds: readonly string[],
    candidateOrgIds: readonly string[],
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }
    await tx.delete(users).where(inArray(users.id, [...userIds]));

    const droppedOrgIds: string[] = [];
    const uniqueOrgIds = [...new Set(candidateOrgIds)];
    for (const orgId of uniqueOrgIds) {
      const [remaining] = await tx
        .select({ id: userOrganisationMemberships.id })
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.organisationId, orgId))
        .limit(1);
      if (!remaining) {
        await tx.delete(organisations).where(eq(organisations.id, orgId));
        droppedOrgIds.push(orgId);
      }
    }
    return droppedOrgIds;
  }

  /**
   * Delete never-verified signups older than the cutoff and the organisation
   * each one created (cascades remove the membership; the org has no FK to the
   * user, so it is removed explicitly only when it has no remaining members).
   * Returns the number of users removed.
   */
  async deleteStaleUnverifiedSignups(cutoff: Date): Promise<number> {
    return this.db.transaction(async (tx) => {
      const stale = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.emailVerified, false), lt(users.createdAt, cutoff)));
      if (stale.length === 0) {
        return 0;
      }
      const userIds = stale.map((u) => u.id);
      const memberships = await tx
        .select({ organisationId: userOrganisationMemberships.organisationId })
        .from(userOrganisationMemberships)
        .where(inArray(userOrganisationMemberships.userId, userIds));
      const orgIds = memberships.map((m) => m.organisationId);

      await this.deleteOrphanUsers(tx, userIds, orgIds);
      return userIds.length;
    });
  }

  /**
   * Delete a single user and clean up after them: in one transaction collect the
   * user's org-ids, remove the user (cascading their memberships), then drop any
   * org left with no members (orphan org). Returns the ids of the dropped orgs so
   * the caller can remove their media directories outside the transaction.
   *
   * When `guardLastSuperAdmin` is set, the last-super-admin lockout check runs
   * INSIDE the transaction: the target row is locked with `SELECT … FOR UPDATE`
   * and, if it is a super-admin, the super-admin count is re-read under that lock
   * before the delete. This closes the TOCTOU window where two concurrent deletes
   * of two different super-admins could each pass a separate pre-check and leave
   * the system with zero super-admins — the row lock serialises them so the
   * second transaction observes the first's effect and throws.
   */
  async deleteUser(
    userId: string,
    options: { guardLastSuperAdmin?: boolean } = {},
  ): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      if (options.guardLastSuperAdmin) {
        // Lock the target row so a concurrent delete of another super-admin
        // serialises behind us and re-reads an up-to-date count.
        const [target] = await tx
          .select({ isSuperAdmin: users.isSuperAdmin })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)
          .for('update');
        if (target?.isSuperAdmin) {
          const [{ count }] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.isSuperAdmin, true));
          if (count <= 1) {
            throw new ForbiddenException('Cannot delete the last super-admin');
          }
        }
      }
      const memberships = await tx
        .select({ organisationId: userOrganisationMemberships.organisationId })
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.userId, userId));
      const orgIds = memberships.map((m) => m.organisationId);
      return this.deleteOrphanUsers(tx, [userId], orgIds);
    });
  }

  /** Count system-level super-admins (drives last-super-admin lockout guards). */
  async countSuperAdmins(): Promise<number> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isSuperAdmin, true));
    return rows.length;
  }

  /**
   * Super-admin overview: every user with their org memberships (org id + name)
   * and per-org role. Returns a flat shape suitable for the admin UI.
   */
  async listAllWithMemberships(): Promise<UserWithMembershipsView[]> {
    const rows = await this.db.query.users.findMany({
      with: {
        memberships: {
          columns: { role: true },
          with: { organisation: { columns: { id: true, name: true } } },
        },
      },
    });
    return rows.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
      memberships: user.memberships.map((m) => ({
        organisationId: m.organisation.id,
        organisationName: m.organisation.name,
        role: m.role,
      })),
    }));
  }

  // ── Email change ────────────────────────────────────────────────────────────

  async setPendingEmail(
    userId: string,
    pendingEmail: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        pendingEmail: pendingEmail.toLowerCase(),
        emailChangeToken: token,
        emailChangeTokenExpiresAt: expiresAt,
      })
      .where(eq(users.id, userId));
  }

  async findByEmailChangeToken(token: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.emailChangeToken, token))
      .limit(1);
    return user ?? null;
  }

  /**
   * Promote the parked `pendingEmail` to the live email and clear the change
   * token. Maps a unique violation (the address was taken meanwhile) to a 409.
   */
  async applyEmailChange(userId: string): Promise<void> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.pendingEmail) {
      return;
    }
    try {
      await this.db
        .update(users)
        .set({
          email: user.pendingEmail,
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeTokenExpiresAt: null,
        })
        .where(eq(users.id, userId));
    } catch (error: unknown) {
      if (findUniqueViolation(error)) {
        throw new ConflictException('Email is already in use');
      }
      throw error;
    }
  }

  async getMembership(
    userId: string,
    organisationId: string,
  ): Promise<UserOrganisationMembership | null> {
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
    return membership ?? null;
  }
}
