import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { playlistItems, playlists } from '../db/schema';
import { TRANSCODING_COMPLETED, TranscodingCompletedEvent } from '../content/transcoding.event';
import { PLAYLIST_UPDATED, PlaylistUpdatedEvent } from './playlist.event';

/**
 * Tells the screens when a file behind an existing playlist item changed: a
 * re-rendered slide of a content source, or a manual re-upload. The item list
 * stays the same in both cases, so nothing else emits `PLAYLIST_UPDATED`, and
 * the screens would keep the old file until the next unrelated push.
 *
 * Fires on transcoding completion, when the new file is servable and the
 * content's `updatedAt` (the media URL version) has moved on. A fresh upload
 * is in no playlist yet and costs one empty query.
 */
@Injectable()
export class PlaylistContentRefreshListener {
  private readonly logger = new Logger(PlaylistContentRefreshListener.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(TRANSCODING_COMPLETED, { async: true })
  async handleTranscodingCompleted(event: TranscodingCompletedEvent): Promise<void> {
    try {
      const rows = await this.db
        .selectDistinct({ playlistId: playlistItems.playlistId })
        .from(playlistItems)
        .innerJoin(playlists, eq(playlists.id, playlistItems.playlistId))
        .where(
          and(
            eq(playlistItems.contentId, event.contentId),
            eq(playlists.organisationId, event.organisationId),
          ),
        );
      for (const { playlistId } of rows) {
        this.eventEmitter.emit(
          PLAYLIST_UPDATED,
          new PlaylistUpdatedEvent(playlistId, event.organisationId),
        );
      }
    } catch (error) {
      this.logger.warn(
        `Announcing playlists of content ${event.contentId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
