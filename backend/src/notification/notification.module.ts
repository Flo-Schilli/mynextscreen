import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { UserNotificationPreference } from './user-notification-preference.entity';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';
import { NotificationService } from './notification.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationHub } from './notification-hub.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { OrgNotificationConfigController } from './org-notification-config.controller';
import { NotificationController } from './notification.controller';
import { InAppNotificationChannel } from './channels/in-app-notification-channel.service';
import { EmailNotificationChannel } from './channels/email-notification-channel.service';
import { IN_APP_CHANNEL, EMAIL_CHANNEL } from './channels';
import { UserModule } from '../user/user.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserNotificationPreference,
      OrganisationNotificationConfig,
    ]),
    UserModule,
    DashboardModule,
  ],
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
  ],
  exports: [
    NotificationService,
    UserNotificationPreferenceService,
    OrgNotificationConfigService,
    NotificationHub,
    TypeOrmModule,
  ],
})
export class NotificationModule {}
