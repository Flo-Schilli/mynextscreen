import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { firstValueFrom, take } from 'rxjs';
import { ScreenStateService } from './screen-state.service';
import { ScreenService } from './screen.service';
import { ScheduleBoundaryService } from './schedule-boundary.service';
import {
  ScreenState,
  ScreenEvent,
  ScreenEventType,
  SCREEN_PROTOCOL_ADAPTER,
} from '../screen-protocol';
import type { ScreenProtocolAdapter } from '../screen-protocol';
import { ScreenStateChangeEvent } from './screen-state.event';
import { ScheduleEntryChangedEvent, ScheduleService } from '../schedule';
import { TransitionType } from '../playlist/transition-type.enum';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screenGroups,
  contents,
  playlists,
  playlistItems,
  slicedRenditions,
  liveStreams,
  liveStreamActivations,
  screens,
  type Screen,
} from '../db/schema';
import { LiveStreamStatus } from '../live-stream/live-stream-status.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScreenStateService', () => {
  let service: ScreenStateService;
  let db: DrizzleDB;
  let screenService: { findOne: jest.Mock };
  let protocolAdapter: jest.Mocked<ScreenProtocolAdapter>;
  let scheduleService: { getCurrentPlaylist: jest.Mock };
  let scheduleBoundaryService: {
    registerScreen: jest.Mock;
    unregisterScreen: jest.Mock;
  };

  let orgId: string;
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  let playlistId: string;

  /** Base screen object the (mocked) screenService.findOne returns. */
  function makeScreen(overrides: Partial<Screen> = {}): Screen {
    return {
      id: screenId,
      organisationId: orgId,
      name: 'Main Stage',
      resolution: '1920x1080',
      location: 'Stage Left',
      apiKeyHash: '$2b$10$hashedvalue',
      apiKeyFingerprint: null,
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

    // Seed a content + playlist that the (mocked) schedule service points at.
    await db
      .insert(contents)
      .values({
        organisationId: orgId,
        title: 'Clip',
        type: ContentType.Video,
        originalFilename: 'clip.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 1000,
        transcodingStatus: TranscodingStatus.Completed,
      })
      .returning();

    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Morning Playlist' })
      .returning();
    playlistId = playlist.id;

    screenService = {
      findOne: jest.fn().mockImplementation(async () => makeScreen()),
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
      getCurrentPlaylist: jest.fn().mockImplementation(async () => ({
        playlist: { id: playlistId, name: 'Morning Playlist' },
        isDefault: false,
      })),
    };

    scheduleBoundaryService = {
      registerScreen: jest.fn().mockResolvedValue(undefined),
      unregisterScreen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenStateService,
        { provide: ScreenService, useValue: screenService },
        { provide: SCREEN_PROTOCOL_ADAPTER, useValue: protocolAdapter },
        { provide: ScheduleService, useValue: scheduleService },
        { provide: ScheduleBoundaryService, useValue: scheduleBoundaryService },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();
    service = module.get<ScreenStateService>(ScreenStateService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  /** Seed one playlist item (with content) into the schedule's playlist. */
  async function seedItem(
    overrides: { type?: ContentType; durationSeconds?: number | null } = {},
    itemOverrides: Partial<{
      durationSeconds: number;
      transition: TransitionType;
      transitionDurationMs: number;
    }> = {},
  ): Promise<void> {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId: orgId,
        title: 'Item content',
        type: overrides.type ?? ContentType.Video,
        originalFilename: 'item.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 1000,
        durationSeconds: overrides.durationSeconds === undefined ? null : overrides.durationSeconds,
        transcodingStatus: TranscodingStatus.Completed,
      })
      .returning();
    await db.insert(playlistItems).values({
      playlistId,
      contentId: content.id,
      position: 0,
      durationSeconds: itemOverrides.durationSeconds ?? 30,
      transition: itemOverrides.transition ?? TransitionType.Fade,
      transitionDurationMs: itemOverrides.transitionDurationMs ?? 500,
    });
  }

  async function seedSplitGroup(): Promise<string> {
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId: orgId,
        name: 'Video Wall',
        mode: ScreenGroupMode.Split,
        gridRows: 1,
        gridColumns: 2,
      })
      .returning();
    return group.id;
  }

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
        showUnmuteButton: true,
        showDisconnectButton: true,
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
      await seedItem(
        { type: ContentType.Video },
        { transition: TransitionType.SlideLeft, transitionDurationMs: 1000 },
      );
      const state = await service.assembleState(orgId, screenId);
      const items = state.currentPlaylist!.items;
      expect(items).toHaveLength(1);
      expect(items[0].transition).toBe('slide-left');
      expect(items[0].transitionDurationMs).toBe(1000);
    });

    it('should use Content.durationSeconds for video items when available', async () => {
      await seedItem({ type: ContentType.Video, durationSeconds: 58 }, { durationSeconds: 30 });
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist!.items[0].duration).toBe(58);
    });

    it('should fall back to item.durationSeconds for video when Content.durationSeconds is null', async () => {
      await seedItem({ type: ContentType.Video, durationSeconds: null }, { durationSeconds: 30 });
      const state = await service.assembleState(orgId, screenId);
      expect(state.currentPlaylist!.items[0].duration).toBe(30);
    });

    it('should use item.durationSeconds for image items regardless of Content.durationSeconds', async () => {
      await seedItem({ type: ContentType.Image, durationSeconds: 99 }, { durationSeconds: 15 });
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

    it('should return an active live stream when one is activated for the screen', async () => {
      const [stream] = await db
        .insert(liveStreams)
        .values({
          organisationId: orgId,
          name: 'Stage Cam',
          sourceUrl: 'rtmp://example/live',
          status: LiveStreamStatus.Active,
        })
        .returning();
      await db.insert(liveStreamActivations).values({ streamId: stream.id, screenId });

      const state = await service.assembleState(orgId, screenId);
      expect(state.activeLiveStream).toEqual({
        id: stream.id,
        streamUrl: `/api/live-streams/${stream.id}/hls/index.m3u8`,
        startedAt: expect.any(String),
      });
    });

    it('should return fallbackPlaylist when default playlist is configured', async () => {
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: playlistId, name: 'Morning Playlist' },
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

    describe('split-mode URL substitution', () => {
      let groupId: string;

      beforeEach(async () => {
        groupId = await seedSplitGroup();
        // Insert a real screen row so sliced_renditions FK (screen_id) holds.
        await db.insert(screens).values({
          id: screenId,
          organisationId: orgId,
          name: 'Main Stage',
          resolution: '1920x1080',
          location: 'Stage Left',
          apiKeyHash: '$2b$10$hashedvalue',
          apiKeyFingerprint: null,
          groupId,
          gridRow: 0,
          gridColumn: 1,
        });
        screenService.findOne.mockImplementation(async () =>
          makeScreen({ groupId, gridRow: 0, gridColumn: 1 }),
        );
        await seedItem({ type: ContentType.Video });
      });

      it('should substitute sliced rendition URL when rendition exists', async () => {
        const [item] = await db.select().from(playlistItems);
        await db.insert(slicedRenditions).values({
          organisationId: orgId,
          groupId,
          screenId,
          contentItemId: item.contentId,
          filePath: '/data/slices/x.mp4',
          sourceHash: 'hash',
        });

        const state = await service.assembleState(orgId, screenId);
        expect(state.currentPlaylist!.items[0].contentUrl).toBe(
          `/api/media/slices/${groupId}/${screenId}/${item.contentId}`,
        );
      });

      it('should fall back to empty contentUrl when no rendition exists yet', async () => {
        const state = await service.assembleState(orgId, screenId);
        expect(state.currentPlaylist!.items[0].contentUrl).toBe('');
      });

      it('should not substitute URLs for mirror-mode groups', async () => {
        await db
          .update(screenGroups)
          .set({ mode: ScreenGroupMode.Mirror, gridRows: null, gridColumns: null })
          .where(eq(screenGroups.id, groupId));

        const state = await service.assembleState(orgId, screenId);
        expect(state.currentPlaylist!.items[0].contentUrl).toBe('');
      });

      it('should not substitute URLs for ungrouped screens', async () => {
        screenService.findOne.mockImplementation(async () => makeScreen());

        const state = await service.assembleState(orgId, screenId);
        expect(state.currentPlaylist!.items[0].contentUrl).toBe('');
      });

      it('should substitute URLs in fallback playlist for split-mode', async () => {
        const [item] = await db.select().from(playlistItems);
        scheduleService.getCurrentPlaylist.mockResolvedValue({
          playlist: { id: playlistId, name: 'Morning Playlist' },
          isDefault: true,
        });
        await db.insert(slicedRenditions).values({
          organisationId: orgId,
          groupId,
          screenId,
          contentItemId: item.contentId,
          filePath: '/data/slices/y.mp4',
          sourceHash: 'hash',
        });

        const state = await service.assembleState(orgId, screenId);
        expect(state.fallbackPlaylist!.items[0].contentUrl).toBe(
          `/api/media/slices/${groupId}/${screenId}/${item.contentId}`,
        );
      });
    });
  });

  describe('getRenderedState', () => {
    it('should return the state rendered through the protocol adapter', async () => {
      const result = await service.getRenderedState(orgId, screenId);

      expect(protocolAdapter.renderState).toHaveBeenCalledWith(expect.any(ScreenState));
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
          showUnmuteButton: true,
          showDisconnectButton: true,
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

      service.pushEvent(screenId, new ScreenEvent(ScreenEventType.PlaylistUpdate, { test: true }));

      const msg = await eventPromise;
      expect(msg.type).toBe('state-change');
      expect(protocolAdapter.renderEvent).toHaveBeenCalled();
    });

    it('should reuse the same subject for the same screen', () => {
      const obs1 = service.subscribe(screenId);
      const obs2 = service.subscribe(screenId);

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
      service.pushEvent('non-existent-id', new ScreenEvent(ScreenEventType.PlaylistUpdate, {}));
    });
  });

  describe('handleScheduleEntryChanged', () => {
    it('should send schedule_update with current playlist to connected screen', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

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
        playlist: { id: playlistId, name: 'Morning Playlist' },
        isDefault: true,
      });

      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

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

      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

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
      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

      expect(scheduleService.getCurrentPlaylist).not.toHaveBeenCalled();
      expect(protocolAdapter.renderEvent).not.toHaveBeenCalled();
    });

    it('should only route event to the affected screen', async () => {
      const otherScreenId = '990e8400-e29b-41d4-a716-446655440000';

      const obs1 = service.subscribe(screenId);
      service.subscribe(otherScreenId);

      const eventPromise = firstValueFrom(obs1.pipe(take(1)));

      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

      const msg = await eventPromise;
      expect(msg.type).toBe('state-change');

      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledTimes(1);
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledWith(screenId);
    });

    it('should still send event when getCurrentPlaylist throws', async () => {
      scheduleService.getCurrentPlaylist.mockRejectedValue(new Error('DB error'));

      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

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

      service.handleScheduleChanged(new ScreenStateChangeEvent(screenId, orgId));

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.ScheduleUpdate }),
      );
    });

    it('should push PlaylistUpdate on handlePlaylistChanged', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handlePlaylistChanged(new ScreenStateChangeEvent(screenId, orgId));

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

      service.handleLiveStreamStarted(new ScreenStateChangeEvent(screenId, orgId));

      await eventPromise;
      expect(protocolAdapter.renderEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: ScreenEventType.LiveStreamStart }),
      );
    });

    it('should push LiveStreamStop on handleLiveStreamStopped', async () => {
      const observable = service.subscribe(screenId);
      const eventPromise = firstValueFrom(observable.pipe(take(1)));

      service.handleLiveStreamStopped(new ScreenStateChangeEvent(screenId, orgId));

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
