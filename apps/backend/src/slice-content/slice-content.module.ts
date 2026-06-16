import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SliceContentProcessor } from './slice-content.processor';
import { SliceStatusService } from './slice-status.service';
import { SliceEnqueueService } from './slice-enqueue.service';
import { PlaylistSliceBridgeService } from './playlist-slice-bridge.service';
import { SLICE_CONTENT_QUEUE } from './slice-content.constants';

export { SLICE_CONTENT_QUEUE };

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
  providers: [
    SliceContentProcessor,
    SliceStatusService,
    SliceEnqueueService,
    PlaylistSliceBridgeService,
  ],
  exports: [BullModule, SliceStatusService, SliceEnqueueService],
})
export class SliceContentModule {}
