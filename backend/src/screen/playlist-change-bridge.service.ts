import { Injectable, Logger, Inject } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { organisations, screens, scheduleEntries } from '../db/schema';
import { ScreenStateService } from './screen-state.service';
import { PLAYLIST_CHANGED, ScreenStateChangeEvent } from './screen-state.event';
import { PLAYLIST_UPDATED, PlaylistUpdatedEvent } from '../playlist/playlist.event';
import { getOccurrences } from '../schedule';

@Injectable()
export class PlaylistChangeBridgeService {
  private readonly logger = new Logger(PlaylistChangeBridgeService.name);

  constructor(
    private readonly screenStateService: ScreenStateService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(PLAYLIST_UPDATED)
  async handlePlaylistUpdated(event: PlaylistUpdatedEvent): Promise<void> {
    const connectedIds = this.screenStateService.getConnectedScreenIds();
    if (connectedIds.length === 0) return;

    const affectedScreenIds = new Set<string>();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      await this.findScreensViaSchedule(
        event.playlistId,
        event.organisationId,
        connectedIds,
        now,
        windowStart,
        windowEnd,
        affectedScreenIds,
      );

      await this.findScreensViaDefault(
        event.playlistId,
        event.organisationId,
        connectedIds,
        affectedScreenIds,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to resolve affected screens for playlist ${event.playlistId}: ${error}`,
      );
      return;
    }

    for (const screenId of affectedScreenIds) {
      this.eventEmitter.emit(
        PLAYLIST_CHANGED,
        new ScreenStateChangeEvent(screenId, event.organisationId),
      );
    }

    if (affectedScreenIds.size > 0) {
      this.logger.log(
        `Playlist ${event.playlistId} changed, notified ${affectedScreenIds.size} screen(s)`,
      );
    }
  }

  private async findScreensViaSchedule(
    playlistId: string,
    organisationId: string,
    connectedIds: string[],
    now: Date,
    windowStart: Date,
    windowEnd: Date,
    affectedScreenIds: Set<string>,
  ): Promise<void> {
    const entries = await this.db
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.playlistId, playlistId),
          eq(scheduleEntries.organisationId, organisationId),
        ),
      );

    const connectedSet = new Set(connectedIds);

    for (const entry of entries) {
      const occurrences = getOccurrences(
        entry.startTime,
        entry.endTime,
        entry.rrule,
        windowStart,
        windowEnd,
      );

      const isActive = occurrences.some((occ) => occ.start <= now && occ.end > now);
      if (!isActive) continue;

      if (entry.screenId && connectedSet.has(entry.screenId)) {
        affectedScreenIds.add(entry.screenId);
      }

      if (entry.groupId) {
        const groupScreens = await this.db
          .select()
          .from(screens)
          .where(eq(screens.groupId, entry.groupId));
        for (const screen of groupScreens) {
          if (connectedSet.has(screen.id)) {
            affectedScreenIds.add(screen.id);
          }
        }
      }
    }
  }

  private async findScreensViaDefault(
    playlistId: string,
    organisationId: string,
    connectedIds: string[],
    affectedScreenIds: Set<string>,
  ): Promise<void> {
    const [org] = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    if (!org || org.defaultPlaylistId !== playlistId) return;

    const connectedOrgScreens = await this.db
      .select()
      .from(screens)
      .where(and(inArray(screens.id, connectedIds), eq(screens.organisationId, organisationId)));

    for (const screen of connectedOrgScreens) {
      affectedScreenIds.add(screen.id);
    }
  }
}
