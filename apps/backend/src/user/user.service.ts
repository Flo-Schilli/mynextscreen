import { ConflictException, Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
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
        .values({ email: normalised, name, passwordHash, isSuperAdmin: true })
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

  /** Apply a new password hash and clear any outstanding reset token. */
  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
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
