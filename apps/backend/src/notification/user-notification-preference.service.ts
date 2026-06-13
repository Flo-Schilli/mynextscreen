import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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

  private async find(userId: string): Promise<UserNotificationPreference | null> {
    const [pref] = await this.db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId))
      .limit(1);
    return pref ?? null;
  }

  /** Returns the user's global preferences, creating defaults on first access. */
  async getForUser(userId: string): Promise<UserNotificationPreference> {
    const existing = await this.find(userId);
    if (existing) {
      return existing;
    }

    const [pref] = await this.db
      .insert(userNotificationPreferences)
      .values({
        userId,
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      })
      .returning();
    return pref;
  }

  async upsert(
    userId: string,
    prefs: UserNotificationPreferenceData,
  ): Promise<UserNotificationPreference> {
    const existing = await this.find(userId);

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
        inAppEnabled: prefs.inAppEnabled ?? true,
        emailEnabled: prefs.emailEnabled ?? false,
        ntfyEnabled: prefs.ntfyEnabled ?? false,
      })
      .returning();
    return pref;
  }
}
