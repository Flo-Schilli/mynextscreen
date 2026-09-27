import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ContentService, DEFAULT_MAX_FILE_SIZE_BYTES } from './content.service';
import { ContentController } from './content.controller';
import { TranscodingProcessor } from './transcoding.processor';
import { ThumbnailBackfillService } from './thumbnail-backfill.service';
import { OrganisationModule } from '../organisation/organisation.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'transcoding',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    // Enforced while the body is being read, so an oversized upload is aborted
    // instead of being buffered in full and rejected afterwards. The service
    // check stays as the second layer, and nginx caps it as the first.
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: config.get<number>('MAX_FILE_SIZE_BYTES', DEFAULT_MAX_FILE_SIZE_BYTES),
          files: 1,
        },
      }),
    }),
    OrganisationModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, TranscodingProcessor, ThumbnailBackfillService],
  exports: [ContentService],
})
export class ContentModule {}
