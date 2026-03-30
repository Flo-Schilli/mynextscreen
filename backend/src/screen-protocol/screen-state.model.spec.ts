import {
  ScreenState,
  ScreenInfo,
  Playlist,
  PlaylistItem,
  ScheduleEntry,
  LiveStream,
} from './screen-state.model';

describe('ScreenState', () => {
  const screenInfo: ScreenInfo = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Lobby Display',
    organisationId: '660e8400-e29b-41d4-a716-446655440000',
    resolution: '1920x1080',
    location: 'Main Lobby',
  };

  const playlistItem: PlaylistItem = {
    contentId: '770e8400-e29b-41d4-a716-446655440000',
    contentUrl: '/api/media/660e8400/770e8400.mp4',
    duration: 30,
    type: 'video',
    order: 0,
  };

  const playlist: Playlist = {
    id: '880e8400-e29b-41d4-a716-446655440000',
    name: 'Morning Rotation',
    items: [playlistItem],
  };

  const scheduleEntry: ScheduleEntry = {
    id: '990e8400-e29b-41d4-a716-446655440000',
    playlistId: playlist.id,
    startTime: '2026-03-29T08:00:00Z',
    endTime: '2026-03-29T12:00:00Z',
  };

  const liveStream: LiveStream = {
    id: 'aa0e8400-e29b-41d4-a716-446655440000',
    streamUrl: 'rtmp://example.com/live',
    startedAt: '2026-03-29T10:00:00Z',
  };

  it('should construct with all fields populated', () => {
    const state = new ScreenState(
      screenInfo,
      playlist,
      [scheduleEntry],
      liveStream,
      playlist,
    );

    expect(state.screen).toBe(screenInfo);
    expect(state.currentPlaylist).toBe(playlist);
    expect(state.scheduleEntries).toEqual([scheduleEntry]);
    expect(state.activeLiveStream).toBe(liveStream);
    expect(state.fallbackPlaylist).toBe(playlist);
  });

  it('should allow null for currentPlaylist', () => {
    const state = new ScreenState(
      screenInfo,
      null,
      [scheduleEntry],
      null,
      playlist,
    );

    expect(state.currentPlaylist).toBeNull();
  });

  it('should allow null for activeLiveStream', () => {
    const state = new ScreenState(
      screenInfo,
      playlist,
      [scheduleEntry],
      null,
      playlist,
    );

    expect(state.activeLiveStream).toBeNull();
  });

  it('should allow null for fallbackPlaylist', () => {
    const state = new ScreenState(screenInfo, playlist, [], null, null);

    expect(state.fallbackPlaylist).toBeNull();
  });

  it('should allow empty schedule entries', () => {
    const state = new ScreenState(screenInfo, null, [], null, null);

    expect(state.scheduleEntries).toEqual([]);
  });

  it('should support schedule entries with recurrence rules', () => {
    const recurring: ScheduleEntry = {
      ...scheduleEntry,
      recurrenceRule: 'RRULE:FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
    };
    const state = new ScreenState(
      screenInfo,
      playlist,
      [recurring],
      null,
      null,
    );

    expect(state.scheduleEntries[0].recurrenceRule).toBe(
      'RRULE:FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
    );
  });
});
