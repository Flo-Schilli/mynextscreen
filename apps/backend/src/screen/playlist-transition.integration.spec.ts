import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScheduleBoundaryService } from './schedule-boundary.service';
import { ScreenStateService } from './screen-state.service';
import { PlaylistChangeBridgeService } from './playlist-change-bridge.service';
import { ScreenService } from './screen.service';
import { SCREEN_PROTOCOL_ADAPTER, ScreenEvent, ScreenEventType } from '../screen-protocol';
import type { ScreenProtocolAdapter } from '../screen-protocol';
import { PlaylistUpdatedEvent, PLAYLIST_UPDATED } from '../playlist/playlist.event';
import { ScheduleService } from '../schedule';
import { SCHEDULE_CHANGED, ScreenStateChangeEvent } from './screen-state.event';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, playlists, scheduleEntries, type Screen } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

/**
 * Integration test: wires the real ScreenStateService + ScheduleBoundaryService +
 * PlaylistChangeBridgeService together over the live EventEmitter and a real
 * Postgres database (harness). Only the external collaborators ScreenService,
 * ScheduleService and the protocol adapter are mocked.
 */
describe('Playlist Transition Integration', () => {
  let module: TestingModule;
  let db: DrizzleDB;
  let eventEmitter: EventEmitter2;
  let screenStateService: ScreenStateService;
  let scheduleBoundaryService: ScheduleBoundaryService;

  let screenService: { findOne: jest.Mock };
  let scheduleService: { getCurrentPlaylist: jest.Mock };
  let protocolAdapter: jest.Mocked<ScreenProtocolAdapter>;

  let orgId: string;
  let screenId: string;
  let defaultPlaylistId: string;
  let scheduledPlaylistId: string;

  function makeScreen(overrides: Partial<Screen> = {}): Screen {
    return {
      id: screenId,
      organisationId: orgId,
      name: 'Lobby Display',
      resolution: '1920x1080',
      location: 'Lobby',
      apiKeyHash: '$2b$10$hashed',
      apiKeyFingerprint: null,
      playerVersion: null,
      lastHeartbeat: null,
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      groupId: null,
      gridRow: null,
      gridColumn: null,
      showUnmuteButton: true,
      showDisconnectButton: true,
      ...overrides,
    };
  }

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

    const [defaultPl] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Default' })
      .returning();
    defaultPlaylistId = defaultPl.id;
    const [scheduledPl] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Scheduled Playlist' })
      .returning();
    scheduledPlaylistId = scheduledPl.id;

    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Lobby Display',
        resolution: '1920x1080',
        location: 'Lobby',
        apiKeyHash: '$2b$10$hashed',
        apiKeyFingerprint: null,
        playerVersion: null,
        isOnline: true,
      })
      .returning();
    screenId = screen.id;

    await db.update(organisations).set({ defaultPlaylistId }).where(eq(organisations.id, orgId));

    screenService = { findOne: jest.fn().mockImplementation(async () => makeScreen()) };
    scheduleService = {
      getCurrentPlaylist: jest.fn().mockResolvedValue({
        playlist: { id: defaultPlaylistId, name: 'Default' },
        isDefault: true,
      }),
    };
    protocolAdapter = {
      renderState: jest.fn().mockImplementation((state) => state),
      renderEvent: jest.fn().mockImplementation((event: ScreenEvent) => ({
        type: event.type,
        data: event.payload,
      })),
    };

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ScreenStateService,
        ScheduleBoundaryService,
        PlaylistChangeBridgeService,
        { provide: ScreenService, useValue: screenService },
        { provide: ScheduleService, useValue: scheduleService },
        { provide: SCREEN_PROTOCOL_ADAPTER, useValue: protocolAdapter },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    await module.init();

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    screenStateService = module.get<ScreenStateService>(ScreenStateService);
    scheduleBoundaryService = module.get<ScheduleBoundaryService>(ScheduleBoundaryService);
  });

  afterEach(async () => {
    if (screenStateService) screenStateService.onModuleDestroy();
    if (scheduleBoundaryService) scheduleBoundaryService.onModuleDestroy();
    jest.useRealTimers();
    if (module) await module.close();
  });

  /** Switch to fake timers after DB seeding so pg query I/O is not stalled. */
  function enableFakeTimers(): void {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  }

  /**
   * Yield to the real event loop so the pg driver's socket I/O callbacks (which
   * fake timers do NOT advance) can resolve in-flight queries. setImmediate is
   * left un-faked specifically for this.
   */
  async function flushRealIo(times = 8): Promise<void> {
    for (let i = 0; i < times; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  /**
   * Upper bound for {@link drainUntil}. Only reached when the awaited condition
   * never becomes true — a healthy round takes microseconds, so this is a
   * failure budget, not a delay.
   */
  const MAX_DRAIN_ROUNDS = 200;

  /**
   * Drain real DB I/O and fake-timer microtasks until `condition` holds.
   *
   * The boundary callback issues several sequential awaited queries, and how
   * many event-loop turns that chain needs depends on how fast Postgres answers
   * — which is exactly what differs between a laptop and a loaded CI runner.
   * Draining a *fixed* number of rounds therefore passed locally and failed
   * intermittently on CI. Waiting for the observable outcome instead makes the
   * test independent of that timing: it returns as soon as the effect is there,
   * and fails with a description rather than an opaque `0 >= 1`.
   */
  async function drainUntil(condition: () => boolean, description: string): Promise<void> {
    for (let round = 0; round < MAX_DRAIN_ROUNDS; round += 1) {
      if (condition()) return;
      await flushRealIo(2);
      await jest.advanceTimersByTimeAsync(0);
    }
    if (condition()) return;
    throw new Error(
      `Timed out after ${MAX_DRAIN_ROUNDS} drain rounds waiting for ${description}. ` +
        'Either the effect never happened, or the chain producing it now needs more than ' +
        'the budgeted event-loop turns.',
    );
  }

  /** Advance fake timers, then wait for the effect the advance is supposed to cause. */
  async function advanceUntil(
    ms: number,
    condition: () => boolean,
    description: string,
  ): Promise<void> {
    await jest.advanceTimersByTimeAsync(ms);
    await drainUntil(condition, description);
  }

  /**
   * For the negative cases, where the assertion is that *nothing* happens and
   * there is consequently no condition to wait for: advance, then drain a fixed
   * and deliberately generous number of rounds.
   */
  async function advanceAndSettle(ms: number): Promise<void> {
    await jest.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 8; i += 1) {
      await flushRealIo();
      await jest.advanceTimersByTimeAsync(0);
    }
  }

  /** True once at least one SSE state-change reached the subscriber. */
  function sawStateChange(events: { type?: string }[]): boolean {
    return events.some((event) => event.type === 'state-change');
  }

  /** Block (via real IO) until the boundary service has a timer for the screen. */
  async function waitUntilRegistered(): Promise<void> {
    const map = (scheduleBoundaryService as unknown as { tracked: Map<string, { timer: unknown }> })
      .tracked;
    await drainUntil(() => {
      const entry = map.get(screenId);
      return entry != null && entry.timer != null;
    }, `the boundary service to register a timer for screen ${screenId}`);
  }

  async function seedEntry(startOffsetMs: number, endOffsetMs: number): Promise<void> {
    const now = Date.now();
    await db.insert(scheduleEntries).values({
      organisationId: orgId,
      screenId,
      playlistId: scheduledPlaylistId,
      startTime: new Date(now + startOffsetMs),
      endTime: new Date(now + endOffsetMs),
      rrule: null,
      colour: '#fff',
    });
  }

  describe('schedule entry starts → player receives schedule_update', () => {
    it('should deliver schedule_update SSE event when a schedule boundary is crossed and playlist changes', async () => {
      await seedEntry(5000, 60000);
      enableFakeTimers();

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await waitUntilRegistered();

      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: scheduledPlaylistId, name: 'Scheduled Playlist' },
        isDefault: false,
      });

      await advanceUntil(
        6000,
        () => sawStateChange(receivedEvents),
        'the schedule_update SSE event after the boundary was crossed',
      );

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.ScheduleUpdate,
          payload: expect.objectContaining({ screenId, organisationId: orgId }),
        }),
      );
    }, 15000);
  });

  describe('schedule entry ends → player receives schedule_update (back to default)', () => {
    it('should deliver schedule_update SSE event when a schedule entry ends', async () => {
      await seedEntry(-5000, 3000);

      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: scheduledPlaylistId, name: 'Scheduled Playlist' },
        isDefault: false,
      });

      enableFakeTimers();

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await waitUntilRegistered();

      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: defaultPlaylistId, name: 'Default' },
        isDefault: true,
      });

      await advanceUntil(
        4000,
        () => sawStateChange(receivedEvents),
        'the schedule_update SSE event after the entry ended',
      );

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.ScheduleUpdate,
          payload: expect.objectContaining({ screenId, organisationId: orgId }),
        }),
      );
    }, 15000);
  });

  describe('active playlist items modified → player receives playlist_update', () => {
    it("should deliver playlist_update SSE event when a connected screen's active playlist is modified", async () => {
      await seedEntry(-60000, 60000);
      enableFakeTimers();

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await flushRealIo();
      await jest.advanceTimersByTimeAsync(0);
      await flushRealIo();

      await eventEmitter.emitAsync(
        PLAYLIST_UPDATED,
        new PlaylistUpdatedEvent(scheduledPlaylistId, orgId),
      );
      await drainUntil(
        () => sawStateChange(receivedEvents),
        'the playlist_update SSE event for the scheduled playlist',
      );

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.PlaylistUpdate,
          payload: expect.objectContaining({ screenId, organisationId: orgId }),
        }),
      );
    }, 15000);

    it('should deliver playlist_update when the default playlist is modified', async () => {
      // No schedule entries → screen runs the org default playlist.
      enableFakeTimers();

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await flushRealIo();
      await jest.advanceTimersByTimeAsync(0);
      await flushRealIo();

      await eventEmitter.emitAsync(
        PLAYLIST_UPDATED,
        new PlaylistUpdatedEvent(defaultPlaylistId, orgId),
      );
      await drainUntil(
        () => sawStateChange(receivedEvents),
        'the playlist_update SSE event for the default playlist',
      );

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.PlaylistUpdate }),
      );
    }, 15000);
  });

  describe('screen disconnects → no timer leaks, no errors on next boundary', () => {
    it('should clean up timers when screen disconnects and not error on next boundary', async () => {
      await seedEntry(5000, 60000);
      enableFakeTimers();

      const sse$ = screenStateService.subscribe(screenId);
      const sub = sse$.subscribe();

      await flushRealIo();
      await jest.advanceTimersByTimeAsync(0);
      await flushRealIo();

      // Disconnect
      sub.unsubscribe();
      scheduleBoundaryService.unregisterScreen(screenId);

      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: scheduledPlaylistId, name: 'Scheduled' },
        isDefault: false,
      });

      // Advance past boundary — must not throw
      await advanceAndSettle(10000);

      // No events pushed to the (disconnected) screen.
      expect(protocolAdapter.renderEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ screenId }),
        }),
      );
    }, 15000);

    it('should not error when SCHEDULE_CHANGED fires for a disconnected screen', async () => {
      enableFakeTimers();
      const sse$ = screenStateService.subscribe(screenId);
      const sub = sse$.subscribe();
      await flushRealIo();
      await jest.advanceTimersByTimeAsync(0);
      await flushRealIo();

      sub.unsubscribe();
      scheduleBoundaryService.unregisterScreen(screenId);
      protocolAdapter.renderEvent.mockClear();

      expect(() => {
        eventEmitter.emit(SCHEDULE_CHANGED, new ScreenStateChangeEvent(screenId, orgId));
      }).not.toThrow();

      expect(protocolAdapter.renderEvent).not.toHaveBeenCalled();
    }, 15000);
  });
});
