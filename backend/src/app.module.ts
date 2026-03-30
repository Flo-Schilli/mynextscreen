import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.get<string>('DATABASE_PATH', './data/signage.db'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
      }),
    }),
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
