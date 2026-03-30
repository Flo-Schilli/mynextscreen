import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { UserNotificationPreference } from './user-notification-preference.entity';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';
import { NotificationService } from './notification.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { OrgNotificationConfigController } from './org-notification-config.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserNotificationPreference,
      OrganisationNotificationConfig,
    ]),
  ],
  controllers: [
    NotificationPreferencesController,
    OrgNotificationConfigController,
  ],
  providers: [
    NotificationService,
    UserNotificationPreferenceService,
    OrgNotificationConfigService,
  ],
  exports: [
    NotificationService,
    UserNotificationPreferenceService,
    OrgNotificationConfigService,
    TypeOrmModule,
  ],
})
export class NotificationModule {}
