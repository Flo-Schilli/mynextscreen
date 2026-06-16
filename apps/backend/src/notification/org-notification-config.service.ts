import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  organisationNotificationConfigs,
  type AlertRules,
  type OrganisationNotificationConfig,
} from '../db/schema';

export interface OrgNotificationConfigData {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFrom?: string | null;
  smtpSecure?: boolean;
  ntfyUrl?: string | null;
  ntfyTopic?: string | null;
  ntfyToken?: string | null;
  alertRules?: AlertRules;
}

@Injectable()
export class OrgNotificationConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getForOrg(organisationId: string): Promise<OrganisationNotificationConfig | null> {
    const [config] = await this.db
      .select()
      .from(organisationNotificationConfigs)
      .where(eq(organisationNotificationConfigs.organisationId, organisationId))
      .limit(1);
    return config ?? null;
  }

  async upsert(
    organisationId: string,
    config: OrgNotificationConfigData,
  ): Promise<OrganisationNotificationConfig> {
    const existing = await this.getForOrg(organisationId);

    if (existing) {
      const updates: Partial<OrganisationNotificationConfig> = {};
      // For smtpPassword/ntfyToken: blank/undefined means keep existing value
      if (config.smtpHost !== undefined) updates.smtpHost = config.smtpHost;
      if (config.smtpPort !== undefined) updates.smtpPort = config.smtpPort;
      if (config.smtpUser !== undefined) updates.smtpUser = config.smtpUser;
      if (config.smtpPassword !== undefined && config.smtpPassword !== '') {
        updates.smtpPassword = config.smtpPassword;
      }
      if (config.smtpFrom !== undefined) updates.smtpFrom = config.smtpFrom;
      if (config.smtpSecure !== undefined) updates.smtpSecure = config.smtpSecure;
      if (config.ntfyUrl !== undefined) updates.ntfyUrl = config.ntfyUrl;
      if (config.ntfyTopic !== undefined) updates.ntfyTopic = config.ntfyTopic;
      if (config.ntfyToken !== undefined && config.ntfyToken !== '') {
        updates.ntfyToken = config.ntfyToken;
      }
      if (config.alertRules !== undefined) updates.alertRules = config.alertRules;
      // Nothing to change (e.g. only a blank secret was sent): skip the write.
      // Drizzle's .set({}) throws "No values to set", and the blank-secret rule
      // intentionally keeps the stored value — so a no-op update returns as-is.
      if (Object.keys(updates).length === 0) {
        return existing;
      }
      const [saved] = await this.db
        .update(organisationNotificationConfigs)
        .set(updates)
        .where(eq(organisationNotificationConfigs.id, existing.id))
        .returning();
      return saved;
    }

    const [saved] = await this.db
      .insert(organisationNotificationConfigs)
      .values({
        organisationId,
        smtpHost: config.smtpHost ?? null,
        smtpPort: config.smtpPort ?? null,
        smtpUser: config.smtpUser ?? null,
        smtpPassword: config.smtpPassword || null,
        smtpFrom: config.smtpFrom ?? null,
        smtpSecure: config.smtpSecure ?? false,
        ntfyUrl: config.ntfyUrl ?? null,
        ntfyTopic: config.ntfyTopic ?? null,
        ntfyToken: config.ntfyToken || null,
        // Omit when not provided so the column default (DEFAULT_ALERT_RULES) applies.
        ...(config.alertRules !== undefined ? { alertRules: config.alertRules } : {}),
      })
      .returning();
    return saved;
  }
}
