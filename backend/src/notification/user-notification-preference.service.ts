import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { userNotificationPreferences, type UserNotificationPreference } from '../db/schema';

export interface UserNotificationPreferenceData {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  ntfyEnabled?: boolean;
}

@Injectable()
export class UserNotificationPreferenceService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async find(
    userId: string,
    organisationId: string,
  ): Promise<UserNotificationPreference | null> {
    const [pref] = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.organisationId, organisationId),
        ),
      )
      .limit(1);
    return pref ?? null;
  }

  async getForUser(userId: string, organisationId: string): Promise<UserNotificationPreference> {
    const existing = await this.find(userId, organisationId);
    if (existing) {
      return existing;
    }

    // Create default record if none exists
    const [pref] = await this.db
      .insert(userNotificationPreferences)
      .values({
        userId,
        organisationId,
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      })
      .returning();
    return pref;
  }

  async upsert(
    userId: string,
    organisationId: string,
    prefs: UserNotificationPreferenceData,
  ): Promise<UserNotificationPreference> {
    const existing = await this.find(userId, organisationId);

    if (existing) {
      const updates: Partial<UserNotificationPreference> = {};
      if (prefs.inAppEnabled !== undefined) updates.inAppEnabled = prefs.inAppEnabled;
      if (prefs.emailEnabled !== undefined) updates.emailEnabled = prefs.emailEnabled;
      if (prefs.ntfyEnabled !== undefined) updates.ntfyEnabled = prefs.ntfyEnabled;
      const [saved] = await this.db
        .update(userNotificationPreferences)
        .set(updates)
        .where(eq(userNotificationPreferences.id, existing.id))
        .returning();
      return saved;
    }

    const [pref] = await this.db
      .insert(userNotificationPreferences)
      .values({
        userId,
        organisationId,
        inAppEnabled: prefs.inAppEnabled ?? true,
        emailEnabled: prefs.emailEnabled ?? false,
        ntfyEnabled: prefs.ntfyEnabled ?? false,
      })
      .returning();
    return pref;
  }
}
