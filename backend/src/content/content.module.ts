import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { TranscodingProcessor } from './transcoding.processor';
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
    OrganisationModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, TranscodingProcessor],
  exports: [ContentService],
})
export class ContentModule {}
