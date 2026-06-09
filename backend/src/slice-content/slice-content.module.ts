import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SliceContentProcessor } from './slice-content.processor';

export const SLICE_CONTENT_QUEUE = 'slice-content';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SLICE_CONTENT_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
  ],
  providers: [SliceContentProcessor],
  exports: [BullModule],
})
export class SliceContentModule {}
