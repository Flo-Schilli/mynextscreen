import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  users,
  userOrganisationMemberships,
  type User,
  type UserOrganisationMembership,
  type Organisation,
} from '../db/schema';

@Injectable()
export class UserService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(userId: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
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
