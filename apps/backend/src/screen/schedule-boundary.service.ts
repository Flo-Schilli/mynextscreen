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
import type { DateRange } from '../schedule';
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
  private destroyed = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scheduleService: ScheduleService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleDestroy(): void {
    // Mark destroyed first so any in-flight async chain (a fired boundary
    // timer mid-await) bails out before issuing further DB queries — otherwise
    // a late query can outlive the connection pool and surface as an
    // unhandled rejection in an unrelated test suite.
    this.destroyed = true;
    for (const [, state] of this.tracked) {
      clearTimeout(state.timer);
    }
    this.tracked.clear();
  }

  async registerScreen(screenId: string): Promise<void> {
    if (this.destroyed || this.tracked.has(screenId)) return;

    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (!screen) return;

    let currentPlaylistId: string | null = null;
    try {
      const { playlist } = await this.scheduleService.getCurrentPlaylist(screenId);
      currentPlaylistId = playlist?.id ?? null;
    } catch {
      this.logger.warn(`Failed to resolve initial playlist for screen ${screenId}`);
    }

    if (this.destroyed) return;

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
    if (this.destroyed) return;
    if (this.tracked.has(event.screenId)) {
      await this.scheduleNextBoundary(event.screenId);
    }
  }

  @OnEvent(GROUP_SCHEDULE_CHANGED)
  async handleGroupScheduleChanged(event: GroupScheduleChangedEvent): Promise<void> {
    if (this.destroyed) return;
    const groupScreens = await this.db
      .select()
      .from(screens)
      .where(eq(screens.groupId, event.groupId));
    if (this.destroyed) return;
    for (const screen of groupScreens) {
      if (this.tracked.has(screen.id)) {
        await this.scheduleNextBoundary(screen.id);
      }
    }
  }

  private async scheduleNextBoundary(screenId: string): Promise<void> {
    if (this.destroyed) return;
    const state = this.tracked.get(screenId);
    if (!state) return;

    clearTimeout(state.timer);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + LOOK_AHEAD_MS);
    const boundaries = await this.collectBoundaries(screenId, now, windowEnd);

    // The collectBoundaries query is async; bail if the service was destroyed
    // (and its timers cleared) while it was in flight, so we don't re-arm a
    // timer on a torn-down service.
    if (this.destroyed || !this.tracked.has(screenId)) return;

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

  /**
   * When playback is next due to begin on this screen, or null if nothing
   * starts inside the look-ahead window.
   *
   * Used by the site agent to wake the TV before a schedule starts. A schedule
   * that is already running does not count: its start is in the past, and a set
   * showing it is on anyway.
   */
  async getNextStart(screenId: string, from: Date = new Date()): Promise<Date | null> {
    const windowEnd = new Date(from.getTime() + LOOK_AHEAD_MS);
    const occurrences = await this.collectOccurrences(screenId, from, windowEnd);
    const fromMs = from.getTime();

    return (
      occurrences
        .map((occ) => occ.start)
        .filter((start) => start.getTime() > fromMs)
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null
    );
  }

  private async collectBoundaries(screenId: string, now: Date, windowEnd: Date): Promise<Date[]> {
    const occurrences = await this.collectOccurrences(screenId, now, windowEnd);
    return occurrences.flatMap((occ) => [occ.start, occ.end]);
  }

  /**
   * Every occurrence touching the window, from the screen's own entries and
   * from its group's. The window reaches back as far as it reaches forward, so
   * an occurrence that began before `now` but is still running is included.
   */
  private async collectOccurrences(
    screenId: string,
    now: Date,
    windowEnd: Date,
  ): Promise<DateRange[]> {
    const occurrences: DateRange[] = [];
    const windowStart = new Date(now.getTime() - LOOK_AHEAD_MS);

    const directEntries = await this.db
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.screenId, screenId));

    for (const entry of directEntries) {
      occurrences.push(
        ...getOccurrences(entry.startTime, entry.endTime, entry.rrule, windowStart, windowEnd),
      );
    }

    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (screen?.groupId) {
      const groupEntries = await this.db
        .select()
        .from(scheduleEntries)
        .where(eq(scheduleEntries.groupId, screen.groupId));
      for (const entry of groupEntries) {
        occurrences.push(
          ...getOccurrences(entry.startTime, entry.endTime, entry.rrule, windowStart, windowEnd),
        );
      }
    }

    return occurrences;
  }

  private async onBoundaryReached(screenId: string): Promise<void> {
    if (this.destroyed) return;
    const state = this.tracked.get(screenId);
    if (!state) return;

    try {
      const { playlist } = await this.scheduleService.getCurrentPlaylist(screenId);
      if (this.destroyed) return;
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
