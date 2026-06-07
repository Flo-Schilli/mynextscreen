import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleBoundaryService } from './schedule-boundary.service';
import { ScreenStateService } from './screen-state.service';
import { PlaylistChangeBridgeService } from './playlist-change-bridge.service';
import { ScreenService } from './screen.service';
import { SCREEN_PROTOCOL_ADAPTER, ScreenEvent, ScreenEventType } from '../screen-protocol';
import type { ScreenProtocolAdapter } from '../screen-protocol';
import { Screen } from './screen.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { Playlist } from '../playlist/playlist.entity';
import { PlaylistUpdatedEvent, PLAYLIST_UPDATED } from '../playlist/playlist.event';
import { ScheduleEntry, ScheduleService } from '../schedule';
import { LiveStreamActivation } from '../live-stream/live-stream-activation.entity';
import { Organisation } from '../organisation/organisation.entity';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';
import { SCHEDULE_CHANGED, ScreenStateChangeEvent } from './screen-state.event';

describe('Playlist Transition Integration', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  let screenStateService: ScreenStateService;
  let scheduleBoundaryService: ScheduleBoundaryService;

  let entryRepository: Record<string, jest.Mock>;
  let screenRepository: Record<string, jest.Mock>;
  let screenGroupRepository: Record<string, jest.Mock>;
  let playlistRepository: Record<string, jest.Mock>;
  let activationRepository: Record<string, jest.Mock>;
  let organisationRepository: Record<string, jest.Mock>;
  let screenService: Record<string, jest.Mock>;
  let scheduleService: Record<string, jest.Mock>;
  let protocolAdapter: jest.Mocked<ScreenProtocolAdapter>;

  const orgId = 'org-001';
  const screenId = 'screen-001';
  const defaultPlaylistId = 'playlist-default';
  const scheduledPlaylistId = 'playlist-scheduled';

  const mockScreen: Screen = {
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
    organisation: {} as Organisation,
    groupId: null,
    group: null,
    gridRow: null,
    gridColumn: null,
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    entryRepository = { find: jest.fn().mockResolvedValue([]) };
    screenRepository = {
      findOne: jest.fn().mockResolvedValue(mockScreen),
      find: jest.fn().mockResolvedValue([]),
    };
    screenGroupRepository = { findOne: jest.fn().mockResolvedValue(null) };
    playlistRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: defaultPlaylistId,
        name: 'Default',
        items: [],
        organisationId: orgId,
      }),
    };
    activationRepository = { findOne: jest.fn().mockResolvedValue(null) };
    organisationRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: orgId,
        defaultPlaylistId,
      }),
    };
    screenService = {
      findOne: jest.fn().mockResolvedValue(mockScreen),
    };
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
        {
          provide: getRepositoryToken(ScheduleEntry),
          useValue: entryRepository,
        },
        { provide: getRepositoryToken(Screen), useValue: screenRepository },
        {
          provide: getRepositoryToken(ScreenGroup),
          useValue: screenGroupRepository,
        },
        { provide: getRepositoryToken(Playlist), useValue: playlistRepository },
        {
          provide: getRepositoryToken(LiveStreamActivation),
          useValue: activationRepository,
        },
        {
          provide: getRepositoryToken(Organisation),
          useValue: organisationRepository,
        },
        {
          provide: getRepositoryToken(SlicedRendition),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    await module.init();

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    screenStateService = module.get<ScreenStateService>(ScreenStateService);
    scheduleBoundaryService = module.get<ScheduleBoundaryService>(ScheduleBoundaryService);
  });

  afterEach(async () => {
    screenStateService.onModuleDestroy();
    scheduleBoundaryService.onModuleDestroy();
    jest.useRealTimers();
    await module.close();
  });

  describe('schedule entry starts → player receives schedule_update', () => {
    it('should deliver schedule_update SSE event when a schedule boundary is crossed and playlist changes', async () => {
      const now = new Date();
      const boundaryTime = new Date(now.getTime() + 5000);
      const endTime = new Date(now.getTime() + 60000);

      entryRepository.find.mockResolvedValue([
        {
          screenId,
          groupId: null,
          startTime: boundaryTime,
          endTime,
          rrule: null,
          playlistId: scheduledPlaylistId,
          organisationId: orgId,
        },
      ]);

      // Connect the screen via SSE
      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      // Let registerScreen complete (async, fire-and-forget inside subscribe)
      await jest.advanceTimersByTimeAsync(0);

      // After boundary fires, getCurrentPlaylist returns the scheduled playlist
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: scheduledPlaylistId, name: 'Scheduled Playlist' },
        isDefault: false,
      });

      // Advance past the boundary
      await jest.advanceTimersByTimeAsync(6000);

      sub.unsubscribe();

      // The boundary service detected the playlist change and emitted SCHEDULE_CHANGED,
      // which ScreenStateService received via @OnEvent and pushed as SSE
      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.ScheduleUpdate,
          payload: expect.objectContaining({
            screenId,
            organisationId: orgId,
          }),
        }),
      );
    }, 15000);
  });

  describe('schedule entry ends → player receives schedule_update (back to default)', () => {
    it('should deliver schedule_update SSE event when a schedule entry ends', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 5000);
      const endTime = new Date(now.getTime() + 3000);

      entryRepository.find.mockResolvedValue([
        {
          screenId,
          groupId: null,
          startTime,
          endTime,
          rrule: null,
          playlistId: scheduledPlaylistId,
          organisationId: orgId,
        },
      ]);

      // Initial: scheduled playlist is active
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: scheduledPlaylistId, name: 'Scheduled Playlist' },
        isDefault: false,
      });

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await jest.advanceTimersByTimeAsync(0);

      // After the end boundary, transition back to default
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: defaultPlaylistId, name: 'Default' },
        isDefault: true,
      });

      await jest.advanceTimersByTimeAsync(4000);

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.ScheduleUpdate,
          payload: expect.objectContaining({
            screenId,
            organisationId: orgId,
          }),
        }),
      );
    }, 15000);
  });

  describe('active playlist items modified → player receives playlist_update', () => {
    it("should deliver playlist_update SSE event when a connected screen's active playlist is modified", async () => {
      const now = new Date();
      const activeStart = new Date(now.getTime() - 60000);
      const activeEnd = new Date(now.getTime() + 60000);

      entryRepository.find.mockResolvedValue([
        {
          screenId,
          groupId: null,
          startTime: activeStart,
          endTime: activeEnd,
          rrule: null,
          playlistId: scheduledPlaylistId,
          organisationId: orgId,
        },
      ]);

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await jest.advanceTimersByTimeAsync(0);

      // Emit PLAYLIST_UPDATED — PlaylistChangeBridgeService bridges this to screens
      await eventEmitter.emitAsync(
        PLAYLIST_UPDATED,
        new PlaylistUpdatedEvent(scheduledPlaylistId, orgId),
      );

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.PlaylistUpdate,
          payload: expect.objectContaining({
            screenId,
            organisationId: orgId,
          }),
        }),
      );
    }, 15000);

    it('should deliver playlist_update when the default playlist is modified', async () => {
      entryRepository.find.mockResolvedValue([]);
      organisationRepository.findOne.mockResolvedValue({
        id: orgId,
        defaultPlaylistId,
      });
      screenRepository.find.mockResolvedValue([mockScreen]);

      const sse$ = screenStateService.subscribe(screenId);
      const receivedEvents: { data: unknown; type?: string }[] = [];
      const sub = sse$.subscribe((msg) => receivedEvents.push(msg));

      await jest.advanceTimersByTimeAsync(0);

      await eventEmitter.emitAsync(
        PLAYLIST_UPDATED,
        new PlaylistUpdatedEvent(defaultPlaylistId, orgId),
      );

      sub.unsubscribe();

      const stateChangeEvents = receivedEvents.filter((e) => e.type === 'state-change');
      expect(stateChangeEvents.length).toBeGreaterThanOrEqual(1);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.PlaylistUpdate,
        }),
      );
    }, 15000);
  });

  describe('screen disconnects → no timer leaks, no errors on next boundary', () => {
    it('should clean up timers when screen disconnects and not error on next boundary', async () => {
      const now = new Date();
      const boundaryTime = new Date(now.getTime() + 5000);
      const endTime = new Date(now.getTime() + 60000);

      entryRepository.find.mockResolvedValue([
        {
          screenId,
          groupId: null,
          startTime: boundaryTime,
          endTime,
          rrule: null,
          playlistId: scheduledPlaylistId,
          organisationId: orgId,
        },
      ]);

      const sse$ = screenStateService.subscribe(screenId);
      const sub = sse$.subscribe();

      await jest.advanceTimersByTimeAsync(0);

      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(1);

      // Disconnect
      sub.unsubscribe();
      scheduleBoundaryService.unregisterScreen(screenId);

      const timerCountAfterDisconnect = jest.getTimerCount();

      // Change mock for after boundary
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: scheduledPlaylistId, name: 'Scheduled' },
        isDefault: false,
      });

      // Advance past boundary — must not throw
      await jest.advanceTimersByTimeAsync(10000);

      expect(jest.getTimerCount()).toBeLessThanOrEqual(timerCountAfterDisconnect);

      // No events pushed to disconnected screen
      expect(protocolAdapter.renderEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ screenId }),
        }),
      );
    }, 15000);

    it('should not error when SCHEDULE_CHANGED fires for a disconnected screen', async () => {
      const sse$ = screenStateService.subscribe(screenId);
      const sub = sse$.subscribe();
      await jest.advanceTimersByTimeAsync(0);

      sub.unsubscribe();
      scheduleBoundaryService.unregisterScreen(screenId);

      // Emit SCHEDULE_CHANGED for disconnected screen — should be a no-op
      expect(() => {
        eventEmitter.emit(SCHEDULE_CHANGED, new ScreenStateChangeEvent(screenId, orgId));
      }).not.toThrow();

      expect(protocolAdapter.renderEvent).not.toHaveBeenCalled();
    }, 15000);
  });
});
