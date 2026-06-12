import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationService } from './notification.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationHub } from './notification-hub.service';
import { NotificationEventListener } from './notification-event-listener.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { OrgNotificationConfigController } from './org-notification-config.controller';
import { NotificationController } from './notification.controller';
import { InAppNotificationChannel } from './channels/in-app-notification-channel.service';
import { EmailNotificationChannel } from './channels/email-notification-channel.service';
import { NtfyNotificationChannel } from './channels/ntfy-notification-channel.service';
import { PlatformMailerService } from './channels/platform-mailer.service';
import { IN_APP_CHANNEL, EMAIL_CHANNEL, NTFY_CHANNEL } from './channels';
import { UserModule } from '../user/user.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ScreenModule } from '../screen/screen.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [HttpModule, UserModule, DashboardModule, ScreenModule, ContentModule],
  controllers: [
    NotificationPreferencesController,
    OrgNotificationConfigController,
    NotificationController,
  ],
  providers: [
    NotificationService,
    UserNotificationPreferenceService,
    OrgNotificationConfigService,
    NotificationHub,
    NotificationEventListener,
    InAppNotificationChannel,
    {
      provide: IN_APP_CHANNEL,
      useExisting: InAppNotificationChannel,
    },
    EmailNotificationChannel,
    {
      provide: EMAIL_CHANNEL,
      useExisting: EmailNotificationChannel,
    },
    NtfyNotificationChannel,
    {
      provide: NTFY_CHANNEL,
      useExisting: NtfyNotificationChannel,
    },
    PlatformMailerService,
  ],
  exports: [
    NotificationService,
    UserNotificationPreferenceService,
    OrgNotificationConfigService,
    NotificationHub,
  ],
})
export class NotificationModule {}
