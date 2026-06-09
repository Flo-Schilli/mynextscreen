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

  /**
   * Upserts a user on first login from Hanko JWT claims.
   * If the user already exists, updates email (in case it changed in Hanko).
   */
  async findOrCreate(userId: string, email: string): Promise<User> {
    const [existing] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existing) {
      if (existing.email !== email) {
        const [updated] = await this.db
          .update(users)
          .set({ email })
          .where(eq(users.id, userId))
          .returning();
        return updated;
      }
      return existing;
    }
    const [user] = await this.db
      .insert(users)
      .values({ id: userId, email, name: null })
      .returning();
    return user;
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
