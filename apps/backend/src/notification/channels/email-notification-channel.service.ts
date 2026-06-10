import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.constants';
import type { DrizzleDB } from '../../db/drizzle.types';
import { users } from '../../db/schema';
import { OrgNotificationConfigService } from '../org-notification-config.service';
import { EmailChannel, NotificationPayload } from './notification-channel.interfaces';
import { SmtpEmailProvider } from './smtp-email-provider';

@Injectable()
export class EmailNotificationChannel implements EmailChannel {
  private readonly logger = new Logger(EmailNotificationChannel.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly orgConfigService: OrgNotificationConfigService,
  ) {}

  async send(userId: string, orgId: string, notification: NotificationPayload): Promise<void> {
    const orgConfig = await this.orgConfigService.getForOrg(orgId);

    if (!orgConfig?.smtpHost) {
      this.logger.debug(`Skipping email for org ${orgId}: SMTP not configured`);
      return;
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      this.logger.warn(`Skipping email: user ${userId} not found`);
      return;
    }

    const provider = new SmtpEmailProvider({
      host: orgConfig.smtpHost,
      port: orgConfig.smtpPort ?? 587,
      user: orgConfig.smtpUser,
      password: orgConfig.smtpPassword,
      secure: orgConfig.smtpSecure,
      from: orgConfig.smtpFrom ?? `noreply@${orgConfig.smtpHost}`,
    });

    await provider.sendMail({
      to: user.email,
      subject: notification.title,
      text: notification.message,
    });

    this.logger.debug(`Email notification sent to ${user.email}`);
  }
}
