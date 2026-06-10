import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens, scheduleEntries } from '../db/schema';
import {
  ScheduleService,
  getOccurrences,
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntryChangedEvent,
  GROUP_SCHEDULE_CHANGED,
  GroupScheduleChangedEvent,
} from '../schedule';
import { SCHEDULE_CHANGED, ScreenStateChangeEvent } from './screen-state.event';

interface TrackedScreen {
  timer: ReturnType<typeof setTimeout>;
  currentPlaylistId: string | null;
  organisationId: string;
}

const LOOK_AHEAD_MS = 24 * 60 * 60 * 1000;
const FALLBACK_REEVAL_MS = 60_000;

@Injectable()
export class ScheduleBoundaryService implements OnModuleDestroy {
  private readonly logger = new Logger(ScheduleBoundaryService.name);
  private readonly tracked = new Map<string, TrackedScreen>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scheduleService: ScheduleService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleDestroy(): void {
    for (const [, state] of this.tracked) {
      clearTimeout(state.timer);
    }
    this.tracked.clear();
  }

  async registerScreen(screenId: string): Promise<void> {
    if (this.tracked.has(screenId)) return;

    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (!screen) return;

    let currentPlaylistId: string | null = null;
    try {
      const { playlist } = await this.scheduleService.getCurrentPlaylist(screenId);
      currentPlaylistId = playlist?.id ?? null;
    } catch {
      this.logger.warn(`Failed to resolve initial playlist for screen ${screenId}`);
    }

    const state: TrackedScreen = {
      timer: null as unknown as ReturnType<typeof setTimeout>,
      currentPlaylistId,
      organisationId: screen.organisationId,
    };
    this.tracked.set(screenId, state);

    await this.scheduleNextBoundary(screenId);
  }

  unregisterScreen(screenId: string): void {
    const state = this.tracked.get(screenId);
    if (state) {
      clearTimeout(state.timer);
      this.tracked.delete(screenId);
    }
  }

  @OnEvent(SCHEDULE_ENTRY_CHANGED)
  async handleScheduleEntryChanged(event: ScheduleEntryChangedEvent): Promise<void> {
    if (this.tracked.has(event.screenId)) {
      await this.scheduleNextBoundary(event.screenId);
    }
  }

  @OnEvent(GROUP_SCHEDULE_CHANGED)
  async handleGroupScheduleChanged(event: GroupScheduleChangedEvent): Promise<void> {
    const groupScreens = await this.db
      .select()
      .from(screens)
      .where(eq(screens.groupId, event.groupId));
    for (const screen of groupScreens) {
      if (this.tracked.has(screen.id)) {
        await this.scheduleNextBoundary(screen.id);
      }
    }
  }

  private async scheduleNextBoundary(screenId: string): Promise<void> {
    const state = this.tracked.get(screenId);
    if (!state) return;

    clearTimeout(state.timer);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + LOOK_AHEAD_MS);
    const boundaries = await this.collectBoundaries(screenId, now, windowEnd);

    const nowMs = now.getTime();
    const nextBoundary = boundaries
      .filter((t) => t.getTime() > nowMs)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (nextBoundary) {
      const delayMs = nextBoundary.getTime() - Date.now();
      state.timer = setTimeout(() => void this.onBoundaryReached(screenId), delayMs);
      this.logger.debug(`Scheduled boundary for screen ${screenId} in ${delayMs}ms`);
    } else {
      state.timer = setTimeout(() => void this.onBoundaryReached(screenId), FALLBACK_REEVAL_MS);
      this.logger.debug(
        `No boundary found for screen ${screenId}, re-evaluating in ${FALLBACK_REEVAL_MS}ms`,
      );
    }
  }

  private async collectBoundaries(screenId: string, now: Date, windowEnd: Date): Promise<Date[]> {
    const boundaries: Date[] = [];
    const windowStart = new Date(now.getTime() - LOOK_AHEAD_MS);

    const directEntries = await this.db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.screenId, screenId));

    for (const entry of directEntries) {
      const occurrences = getOccurrences(
        entry.startTime,
        entry.endTime,
        entry.rrule,
        windowStart,
        windowEnd,
      );
      for (const occ of occurrences) {
        boundaries.push(occ.start, occ.end);
      }
    }

    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (screen?.groupId) {
      const groupEntries = await this.db
        .select()
        .from(scheduleEntries)
        .where(eq(scheduleEntries.groupId, screen.groupId));
      for (const entry of groupEntries) {
        const occurrences = getOccurrences(
          entry.startTime,
          entry.endTime,
          entry.rrule,
          windowStart,
          windowEnd,
        );
        for (const occ of occurrences) {
          boundaries.push(occ.start, occ.end);
        }
      }
    }

    return boundaries;
  }

  private async onBoundaryReached(screenId: string): Promise<void> {
    const state = this.tracked.get(screenId);
    if (!state) return;

    try {
      const { playlist } = await this.scheduleService.getCurrentPlaylist(screenId);
      const newPlaylistId = playlist?.id ?? null;

      if (newPlaylistId !== state.currentPlaylistId) {
        state.currentPlaylistId = newPlaylistId;
        this.eventEmitter.emit(
          SCHEDULE_CHANGED,
          new ScreenStateChangeEvent(screenId, state.organisationId),
        );
        this.logger.log(
          `Schedule boundary crossed for screen ${screenId}: playlist changed to ${newPlaylistId}`,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to evaluate boundary for screen ${screenId}: ${error}`);
    }

    await this.scheduleNextBoundary(screenId);
  }
}
