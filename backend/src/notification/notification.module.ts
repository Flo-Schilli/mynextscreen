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
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      UserNotificationPreference,
      OrganisationNotificationConfig,
    ]),
    UserModule,
  ],
  controllers: [
    NotificationPreferencesController,
    OrgNotificationConfigController,
  ],
  providers: [
    NotificationService,
    UserNotificationPreferenceService,
    OrgNotificationConfigService,
    NotificationHub,
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
