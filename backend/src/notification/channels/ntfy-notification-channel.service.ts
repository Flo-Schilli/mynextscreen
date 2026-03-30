import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrgNotificationConfigService } from '../org-notification-config.service';
import {
  NtfyChannel,
  NotificationPayload,
} from './notification-channel.interfaces';

@Injectable()
export class NtfyNotificationChannel implements NtfyChannel {
  private readonly logger = new Logger(NtfyNotificationChannel.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly orgConfigService: OrgNotificationConfigService,
  ) {}

  async send(orgId: string, notification: NotificationPayload): Promise<void> {
    const orgConfig = await this.orgConfigService.getForOrg(orgId);

    if (!orgConfig?.ntfyUrl || !orgConfig?.ntfyTopic) {
      this.logger.debug(
        `Skipping ntfy for org ${orgId}: ntfy URL or topic not configured`,
      );
      return;
    }

    const url = `${orgConfig.ntfyUrl.replace(/\/+$/, '')}/${orgConfig.ntfyTopic}`;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      Title: notification.title,
    };

    if (orgConfig.ntfyToken) {
      headers['Authorization'] = `Bearer ${orgConfig.ntfyToken}`;
    }

    try {
      await firstValueFrom(
        this.httpService.post(url, notification.message, { headers }),
      );
      this.logger.debug(`ntfy notification sent to ${url}`);
    } catch (error) {
      this.logger.warn(
        `ntfy notification failed for org ${orgId}: ${error.message}`,
      );
    }
  }
}
