import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPreference } from './user-notification-preference.entity';

export interface UserNotificationPreferenceData {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  ntfyEnabled?: boolean;
}

@Injectable()
export class UserNotificationPreferenceService {
  constructor(
    @InjectRepository(UserNotificationPreference)
    private readonly repo: Repository<UserNotificationPreference>,
  ) {}

  async getForUser(userId: string, organisationId: string): Promise<UserNotificationPreference> {
    const existing = await this.repo.findOne({
      where: { userId, organisationId },
    });
    if (existing) {
      return existing;
    }

    // Create default record if none exists
    const pref = this.repo.create({
      userId,
      organisationId,
      inAppEnabled: true,
      emailEnabled: false,
      ntfyEnabled: false,
    });
    return this.repo.save(pref);
  }

  async upsert(
    userId: string,
    organisationId: string,
    prefs: UserNotificationPreferenceData,
  ): Promise<UserNotificationPreference> {
    const existing = await this.repo.findOne({
      where: { userId, organisationId },
    });

    if (existing) {
      if (prefs.inAppEnabled !== undefined) {
        existing.inAppEnabled = prefs.inAppEnabled;
      }
      if (prefs.emailEnabled !== undefined) {
        existing.emailEnabled = prefs.emailEnabled;
      }
      if (prefs.ntfyEnabled !== undefined) {
        existing.ntfyEnabled = prefs.ntfyEnabled;
      }
      return this.repo.save(existing);
    }

    const pref = this.repo.create({
      userId,
      organisationId,
      inAppEnabled: prefs.inAppEnabled ?? true,
      emailEnabled: prefs.emailEnabled ?? false,
      ntfyEnabled: prefs.ntfyEnabled ?? false,
    });
    return this.repo.save(pref);
  }
}
