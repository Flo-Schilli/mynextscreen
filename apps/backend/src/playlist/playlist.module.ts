import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentSourceModule } from '../content-source/content-source.module';
import { PlaylistService } from './playlist.service';
import { PlaylistController } from './playlist.controller';
import { PlaylistRuleService } from './playlist-rule.service';
import { PlaylistResolveProcessor } from './playlist-resolve.processor';
import { PlaylistRuleScheduler } from './playlist-rule.scheduler';
import { PLAYLIST_RESOLVE_QUEUE } from './playlist-resolve.constants';

/**
 * Depends on the content-source module for the event pool of dynamic
 * playlists; content-source reaches playlists only through the
 * `CONTENT_SOURCE_SYNCED` event, so the graph stays acyclic.
 */
@Module({
  imports: [
    // One attempt: a failed resolve is retried on the playlist's refresh interval.
    BullModule.registerQueue({
      name: PLAYLIST_RESOLVE_QUEUE,
      defaultJobOptions: { attempts: 1 },
    }),
    ContentSourceModule,
  ],
  controllers: [PlaylistController],
  providers: [
    PlaylistService,
    PlaylistRuleService,
    PlaylistResolveProcessor,
    PlaylistRuleScheduler,
  ],
  exports: [PlaylistService],
})
export class PlaylistModule {}
