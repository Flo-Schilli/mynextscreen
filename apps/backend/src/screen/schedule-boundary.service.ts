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
import type { DateRange, CurrentPlaylistSource } from '../schedule';
import { SCHEDULE_CHANGED, ScreenStateChangeEvent } from './screen-state.event';

interface TrackedScreen {
  timer: ReturnType<typeof setTimeout>;
  currentPlaylistId: string | null;
  /** Playback anchor last seen for this screen; a change has to reach the player. */
  epoch: number;
  source: CurrentPlaylistSource;
  organisationId: string;
  /**
   * Captured when the screen registers. Deliberately not re-read per boundary:
   * that would add a query for every screen on every boundary to catch a screen
   * being moved between groups, which re-registers the screen anyway.
   */
  groupId: string | null;
  /**
   * Bumped on every (re)schedule. `scheduleNextBoundary` awaits a query between
   * clearing and re-arming its timer, so a concurrent call would otherwise leave
   * one timer armed but unreferenced — it would survive `unregisterScreen` and
   * fire a second boundary.
   */
  generation: number;
}

const LOOK_AHEAD_MS = 24 * 60 * 60 * 1000;
const FALLBACK_REEVAL_MS = 60_000;
/** Coalescing window for group re-alignment when members reconnect together. */
const REALIGN_THROTTLE_MS = 5_000;

