import { JsonProtocolAdapter } from './json-protocol-adapter';
import {
  ScreenState,
  ScreenInfo,
  Playlist,
  PlaylistItem,
  ScheduleEntry,
  LiveStream,
} from './screen-state.model';
import { ScreenEvent } from './screen-event.model';
import { ScreenEventType } from './screen-event-type.enum';

describe('JsonProtocolAdapter', () => {
  let adapter: JsonProtocolAdapter;

  const screenInfo: ScreenInfo = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Lobby Display',
    organisationId: '660e8400-e29b-41d4-a716-446655440000',
    resolution: '1920x1080',
    location: 'Main Lobby',
    groupId: null,
    gridRow: null,
    gridColumn: null,
  };

  const playlistItem: PlaylistItem = {
    contentId: '770e8400-e29b-41d4-a716-446655440000',
    contentUrl: '',
    duration: 30,
    type: 'video',
    order: 0,
    transition: 'fade',
    transitionDurationMs: 500,
  };

  const playlistItemImage: PlaylistItem = {
    contentId: '880e8400-e29b-41d4-a716-446655440001',
    contentUrl: '',
    duration: 10,
    type: 'image',
    order: 1,
    transition: 'slide-left',
    transitionDurationMs: 1000,
  };

  const playlist: Playlist = {
    id: '880e8400-e29b-41d4-a716-446655440000',
    name: 'Morning Rotation',
    items: [playlistItem, playlistItemImage],
  };

  const fallbackPlaylist: Playlist = {
    id: '990e8400-e29b-41d4-a716-446655440099',
    name: 'Fallback',
    items: [playlistItem],
  };

  const scheduleEntry: ScheduleEntry = {
    id: '990e8400-e29b-41d4-a716-446655440000',
    playlistId: playlist.id,
    startTime: '2026-03-29T08:00:00Z',
    endTime: '2026-03-29T12:00:00Z',
  };

  const recurringScheduleEntry: ScheduleEntry = {
    id: 'aa0e8400-e29b-41d4-a716-446655440099',
    playlistId: playlist.id,
    startTime: '2026-03-29T08:00:00Z',
    endTime: '2026-03-29T12:00:00Z',
    recurrenceRule: 'RRULE:FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
  };

  const liveStream: LiveStream = {
    id: 'aa0e8400-e29b-41d4-a716-446655440000',
    streamUrl: 'rtmp://example.com/live',
    startedAt: '2026-03-29T10:00:00Z',
  };

  beforeEach(() => {
    adapter = new JsonProtocolAdapter();
  });

  describe('renderState', () => {
    it('should render full state with all fields populated', () => {
      const state = new ScreenState(
        screenInfo,
        playlist,
        [scheduleEntry],
        liveStream,
        fallbackPlaylist,
      );

      const result = adapter.renderState(state) as Record<string, unknown>;

      expect(result.screen).toEqual(screenInfo);
      expect(result.currentPlaylist).toEqual({
        id: playlist.id,
        name: playlist.name,
        items: [
          {
            url: `/api/media/${screenInfo.organisationId}/${playlistItem.contentId}`,
            duration: 30,
            type: 'video',
            transition: 'fade',
            transitionDurationMs: 500,
          },
          {
            url: `/api/media/${screenInfo.organisationId}/${playlistItemImage.contentId}`,
            duration: 10,
            type: 'image',
            transition: 'slide-left',
            transitionDurationMs: 1000,
          },
        ],
      });
      expect(result.schedule).toEqual([
        {
          id: scheduleEntry.id,
          playlistId: scheduleEntry.playlistId,
          startTime: scheduleEntry.startTime,
          endTime: scheduleEntry.endTime,
          recurrenceRule: null,
        },
      ]);
      expect(result.fallbackPlaylist).toEqual({
        id: fallbackPlaylist.id,
        name: fallbackPlaylist.name,
        items: [
          {
            url: `/api/media/${screenInfo.organisationId}/${playlistItem.contentId}`,
            duration: 30,
            type: 'video',
            transition: 'fade',
            transitionDurationMs: 500,
          },
        ],
      });
      expect(result.liveStream).toEqual({
        id: liveStream.id,
        streamUrl: liveStream.streamUrl,
        startedAt: liveStream.startedAt,
      });
    });

    it('should render content URLs as absolute paths to media endpoint', () => {
      const state = new ScreenState(screenInfo, playlist, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;
      const rendered = result.currentPlaylist as Record<string, unknown>;
      const items = rendered.items as Array<Record<string, unknown>>;

      expect(items[0].url).toBe(
        `/api/media/${screenInfo.organisationId}/${playlistItem.contentId}`,
      );
      expect(items[1].url).toBe(
        `/api/media/${screenInfo.organisationId}/${playlistItemImage.contentId}`,
      );
    });

    it('should render playlist items with url, duration, and type', () => {
      const state = new ScreenState(screenInfo, playlist, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;
      const rendered = result.currentPlaylist as Record<string, unknown>;
      const items = rendered.items as Array<Record<string, unknown>>;

      for (const item of items) {
        expect(item).toHaveProperty('url');
        expect(item).toHaveProperty('duration');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('transition');
        expect(item).toHaveProperty('transitionDurationMs');
        expect(item).not.toHaveProperty('contentId');
        expect(item).not.toHaveProperty('contentUrl');
        expect(item).not.toHaveProperty('order');
      }
    });

    it('should render null currentPlaylist when absent', () => {
      const state = new ScreenState(screenInfo, null, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;

      expect(result.currentPlaylist).toBeNull();
    });

    it('should render null liveStream when absent', () => {
      const state = new ScreenState(screenInfo, null, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;

      expect(result.liveStream).toBeNull();
    });

    it('should render null fallbackPlaylist when absent', () => {
      const state = new ScreenState(screenInfo, playlist, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;

      expect(result.fallbackPlaylist).toBeNull();
    });

    it('should render empty schedule as empty array', () => {
      const state = new ScreenState(screenInfo, null, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;

      expect(result.schedule).toEqual([]);
    });

    it('should use pre-set contentUrl when non-empty (split-mode sliced URL)', () => {
      const slicedItem: PlaylistItem = {
        ...playlistItem,
        contentUrl: '/api/media/slices/group-1/screen-1/content-1',
      };
      const slicedPlaylist: Playlist = {
        id: playlist.id,
        name: playlist.name,
        items: [slicedItem],
      };
      const state = new ScreenState(screenInfo, slicedPlaylist, [], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;
      const rendered = result.currentPlaylist as Record<string, unknown>;
      const items = rendered.items as Array<Record<string, unknown>>;

      expect(items[0].url).toBe('/api/media/slices/group-1/screen-1/content-1');
    });

    it('should include recurrenceRule in schedule entries when present', () => {
      const state = new ScreenState(screenInfo, null, [recurringScheduleEntry], null, null);

      const result = adapter.renderState(state) as Record<string, unknown>;
      const schedule = result.schedule as Array<Record<string, unknown>>;

      expect(schedule[0].recurrenceRule).toBe('RRULE:FREQ=DAILY;BYHOUR=8;BYMINUTE=0');
    });
  });

  describe('renderEvent', () => {
    it('should render event with type, timestamp, and data', () => {
      const event = new ScreenEvent(ScreenEventType.ScheduleUpdate, {
        scheduleId: '123',
      });

      const result = adapter.renderEvent(event) as Record<string, unknown>;

      expect(result.type).toBe('schedule_update');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
      expect(result.data).toEqual({ scheduleId: '123' });
    });

    it('should render timestamp as ISO 8601 string', () => {
      const before = new Date().toISOString();
      const event = new ScreenEvent(ScreenEventType.PlaylistUpdate, {
        playlistId: '456',
      });

      const result = adapter.renderEvent(event) as Record<string, unknown>;
      const after = new Date().toISOString();

      expect((result.timestamp as string) >= before).toBe(true);
      expect((result.timestamp as string) <= after).toBe(true);
    });

    it('should render playlist_update event', () => {
      const event = new ScreenEvent(ScreenEventType.PlaylistUpdate, {
        playlistId: '456',
        items: [],
      });

      const result = adapter.renderEvent(event) as Record<string, unknown>;

      expect(result.type).toBe('playlist_update');
      expect(result.data).toEqual({ playlistId: '456', items: [] });
    });

    it('should render content_update event', () => {
      const event = new ScreenEvent(ScreenEventType.ContentUpdate, {
        contentId: '789',
        contentUrl: '/api/media/org1/789',
      });

      const result = adapter.renderEvent(event) as Record<string, unknown>;

      expect(result.type).toBe('content_update');
      expect(result.data).toEqual({
        contentId: '789',
        contentUrl: '/api/media/org1/789',
      });
    });

    it('should render live_stream_start event', () => {
      const event = new ScreenEvent(ScreenEventType.LiveStreamStart, {
        streamUrl: 'rtmp://example.com/live',
      });

      const result = adapter.renderEvent(event) as Record<string, unknown>;

      expect(result.type).toBe('live_stream_start');
      expect(result.data).toEqual({
        streamUrl: 'rtmp://example.com/live',
      });
    });

    it('should render live_stream_stop event', () => {
      const event = new ScreenEvent(ScreenEventType.LiveStreamStop, {
        reason: 'stream_ended',
      });

      const result = adapter.renderEvent(event) as Record<string, unknown>;

      expect(result.type).toBe('live_stream_stop');
      expect(result.data).toEqual({ reason: 'stream_ended' });
    });
  });
});
