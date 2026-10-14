import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PlaylistRuleService } from './playlist-rule.service';

export const PLAYLIST_RULE_TICK_MS = 60_000;

/**
 * Enqueues due dynamic playlists once a minute. Lives in the playlist module
 * next to the content-source ticker instead of inside it: playlist depends on
 * content-source, so the reverse import would close a module cycle. The
 * BullMQ job id deduplicates across instances.
 */
@Injectable()
export class PlaylistRuleScheduler {
  private readonly logger = new Logger(PlaylistRuleScheduler.name);

  constructor(private readonly ruleService: PlaylistRuleService) {}

  @Interval(PLAYLIST_RULE_TICK_MS)
  async tick(): Promise<void> {
    await this.enqueueDuePlaylists(new Date());
  }

  async enqueueDuePlaylists(now: Date): Promise<number> {
    try {
      const due = await this.ruleService.findDuePlaylistIds(now);
      for (const playlistId of due) {
        await this.ruleService.enqueueResolve(playlistId);
      }
      return due.length;
    } catch (error) {
      // A Redis or database blip must not kill the interval; the next tick retries.
      this.logger.warn(
        `Enqueueing due playlists failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }
}