@Injectable()
export class ScheduleBoundaryService implements OnModuleDestroy {
  private readonly logger = new Logger(ScheduleBoundaryService.name);
  private readonly tracked = new Map<string, TrackedScreen>();
  /** Last anchor already fanned out per group — de-dupes the N-member boundary storm. */
  private readonly lastGroupAnchor = new Map<string, string>();
  /** When each group was last re-aligned, so a reconnect storm costs one fan-out. */
  private readonly lastGroupRealignAt = new Map<string, number>();
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
    this.lastGroupAnchor.clear();
    this.lastGroupRealignAt.clear();
  }

  async registerScreen(screenId: string): Promise<void> {
    if (this.destroyed || this.tracked.has(screenId)) return;

    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (!screen) return;

    let currentPlaylistId: string | null = null;
    let epoch = 0;
    let source: CurrentPlaylistSource = 'fallback';
    try {
      const result = await this.scheduleService.getCurrentPlaylist(screenId);
      currentPlaylistId = result.playlist?.id ?? null;
      epoch = result.epoch;
      source = result.source;
    } catch {
      this.logger.warn(`Failed to resolve initial playlist for screen ${screenId}`);
    }

    if (this.destroyed) return;

    const state: TrackedScreen = {
      timer: null as unknown as ReturnType<typeof setTimeout>,
      currentPlaylistId,
      epoch,
      source,
      organisationId: screen.organisationId,
      groupId: screen.groupId,
      generation: 0,
    };
    this.tracked.set(screenId, state);

    await this.scheduleNextBoundary(screenId);

    // A screen that just (re)connected holds whatever anchor it fetched, while
    // its peers still hold the one they were last told about. Nothing used to
    // reconcile the two, so a single restarted member could sit on a different
    // epoch indefinitely. Re-align the whole group on its arrival; the push is
    // visually free for the peers, whose player short-circuits a re-anchor that
    // changes neither playlist, epoch nor timeline.
    if (screen.groupId) {
      this.realignGroup(screen.groupId, screen.organisationId, currentPlaylistId);
    }
  }

  unregisterScreen(screenId: string): void {
    const state = this.tracked.get(screenId);
    if (state) {
      clearTimeout(state.timer);
      state.generation++;
      this.tracked.delete(screenId);
    }
  }

  /**
   * Fan the group's shared anchor out to every member, at most once per
   * {@link REALIGN_THROTTLE_MS}.
   *
   * Throttled rather than de-duplicated by anchor: when the backend restarts,
   * every member reconnects within milliseconds carrying an *unchanged* anchor,
   * which anchor-dedup would suppress — exactly the fan-out that is wanted — while
   * letting each arrival push to all N peers.
   */
  private realignGroup(groupId: string, organisationId: string, playlistId: string | null): void {
    const last = this.lastGroupRealignAt.get(groupId) ?? 0;
    const now = Date.now();
    if (now - last < REALIGN_THROTTLE_MS) return;

    this.lastGroupRealignAt.set(groupId, now);
    this.eventEmitter.emit(
      GROUP_SCHEDULE_CHANGED,
      new GroupScheduleChangedEvent(groupId, organisationId, playlistId),
    );
  }

  /**
   * True when this member won the race to fan out this anchor.
   *
   * Every member of a group has its own timer and they all fire at the same
   * boundary. The claim is written synchronously before the emit, so whichever
   * member's query resolves first claims the anchor and the rest see an
   * identical one and skip — N members produce one fan-out, not N.
   */
  private claimGroupAnchor(groupId: string, playlistId: string | null, epoch: number): boolean {
    const anchor = `${playlistId ?? ''}:${epoch}`;
    if (this.lastGroupAnchor.get(groupId) === anchor) return false;
    this.lastGroupAnchor.set(groupId, anchor);
    return true;
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
    const generation = ++state.generation;

    const now = new Date();
    const windowEnd = new Date(now.getTime() + LOOK_AHEAD_MS);
    const boundaries = await this.collectBoundaries(screenId, now, windowEnd);

    // The collectBoundaries query is async; bail if the service was destroyed
    // (and its timers cleared) while it was in flight, so we don't re-arm a
    // timer on a torn-down service. The generation check covers the same window
    // against a *concurrent* re-schedule — common now that a boundary both
    // re-arms itself and emits an event that re-enters through
    // handleGroupScheduleChanged. Without it both calls assign, and the first
    // timer stays armed with nothing referencing it.
    if (this.destroyed || this.tracked.get(screenId) !== state) return;
    if (state.generation !== generation) return;

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
      const result = await this.scheduleService.getCurrentPlaylist(screenId);
      if (this.destroyed) return;
      const newPlaylistId = result.playlist?.id ?? null;

      // The epoch matters as much as the playlist id. An RRULE rolling to the
      // next occurrence of the *same* playlist moves the anchor without
      // changing the id — comparing the id alone meant nothing was emitted, so
      // every running player kept an anchor that was a full recurrence period
      // stale while any screen that reconnected picked up the new one.
      const changed = newPlaylistId !== state.currentPlaylistId || result.epoch !== state.epoch;
      const previousSource = state.source;

      state.currentPlaylistId = newPlaylistId;
      state.epoch = result.epoch;
      state.source = result.source;

      if (changed) {
        const groupId = state.groupId;

        // Group-wide when either side of the transition came from the group's
        // own schedule — a group entry ending has to re-align the members just
        // as much as one starting.
        const groupWide =
          groupId !== null && (result.source === 'group' || previousSource === 'group');

        if (groupWide) {
          if (this.claimGroupAnchor(groupId, newPlaylistId, result.epoch)) {
            this.eventEmitter.emit(
              GROUP_SCHEDULE_CHANGED,
              new GroupScheduleChangedEvent(groupId, state.organisationId, newPlaylistId),
            );
            this.logger.log(
              `Schedule boundary crossed for group ${groupId}: playlist ${newPlaylistId}, epoch ${result.epoch}`,
            );
          }
        } else {
          this.eventEmitter.emit(
            SCHEDULE_CHANGED,
            new ScreenStateChangeEvent(screenId, state.organisationId),
          );
          this.logger.log(
            `Schedule boundary crossed for screen ${screenId}: playlist ${newPlaylistId}, epoch ${result.epoch}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to evaluate boundary for screen ${screenId}: ${error}`);
    }

    await this.scheduleNextBoundary(screenId);
  }
}
