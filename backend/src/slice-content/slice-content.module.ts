import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SlicedRendition } from './sliced-rendition.entity';
import { SliceContentProcessor } from './slice-content.processor';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { Content } from '../content/content.entity';

export const SLICE_CONTENT_QUEUE = 'slice-content';

@Module({
  imports: [
    TypeOrmModule.forFeature([SlicedRendition, ScreenGroup, Screen, Playlist, Content]),
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
  exports: [TypeOrmModule, BullModule],
})
export class SliceContentModule {}
