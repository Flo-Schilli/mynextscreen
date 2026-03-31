import { ScreenStateService } from './screen-state.service';
import { ScreenService } from './screen.service';
import { ScreenState, ScreenEvent, ScreenEventType } from '../screen-protocol';
import type { ScreenProtocolAdapter } from '../screen-protocol';
import { Screen } from './screen.entity';
import { Organisation } from '../organisation/organisation.entity';
import { ScreenStateChangeEvent } from './screen-state.event';
import { ScheduleEntryChangedEvent, ScheduleService } from '../schedule';
import { Playlist } from '../playlist/playlist.entity';
import { PlaylistItem } from '../playlist/playlist-item.entity';
import { TransitionType } from '../playlist/transition-type.enum';
import { Content } from '../content/content.entity';
import { firstValueFrom, take } from 'rxjs';

describe('ScreenStateService', () => {
  let service: ScreenStateService;
  let screenService: { findOne: jest.Mock };
  let protocolAdapter: jest.Mocked<ScreenProtocolAdapter>;
  let scheduleService: { getCurrentPlaylist: jest.Mock };
  let screenGroupRepository: { findOne: jest.Mock };
  let playlistRepository: { findOne: jest.Mock };
  let activationRepository: { findOne: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';

  const mockScreen: Screen = {
    id: screenId,
    organisationId: orgId,
    name: 'Main Stage',
    resolution: '1920x1080',
    location: 'Stage Left',
    apiKeyHash: '$2b$10$hashedvalue',
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

  const mockPlaylistItem: Partial<PlaylistItem> = {
    contentId: 'content-1',
    durationSeconds: 30,
    position: 0,
    transition: TransitionType.SlideLeft,
    transitionDurationMs: 1000,
    content: { type: 'video' } as Content,
  };

  const mockPlaylist: Playlist = {
    id: playlistId,
    organisationId: orgId,
    name: 'Morning Playlist',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
  } as Playlist;

  const mockPlaylistWithItems: Playlist = {
    ...mockPlaylist,
    items: [mockPlaylistItem as PlaylistItem],
  } as Playlist;

  beforeEach(() => {
    screenService = {
      findOne: jest.fn().mockResolvedValue(mockScreen),
    };

    protocolAdapter = {
      renderState: jest.fn().mockImplementation((state: ScreenState) => ({
        screen: state.screen,
        currentPlaylist: state.currentPlaylist,
        schedule: state.scheduleEntries,
        fallbackPlaylist: state.fallbackPlaylist,
        liveStream: state.activeLiveStream,
      })),
      renderEvent: jest.fn().mockImplementation((event: ScreenEvent) => ({
        type: event.type,
        timestamp: '2026-03-29T00:00:00.000Z',
        data: event.payload,
      })),
    };

    scheduleService = {
      getCurrentPlaylist: jest.fn().mockResolvedValue({
        playlist: mockPlaylist,
        isDefault: false,
      }),
    };

    screenGroupRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    playlistRepository = {
      findOne: jest.fn().mockResolvedValue(mockPlaylist),
    };

    activationRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    service = new ScreenStateService(
      screenService as unknown as ScreenService,
      protocolAdapter,
      scheduleService as unknown as ScheduleService,
      screenGroupRepository as any,
      playlistRepository as any,
      activationRepository as any,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('assembleState', () => {
    it('should assemble a ScreenState from the screen entity', async () => {
      const state = await service.assembleState(orgId, screenId);

      expect(screenService.findOne).toHaveBeenCalledWith(orgId, screenId);
      expect(state).toBeInstanceOf(ScreenState);
      expect(state.screen).toEqual({
        id: screenId,
        name: 'Main Stage',
        organisationId: orgId,
        resolution: '1920x1080',
        location: 'Stage Left',
        groupId: null,
        gridRow: null,
        gridColumn: null,
      });
    });

    it('should return currentPlaylist when a scheduled playlist is active', async () => {
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist).toEqual({
        id: playlistId,
        name: 'Morning Playlist',
        items: [],
      });
      expect(state.fallbackPlaylist).toBeNull();
    });

    it('should map transition fields from playlist items to protocol model', async () => {
      playlistRepository.findOne.mockResolvedValue(mockPlaylistWithItems);
      const state = await service.assembleState(orgId, screenId);
      const items = state.currentPlaylist!.items;
      expect(items).toHaveLength(1);
      expect(items[0].transition).toBe('slide-left');
      expect(items[0].transitionDurationMs).toBe(1000);
    });

    it('should use Content.durationSeconds for video items when available', async () => {
      const playlistWithVideoDuration = {
        ...mockPlaylist,
        items: [
          {
            contentId: 'content-1',
            durationSeconds: 30,
            position: 0,
            transition: TransitionType.Fade,
            transitionDurationMs: 500,
            content: { type: 'video', durationSeconds: 58 } as Content,
          } as PlaylistItem,
        ],
      } as Playlist;
      playlistRepository.findOne.mockResolvedValue(playlistWithVideoDuration);
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist!.items[0].duration).toBe(58);
    });

    it('should fall back to item.durationSeconds for video when Content.durationSeconds is null', async () => {
      const playlistWithNullDuration = {
        ...mockPlaylist,
        items: [
          {
            contentId: 'content-1',
            durationSeconds: 30,
            position: 0,
            transition: TransitionType.Fade,
            transitionDurationMs: 500,
            content: { type: 'video', durationSeconds: null } as Content,
          } as PlaylistItem,
        ],
      } as Playlist;
      playlistRepository.findOne.mockResolvedValue(playlistWithNullDuration);
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist!.items[0].duration).toBe(30);
    });

    it('should use item.durationSeconds for image items regardless of Content.durationSeconds', async () => {
      const playlistWithImage = {
        ...mockPlaylist,
        items: [
          {
            contentId: 'content-1',
            durationSeconds: 15,
            position: 0,
            transition: TransitionType.Fade,
            transitionDurationMs: 500,
            content: { type: 'image', durationSeconds: null } as Content,
          } as PlaylistItem,
        ],
      } as Playlist;
      playlistRepository.findOne.mockResolvedValue(playlistWithImage);
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist!.items[0].duration).toBe(15);
    });

    it('should return null for currentPlaylist when no playlists exist', async () => {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: null,
        isDefault: true,
      });
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist).toBeNull();
    });

    it('should return empty array for scheduleEntries when no schedules exist', async () => {
      const state = await service.assembleState(orgId, screenId);
      expect(state.scheduleEntries).toEqual([]);
    });

    it('should return null for activeLiveStream when no stream is active', async () => {
      const state = await service.assembleState(orgId, screenId);
      expect(state.activeLiveStream).toBeNull();
    });

    it('should return fallbackPlaylist when default playlist is configured', async () => {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
        isDefault: true,
      });
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist).toBeNull();
      expect(state.fallbackPlaylist).toEqual({
        id: playlistId,
        name: 'Morning Playlist',
        items: [],
      });
    });

    it('should return null for fallbackPlaylist when none configured', async () => {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: null,
        isDefault: true,
      });
      const state = await service.assembleState(orgId, screenId);
      expect(state.fallbackPlaylist).toBeNull();
    });
  });

  describe('getRenderedState', () => {
    it('should return the state rendered through the protocol adapter', async () => {
      const result = await service.getRenderedState(orgId, screenId);

      expect(protocolAdapter.renderState).toHaveBeenCalledWith(
        expect.any(ScreenState),
      );
      expect(result).toEqual({
        screen: {
          id: screenId,
          name: 'Main Stage',
          organisationId: orgId,
          resolution: '1920x1080',
          location: 'Stage Left',
          groupId: null,
          gridRow: null,
          gridColumn: null,
        },
        currentPlaylist: {
          id: playlistId,
          name: 'Morning Playlist',
          items: [],
        },
        schedule: [],
        fallbackPlaylist: null,
        liveStream: null,
      });
    });
  });

  describe('subscribe', () => {
    it('should return an observable that emits events', async () => {
      const observable = service.subscribe(screenId);

      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.pushEvent(
        screenId,
        new ScreenEvent(ScreenEventType.PlaylistUpdate, { test: true }),
      );

      const msg = await eventPromise;
      expect(msg.type).toBe('state-change');
      expect(protocolAdapter.renderEvent).toHaveBeenCalled();
    });

    it('should reuse the same subject for the same screen', () => {
      const obs1 = service.subscribe(screenId);
      const obs2 = service.subscribe(screenId);

      // Both should work — they share the same underlying subject
      expect(obs1).toBeDefined();
      expect(obs2).toBeDefined();
    });
  });

  describe('pushEvent', () => {
    it('should push events to subscribed screens', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      const event = new ScreenEvent(ScreenEventType.ContentUpdate, {
        contentId: 'abc',
      });
      service.pushEvent(screenId, event);

      const msg = await eventPromise;
      expect(msg.data).toEqual({
        type: ScreenEventType.ContentUpdate,
        timestamp: '2026-03-29T00:00:00.000Z',
        data: { contentId: 'abc' },
      });
    });

    it('should be a no-op when no subscriber exists', () => {
      // Should not throw
      service.pushEvent(
        'non-existent-id',
        new ScreenEvent(ScreenEventType.PlaylistUpdate, {}),
      );
    });
  });

  describe('handleScheduleEntryChanged', () => {
    it('should send schedule_update with current playlist to connected screen', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent(screenId, orgId),
      );

      const msg = await eventPromise;
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledWith(screenId);
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.ScheduleUpdate,
          payload: expect.objectContaining({
            screenId,
            organisationId: orgId,
            currentPlaylist: { id: playlistId, name: 'Morning Playlist' },
            isDefault: false,
          }),
        }),
      );
      expect(msg.type).toBe('state-change');
    });

    it('should include fallback playlist when no schedule is active', async () => {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: mockPlaylist,
        isDefault: true,
      });

      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent(screenId, orgId),
      );

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            currentPlaylist: { id: playlistId, name: 'Morning Playlist' },
            isDefault: true,
          }),
        }),
      );
    });

    it('should include null playlist when no playlist is configured', async () => {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: null,
        isDefault: true,
      });

      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent(screenId, orgId),
      );

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            currentPlaylist: null,
            isDefault: true,
          }),
        }),
      );
    });

    it('should not send event if screen has no active SSE connection', async () => {
      // No subscribe() call — screen is not connected
      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent(screenId, orgId),
      );

      expect(scheduleService.getCurrentPlaylist).not.toHaveBeenCalled();
      expect(protocolAdapter.renderEvent).not.toHaveBeenCalled();
    });

    it('should only route event to the affected screen', async () => {
      const otherScreenId = '990e8400-e29b-41d4-a716-446655440000';

      // Subscribe both screens
      const obs1 = service.subscribe(screenId);
      service.subscribe(otherScreenId);

      const eventPromise = firstValueFrom(obs1.pipe(take(1)));

      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent(screenId, orgId),
      );

      const msg = await eventPromise;
      expect(msg.type).toBe('state-change');

      // getCurrentPlaylist should only be called once for the affected screen
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledTimes(1);
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledWith(screenId);
    });

    it('should still send event when getCurrentPlaylist throws', async () => {
      scheduleService.getCurrentPlaylist.mockRejectedValue(
        new Error('DB error'),
      );

      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent(screenId, orgId),
      );

      const msg = await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ScreenEventType.ScheduleUpdate,
          payload: expect.objectContaining({
            screenId,
            organisationId: orgId,
            currentPlaylist: null,
            isDefault: true,
          }),
        }),
      );
      expect(msg.type).toBe('state-change');
    });
  });

  describe('event handlers', () => {
    it('should push ScheduleUpdate on handleScheduleChanged', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handleScheduleChanged(
        new ScreenStateChangeEvent(screenId, orgId),
      );

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.ScheduleUpdate }),
      );
    });

    it('should push PlaylistUpdate on handlePlaylistChanged', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handlePlaylistChanged(
        new ScreenStateChangeEvent(screenId, orgId),
      );

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.PlaylistUpdate }),
      );
    });

    it('should push ContentUpdate on handleContentChanged', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handleContentChanged(new ScreenStateChangeEvent(screenId, orgId));

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.ContentUpdate }),
      );
    });

    it('should push LiveStreamStart on handleLiveStreamStarted', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handleLiveStreamStarted(
        new ScreenStateChangeEvent(screenId, orgId),
      );

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.LiveStreamStart }),
      );
    });

    it('should push LiveStreamStop on handleLiveStreamStopped', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handleLiveStreamStopped(
        new ScreenStateChangeEvent(screenId, orgId),
      );

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.LiveStreamStop }),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should complete all active subjects', () => {
      const observable = service.subscribe(screenId);
      const completeSpy = jest.fn();

      observable.subscribe({ complete: completeSpy });
      service.onModuleDestroy();

      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
