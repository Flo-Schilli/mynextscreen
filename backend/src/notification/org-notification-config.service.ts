import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';

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
}

@Injectable()
export class OrgNotificationConfigService {
  constructor(
    @InjectRepository(OrganisationNotificationConfig)
    private readonly repo: Repository<OrganisationNotificationConfig>,
  ) {}

  async getForOrg(organisationId: string): Promise<OrganisationNotificationConfig | null> {
    return this.repo.findOne({ where: { organisationId } });
  }

  async upsert(
    organisationId: string,
    config: OrgNotificationConfigData,
  ): Promise<OrganisationNotificationConfig> {
    const existing = await this.repo.findOne({ where: { organisationId } });

    if (existing) {
      // For smtpPassword: blank/undefined means keep existing value
      if (config.smtpHost !== undefined) existing.smtpHost = config.smtpHost;
      if (config.smtpPort !== undefined) existing.smtpPort = config.smtpPort;
      if (config.smtpUser !== undefined) existing.smtpUser = config.smtpUser;
      if (config.smtpPassword !== undefined && config.smtpPassword !== '') {
        existing.smtpPassword = config.smtpPassword;
      }
      if (config.smtpFrom !== undefined) existing.smtpFrom = config.smtpFrom;
      if (config.smtpSecure !== undefined) existing.smtpSecure = config.smtpSecure;
      if (config.ntfyUrl !== undefined) existing.ntfyUrl = config.ntfyUrl;
      if (config.ntfyTopic !== undefined) existing.ntfyTopic = config.ntfyTopic;
      if (config.ntfyToken !== undefined && config.ntfyToken !== '') {
        existing.ntfyToken = config.ntfyToken;
      }
      return this.repo.save(existing);
    }

    const record = this.repo.create({
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
    });
    return this.repo.save(record);
  }
}
