import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduleBoundaryService } from './schedule-boundary.service';
import {
  ScheduleService,
  ScheduleEntryChangedEvent,
  GroupScheduleChangedEvent,
  GROUP_SCHEDULE_CHANGED,
} from '../schedule';
import { SCHEDULE_CHANGED, ScreenStateChangeEvent } from './screen-state.event';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, screenGroups, playlists, scheduleEntries } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScheduleBoundaryService', () => {
  let service: ScheduleBoundaryService;
  let db: DrizzleDB;
  let scheduleService: { getCurrentPlaylist: jest.Mock };
  let emit: jest.Mock;

  let orgId: string;
  let screenId: string;
  let groupId: string;
  let playlistId: string;
  let playlistId2: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;

    const [group] = await db
      .insert(screenGroups)
      .values({ organisationId: orgId, name: 'Group' })
      .returning();
    groupId = group.id;

    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
        apiKeyHash: '$2b$10$hashedvalue',
        isOnline: true,
      })
      .returning();
    screenId = screen.id;

    const [p1] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Playlist 1' })
      .returning();
    playlistId = p1.id;
    const [p2] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Playlist 2' })
      .returning();
    playlistId2 = p2.id;

    scheduleService = {
      getCurrentPlaylist: jest.fn().mockResolvedValue({
        playlist: { id: playlistId, name: 'Playlist 1' },
        isDefault: true,
        epoch: 0,
        source: 'fallback',
      }),
    };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleBoundaryService,
        { provide: DRIZZLE, useValue: db },
        { provide: ScheduleService, useValue: scheduleService },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<ScheduleBoundaryService>(ScheduleBoundaryService);
  });

  afterEach(async () => {
    if (service) service.onModuleDestroy();
    jest.useRealTimers();
    // A boundary that fired during the test may still be mid-chain. Its DB
    // round-trips resolve on real socket I/O, which fake timers do not advance,
    // so give them a real moment here — otherwise the chain outlives the suite
    // and queries a pool that `closeTestDb` has already ended. `destroyed` is
    // set above, so nothing re-arms while we wait.
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  /**
   * Seed schedule rows (real timers), then switch to fake timers so the
   * service's setTimeout-based boundary scheduling is deterministic. The pg
   * driver resolves queries via microtasks/socket events, so faking the
   * macro-task timers does not stall awaited DB calls — but we only enable it
   * once seeding is done.
   */
  function enableFakeTimers(): void {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  }

  /**
   * Inspect the service's own tracked-screen map rather than `jest.getTimerCount()`.
   * The pg connection pool schedules its own idle-timeout timers under fake timers,
   * which would pollute a raw global timer count; the tracked map is the service's
   * authoritative "is a boundary scheduled for this screen" state.
   */
  function trackedScreenIds(): string[] {
    const map = (service as unknown as { tracked: Map<string, unknown> }).tracked;
    return Array.from(map.keys());
  }
  function hasScheduledTimer(id: string): boolean {
    const map = (service as unknown as { tracked: Map<string, { timer: unknown }> }).tracked;
    const entry = map.get(id);
    return !!entry && entry.timer != null;
  }

  async function seedScreenEntry(
    startOffsetMs: number,
    endOffsetMs: number,
    pid: string,
  ): Promise<void> {
    const now = Date.now();
    await db.insert(scheduleEntries).values({
      organisationId: orgId,
      screenId,
      playlistId: pid,
      startTime: new Date(now + startOffsetMs),
      endTime: new Date(now + endOffsetMs),
      rrule: null,
      colour: '#fff',
    });
  }

  describe('getNextStart', () => {
    const HOUR_MS = 60 * 60 * 1000;

    it('returns null when nothing is scheduled', async () => {
      expect(await service.getNextStart(screenId)).toBeNull();
    });

    it('returns the start of the next entry', async () => {
      await seedScreenEntry(2 * HOUR_MS, 3 * HOUR_MS, playlistId);

      const next = await service.getNextStart(screenId);

      expect(next).not.toBeNull();
      expect(next!.getTime()).toBeCloseTo(Date.now() + 2 * HOUR_MS, -3);
    });

    it('returns the earliest of several upcoming entries', async () => {
      await seedScreenEntry(5 * HOUR_MS, 6 * HOUR_MS, playlistId);
      await seedScreenEntry(2 * HOUR_MS, 3 * HOUR_MS, playlistId2);

      const next = await service.getNextStart(screenId);

      expect(next!.getTime()).toBeCloseTo(Date.now() + 2 * HOUR_MS, -3);
    });

    // A set showing a schedule that is already running is on anyway — waking it
    // would be a magic packet to a TV that does not need one.
    it('ignores an entry that is already running', async () => {
      await seedScreenEntry(-HOUR_MS, HOUR_MS, playlistId);

      expect(await service.getNextStart(screenId)).toBeNull();
    });

    it('ignores an entry that has already finished', async () => {
      await seedScreenEntry(-3 * HOUR_MS, -2 * HOUR_MS, playlistId);

      expect(await service.getNextStart(screenId)).toBeNull();
    });

    it('returns nothing beyond the 24h look-ahead window', async () => {
      await seedScreenEntry(30 * HOUR_MS, 31 * HOUR_MS, playlistId);

      expect(await service.getNextStart(screenId)).toBeNull();
    });

    it('includes the group schedule the screen inherits', async () => {
      await db.update(screens).set({ groupId }).where(eq(screens.id, screenId));
      const now = Date.now();
      await db.insert(scheduleEntries).values({
        organisationId: orgId,
        groupId,
        playlistId: playlistId2,
        startTime: new Date(now + 4 * HOUR_MS),
        endTime: new Date(now + 5 * HOUR_MS),
        rrule: null,
        colour: '#fff',
      });

      const next = await service.getNextStart(screenId);

      expect(next!.getTime()).toBeCloseTo(now + 4 * HOUR_MS, -3);
    });

    it('expands a recurring entry to its next occurrence', async () => {
      const now = new Date();
      // Started an hour ago, repeats daily — the next occurrence is tomorrow.
      const start = new Date(now.getTime() - HOUR_MS);
      await db.insert(scheduleEntries).values({
        organisationId: orgId,
        screenId,
        playlistId,
        startTime: start,
        endTime: new Date(start.getTime() + HOUR_MS),
        rrule: 'FREQ=DAILY',
        colour: '#fff',
      });

      const next = await service.getNextStart(screenId);

      expect(next).not.toBeNull();
      expect(next!.getTime()).toBeGreaterThan(now.getTime());
      expect(next!.getTime()).toBeCloseTo(start.getTime() + 24 * HOUR_MS, -4);
    });

    it('measures the window from the given instant, not from now', async () => {
      await seedScreenEntry(2 * HOUR_MS, 3 * HOUR_MS, playlistId);

      const fromAfterIt = new Date(Date.now() + 4 * HOUR_MS);

      expect(await service.getNextStart(screenId, fromAfterIt)).toBeNull();
    });
  });

  describe('registerScreen', () => {
    it('should register a screen and store current playlist', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledWith(screenId);
    });

    it('should not register if screen does not exist', async () => {
      enableFakeTimers();
      await service.registerScreen('00000000-0000-0000-0000-000000000000');
      expect(scheduleService.getCurrentPlaylist).not.toHaveBeenCalled();
    });

    it('should not register a screen twice', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      const callsBefore = scheduleService.getCurrentPlaylist.mock.calls.length;

      await service.registerScreen(screenId);

      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledTimes(callsBefore);
    });

    it('should set a fallback timer when no schedule entries exist', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      expect(hasScheduledTimer(screenId)).toBe(true);
    });

    it('should set a timer based on the next schedule boundary', async () => {
      await seedScreenEntry(5000, 10000, playlistId);
      enableFakeTimers();
      await service.registerScreen(screenId);
      expect(hasScheduledTimer(screenId)).toBe(true);
    });
  });

  describe('unregisterScreen', () => {
    it('should clear timers and remove tracking', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      expect(hasScheduledTimer(screenId)).toBe(true);

      service.unregisterScreen(screenId);
      expect(trackedScreenIds()).not.toContain(screenId);
    });

    it('should be a no-op for untracked screens', () => {
      enableFakeTimers();
      service.unregisterScreen('non-existent');
    });
  });

  describe('boundary timer fire', () => {
    it('should emit SCHEDULE_CHANGED when playlist changes', async () => {
      await seedScreenEntry(1000, 60000, playlistId2);

      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: playlistId, name: 'Playlist 1' },
        isDefault: true,
        epoch: 0,
        source: 'fallback',
      });

      enableFakeTimers();
      await service.registerScreen(screenId);
      emit.mockClear();

      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: playlistId2, name: 'Playlist 2' },
        isDefault: false,
        epoch: 1_700_000_000_000,
        source: 'screen',
      });

      jest.advanceTimersByTime(1500);
      await jest.advanceTimersToNextTimerAsync();

      expect(emit).toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.any(ScreenStateChangeEvent));
      const emittedEvent = emit.mock.calls.find((c: unknown[]) => c[0] === SCHEDULE_CHANGED);
      expect(emittedEvent![1]).toEqual(
        expect.objectContaining({ screenId, organisationId: orgId }),
      );
    });

    it('should not emit when playlist has not changed', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      emit.mockClear();

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersToNextTimerAsync();

      expect(emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.anything());
    });

    it('should handle getCurrentPlaylist errors gracefully', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      emit.mockClear();

      scheduleService.getCurrentPlaylist.mockRejectedValue(new Error('DB error'));

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersToNextTimerAsync();

      expect(emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.anything());
    });

    it('should reschedule the next boundary after firing', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersToNextTimerAsync();

      expect(hasScheduledTimer(screenId)).toBe(true);
    });
  });

  describe('handleScheduleEntryChanged', () => {
    it('should recalculate timer for tracked screen', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      // Re-handling should not throw and should keep a timer scheduled.
      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));
      expect(hasScheduledTimer(screenId)).toBe(true);
    });

    it('should ignore events for untracked screens', async () => {
      enableFakeTimers();
      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent('00000000-0000-0000-0000-000000000000', orgId),
      );
      expect(trackedScreenIds()).toHaveLength(0);
    });
  });

  describe('handleGroupScheduleChanged', () => {
    it('should recalculate for tracked screens in the group', async () => {
      await db.update(screens).set({ groupId }).where(eq(screens.id, screenId));
      enableFakeTimers();
      await service.registerScreen(screenId);

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      expect(hasScheduledTimer(screenId)).toBe(true);
    });

    it('should skip screens not tracked', async () => {
      await db.update(screens).set({ groupId }).where(eq(screens.id, screenId));
      enableFakeTimers();
      // screen NOT registered → group change must not create any timer
      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      expect(trackedScreenIds()).toHaveLength(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all timers', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);
      expect(hasScheduledTimer(screenId)).toBe(true);

      service.onModuleDestroy();
      expect(trackedScreenIds()).toHaveLength(0);
    });
  });

  describe('group schedule boundaries', () => {
    it('should collect boundaries from group entries', async () => {
      await db.update(screens).set({ groupId }).where(eq(screens.id, screenId));
      const now = Date.now();
      await db.insert(scheduleEntries).values({
        organisationId: orgId,
        groupId,
        playlistId: playlistId2,
        startTime: new Date(now + 3000),
        endTime: new Date(now + 60000),
        rrule: null,
        colour: '#fff',
      });

      enableFakeTimers();
      await service.registerScreen(screenId);

      expect(hasScheduledTimer(screenId)).toBe(true);
    });
  });

  /**
   * A restarted player used to keep whatever anchor it fetched on reconnect
   * while its peers kept theirs, with nothing reconciling the two. These cover
   * the two halves of the fix: a boundary on a group entry is fanned out to the
   * whole group exactly once, and an arriving member re-aligns its peers.
   */
  describe('group synchronisation', () => {
    async function seedGroupedScreen(name: string): Promise<string> {
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: orgId,
          name,
          resolution: '1920x1080',
          location: 'Stage Right',
          apiKeyHash: `$2b$10$${name}`,
          isOnline: true,
          groupId,
        })
        .returning();
      return screen.id;
    }

    function resolveAs(
      pid: string | null,
      epoch: number,
      source: 'screen' | 'group' | 'fallback',
    ): void {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: pid ? { id: pid, name: 'Playlist' } : null,
        isDefault: source === 'fallback',
        epoch,
        source,
      });
    }

    function groupEmits(): unknown[] {
      return emit.mock.calls.filter((c: unknown[]) => c[0] === GROUP_SCHEDULE_CHANGED);
    }

    // An RRULE rolling to the next occurrence of the same playlist moves the
    // anchor without changing the id. Comparing ids alone emitted nothing, so
    // running players stayed a full recurrence period behind.
    it('emits when only the epoch moved', async () => {
      resolveAs(playlistId, 1_000, 'screen');
      enableFakeTimers();
      await service.registerScreen(screenId);
      emit.mockClear();

      resolveAs(playlistId, 2_000, 'screen');
      await jest.advanceTimersByTimeAsync(60_000);

      expect(emit).toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.any(ScreenStateChangeEvent));
    });

    it('emits nothing when playlist and epoch are unchanged', async () => {
      resolveAs(playlistId, 1_000, 'screen');
      enableFakeTimers();
      await service.registerScreen(screenId);
      emit.mockClear();

      await jest.advanceTimersByTimeAsync(60_000);

      expect(emit).not.toHaveBeenCalled();
    });

    it('fans a group-sourced boundary out to the group, not to the one screen', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      resolveAs(playlistId, 1_000, 'group');
      enableFakeTimers();
      await service.registerScreen(s1);
      emit.mockClear();

      resolveAs(playlistId2, 2_000, 'group');
      await jest.advanceTimersByTimeAsync(60_000);

      expect(emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.anything());
      expect(groupEmits()).toHaveLength(1);
      expect(groupEmits()[0]).toEqual([
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({ groupId, organisationId: orgId, playlistId: playlistId2 }),
      ]);
    });

    // A group entry ending has to re-align the members just as much as one
    // starting: the screen that notices resolves to the fallback, which is not
    // group-sourced, so only the previous source identifies it as group-wide.
    it('fans out group-wide when a group entry ends into the fallback', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      resolveAs(playlistId, 1_000, 'group');
      enableFakeTimers();
      await service.registerScreen(s1);
      emit.mockClear();

      resolveAs(playlistId2, 0, 'fallback');
      await jest.advanceTimersByTimeAsync(60_000);

      expect(groupEmits()).toHaveLength(1);
      expect(emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.anything());
    });

    it('keeps a screen-sourced boundary local to that screen', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      resolveAs(playlistId, 1_000, 'screen');
      enableFakeTimers();
      await service.registerScreen(s1);
      emit.mockClear();

      resolveAs(playlistId2, 2_000, 'screen');
      await jest.advanceTimersByTimeAsync(60_000);

      expect(emit).toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.any(ScreenStateChangeEvent));
      expect(groupEmits()).toHaveLength(0);
    });

    // Every member has its own timer and they all fire at the same boundary.
    it('produces one fan-out when every member crosses the same boundary', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      const s2 = await seedGroupedScreen('Wall B');
      const s3 = await seedGroupedScreen('Wall C');
      resolveAs(playlistId, 1_000, 'group');
      enableFakeTimers();
      await service.registerScreen(s1);
      await service.registerScreen(s2);
      await service.registerScreen(s3);
      emit.mockClear();

      resolveAs(playlistId2, 2_000, 'group');
      await jest.advanceTimersByTimeAsync(60_000);

      expect(groupEmits()).toHaveLength(1);
    });

    it('re-aligns the group when a member registers', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      resolveAs(playlistId, 1_000, 'group');
      enableFakeTimers();

      await service.registerScreen(s1);

      expect(groupEmits()).toHaveLength(1);
      expect(groupEmits()[0]).toEqual([
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({ groupId, organisationId: orgId, playlistId }),
      ]);
    });

    it('does not re-align for an ungrouped screen', async () => {
      resolveAs(playlistId, 1_000, 'screen');
      enableFakeTimers();

      await service.registerScreen(screenId);

      expect(groupEmits()).toHaveLength(0);
    });

    // A backend restart reconnects every member within milliseconds; without the
    // throttle each arrival would push to all N peers.
    it('coalesces a reconnect storm into one re-alignment', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      const s2 = await seedGroupedScreen('Wall B');
      const s3 = await seedGroupedScreen('Wall C');
      resolveAs(playlistId, 1_000, 'group');
      enableFakeTimers();

      await service.registerScreen(s1);
      await service.registerScreen(s2);
      await service.registerScreen(s3);

      expect(groupEmits()).toHaveLength(1);
    });

    it('re-aligns again once the throttle window has passed', async () => {
      const s1 = await seedGroupedScreen('Wall A');
      resolveAs(playlistId, 1_000, 'group');
      enableFakeTimers();
      await service.registerScreen(s1);
      service.unregisterScreen(s1);
      emit.mockClear();

      await jest.advanceTimersByTimeAsync(6_000);
      await service.registerScreen(s1);

      expect(groupEmits()).toHaveLength(1);
    });

    // scheduleNextBoundary awaits a query between clearing and re-arming its
    // timer. Without the generation guard both concurrent calls arm one, and the
    // superseded call's timer stays pending with nothing referencing it — so the
    // screen evaluates a boundary at a time that is no longer scheduled.
    //
    // The boundary query is stubbed to stay open: against the real pool the two
    // calls serialize on the single connection and never overlap, so the race
    // the guard exists for cannot be reproduced through the database.
    it('arms only the newest timer when two reschedules race', async () => {
      enableFakeTimers();
      await service.registerScreen(screenId);

      const pending: Array<(boundaries: Date[]) => void> = [];
      (service as unknown as { collectBoundaries: () => Promise<Date[]> }).collectBoundaries = () =>
        new Promise<Date[]>((resolve) => pending.push(resolve));

      const base = Date.now();
      const event = new ScheduleEntryChangedEvent(screenId, orgId);
      const stale = service.handleScheduleEntryChanged(event);
      const newest = service.handleScheduleEntryChanged(event);
      // The superseded call comes back first, and with a nearer boundary.
      pending[0]([new Date(base + 10_000)]);
      pending[1]([new Date(base + 30_000)]);
      await Promise.all([stale, newest]);
      scheduleService.getCurrentPlaylist.mockClear();

      await jest.advanceTimersByTimeAsync(15_000);
      expect(scheduleService.getCurrentPlaylist).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(15_000);
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledTimes(1);
    });
  });
});
