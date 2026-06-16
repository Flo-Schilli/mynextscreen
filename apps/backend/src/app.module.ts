import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './db/database.module';
import { RedisModule } from './redis';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth';
import { OrganisationModule } from './organisation';
import { UserModule } from './user';
import { ScreenModule } from './screen';
import { ContentModule } from './content';
import { MediaModule } from './media';
import { DashboardModule } from './dashboard';
import { PlaylistModule } from './playlist';
import { ScheduleEntryModule } from './schedule';
import { AuditLogModule } from './audit-log';
import { ScreenGroupModule } from './screen-group/screen-group.module';
import { SliceContentModule } from './slice-content';
import { NotificationModule } from './notification';
import { LiveStreamModule } from './live-stream';
import { SearchModule } from './search/search.module';
import { InstanceAdminModule } from './instance-admin';
import { MetricsModule } from './metrics';
import { HealthController } from './health.controller';
import { VersionController } from './version.controller';
import { TimeController } from './time.controller';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    DatabaseModule,
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    OrganisationModule,
    UserModule,
    ScreenModule,
    ContentModule,
    MediaModule,
    DashboardModule,
    PlaylistModule,
    ScheduleEntryModule,
    AuditLogModule,
    ScreenGroupModule,
    SliceContentModule,
    NotificationModule,
    LiveStreamModule,
    SearchModule,
    InstanceAdminModule,
    MetricsModule,
  ],
  controllers: [HealthController, VersionController, TimeController],
})
export class AppModule {}
