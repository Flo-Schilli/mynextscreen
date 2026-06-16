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
   * Advance fake timers and drain the DB I/O the fired callbacks trigger. The
   * boundary callback issues several sequential awaited queries, so we interleave
   * real-IO flushes with small timer nudges a few times to let the whole chain
   * settle.
   */
  async function advanceAndDrain(ms: number): Promise<void> {
    await jest.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 4; i++) {
      await flushRealIo();
      await jest.advanceTimersByTimeAsync(0);
    }
  }

  /** Block (via real IO) until the boundary service has a timer for the screen. */
  async function waitUntilRegistered(): Promise<void> {
    const map = (scheduleBoundaryService as unknown as { tracked: Map<string, { timer: unknown }> })
      .tracked;
    for (let i = 0; i < 50; i++) {
      const entry = map.get(screenId);
      if (entry && entry.timer != null) return;
      await flushRealIo(2);
      await jest.advanceTimersByTimeAsync(0);
    }
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

      await advanceAndDrain(6000);

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

      await advanceAndDrain(4000);

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
      await flushRealIo();

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
      await flushRealIo();

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
      await advanceAndDrain(10000);

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
