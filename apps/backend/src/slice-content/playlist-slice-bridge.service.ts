import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { and, eq, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { scheduleEntries } from '../db/schema';
import { PLAYLIST_UPDATED, PlaylistUpdatedEvent } from '../playlist/playlist.event';
import { SliceEnqueueService } from './slice-enqueue.service';

/**
 * Re-slices split-group renditions when a playlist's content changes (e.g. an item
 * is added). Without this, a newly added item has no sliced rendition and the split
 * wall would show it un-sliced. The processor is idempotent (sourceHash), so a
 * re-run only encodes the new/changed item.
 *
 * Covers all schedule entries referencing the playlist — including future ones —
 * so renditions are ready before the schedule becomes active.
 */
@Injectable()
export class PlaylistSliceBridgeService {
  private readonly logger = new Logger(PlaylistSliceBridgeService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly sliceEnqueue: SliceEnqueueService,
  ) {}

  @OnEvent(PLAYLIST_UPDATED)
  async handlePlaylistUpdated(event: PlaylistUpdatedEvent): Promise<void> {
    const entries = await this.db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.playlistId, event.playlistId),
          eq(scheduleEntries.organisationId, event.organisationId),
          isNotNull(scheduleEntries.groupId),
        ),
      );

    if (entries.length === 0) return;

    // De-dupe groups (a playlist may be scheduled on the same group more than once).
    const seenGroups = new Set<string>();
    let enqueued = 0;
    for (const entry of entries) {
      if (!entry.groupId || seenGroups.has(entry.groupId)) continue;
      seenGroups.add(entry.groupId);
      try {
        const didEnqueue = await this.sliceEnqueue.enqueueForGroup(
          event.organisationId,
          entry.groupId,
          event.playlistId,
          entry.id,
        );
        if (didEnqueue) enqueued++;
      } catch (error) {
        this.logger.warn(
          `Failed to enqueue re-slice for group ${entry.groupId} / playlist ${event.playlistId}: ${error}`,
        );
      }
    }

    if (enqueued > 0) {
      this.logger.log(`Playlist ${event.playlistId} changed, re-sliced ${enqueued} split group(s)`);
    }
  }
}
