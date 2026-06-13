import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { userOrganisationMemberships } from '../db/schema';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationEvent } from './notification-event.interface';
import {
  InAppChannel,
  EmailChannel,
  NtfyChannel,
  IN_APP_CHANNEL,
  EMAIL_CHANNEL,
  NTFY_CHANNEL,
} from './channels';

@Injectable()
export class NotificationHub {
  private readonly logger = new Logger(NotificationHub.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly userPrefService: UserNotificationPreferenceService,
    private readonly orgConfigService: OrgNotificationConfigService,
    @Optional()
    @Inject(IN_APP_CHANNEL)
    private readonly inAppChannel?: InAppChannel,
    @Optional()
    @Inject(EMAIL_CHANNEL)
    private readonly emailChannel?: EmailChannel,
    @Optional()
    @Inject(NTFY_CHANNEL)
    private readonly ntfyChannel?: NtfyChannel,
  ) {}

  async dispatch(event: NotificationEvent): Promise<void> {
    const memberships = await this.db
      .select()
      .from(userOrganisationMemberships)
      .where(eq(userOrganisationMemberships.organisationId, event.orgId));

    const orgConfig = await this.orgConfigService.getForOrg(event.orgId);

    const smtpConfigured = !!orgConfig?.smtpHost;
    const ntfyConfigured = !!(orgConfig?.ntfyUrl && orgConfig?.ntfyTopic);

    const payload = {
      eventType: event.eventType,
      title: event.title,
      message: event.message,
      resourceId: event.resourceId,
    };

    // Track whether ntfy has been sent for this event (org-level deduplication)
    let ntfySent = false;

    for (const membership of memberships) {
      const prefs = await this.userPrefService.getForUser(membership.userId);

      // In-app channel
      if (prefs.inAppEnabled && this.inAppChannel) {
        this.fireAndForget(
          'InApp',
          membership.userId,
          this.inAppChannel.send(membership.userId, event.orgId, payload),
        );
      }

      // Email channel
      if (prefs.emailEnabled && smtpConfigured && this.emailChannel) {
        this.fireAndForget(
          'Email',
          membership.userId,
          this.emailChannel.send(membership.userId, event.orgId, payload),
        );
      }

      // ntfy channel — org-level, send at most once per dispatch
      if (prefs.ntfyEnabled && ntfyConfigured && this.ntfyChannel && !ntfySent) {
        ntfySent = true;
        this.fireAndForget('Ntfy', membership.userId, this.ntfyChannel.send(event.orgId, payload));
      }
    }
  }

  private fireAndForget(channel: string, userId: string, promise: Promise<void>): void {
    promise.catch((error) => {
      this.logger.error(
        `Failed to send ${channel} notification for user ${userId}: ${error.message}`,
        error.stack,
      );
    });
  }
}
