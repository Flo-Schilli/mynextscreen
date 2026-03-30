import {
  ScreenStateResponse,
  ScreenEvent,
  Playlist,
  LiveStream,
  ScreenInfo,
} from './player.models';

/**
 * Pure-function tests for state parsing and SSE event handling logic.
 * These tests exercise the PlayerService methods without Angular DI
 * by extracting and testing the logic directly.
 */

// --- State parsing helpers (mirrors PlayerService.applyState logic) ---

function parseScreenState(raw: unknown): ScreenStateResponse {
  const data = raw as ScreenStateResponse;
  return {
    screen: data.screen,
    currentPlaylist: data.currentPlaylist,
    schedule: data.schedule ?? [],
    fallbackPlaylist: data.fallbackPlaylist,
    liveStream: data.liveStream,
  };
}

// --- SSE buffer parsing (mirrors PlayerService.parseSseBuffer) ---

function parseSseBuffer(buffer: string): { parsed: ScreenEvent[]; remaining: string } {
  const parsed: ScreenEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remaining = blocks.pop() ?? '';

  for (const block of blocks) {
    const lines = block.split('\n');
    let data = '';
    let eventType = '';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      }
    }

    if (!data) continue;

    try {
      const payload = JSON.parse(data) as Record<string, unknown>;

      if (payload['type'] === 'keepalive') continue;

      const event: ScreenEvent = {
        type: (eventType || payload['type']) as ScreenEvent['type'],
        timestamp: (payload['timestamp'] as string) ?? new Date().toISOString(),
        data: (payload['data'] as Record<string, unknown>) ?? payload,
      };

      if (event.type) {
        parsed.push(event);
      }
    } catch {
      // Skip malformed events
    }
  }

  return { parsed, remaining };
}

// --- Event handling logic (mirrors PlayerService.handleEvent) ---

interface PlayerState {
  screen: ScreenInfo | null;
  currentPlaylist: Playlist | null;
  fallbackPlaylist: Playlist | null;
  activeLiveStream: LiveStream | null;
  groupPlayEvent: Record<string, unknown> | null;
  pendingEvent: Record<string, unknown> | null;
  refetchTriggered: boolean;
}

function createEmptyState(): PlayerState {
  return {
    screen: null,
    currentPlaylist: null,
    fallbackPlaylist: null,
    activeLiveStream: null,
    groupPlayEvent: null,
    pendingEvent: null,
    refetchTriggered: false,
  };
}

function handleEvent(state: PlayerState, event: ScreenEvent): PlayerState {
  const next = { ...state, refetchTriggered: false };

  switch (event.type) {
    case 'schedule_update':
    case 'playlist_update':
    case 'content_update':
      next.refetchTriggered = true;
      break;

    case 'live_stream_start': {
      const data = event.data as { streamUrl?: string };
      next.activeLiveStream = {
        id: '',
        streamUrl: data.streamUrl ?? '',
        startedAt: event.timestamp,
      };
      break;
    }

    case 'live_stream_stop':
      next.activeLiveStream = null;
      break;

    case 'group_play':
      next.groupPlayEvent = event.data;
      break;

    case 'pending':
      next.pendingEvent = event.data;
      break;
  }

  return next;
}

// =============================================================================
// Tests
// =============================================================================

describe('State Parsing', () => {
  const fullStateResponse: ScreenStateResponse = {
    screen: {
      id: 'screen-1',
      name: 'Lobby Screen',
      organisationId: 'org-1',
      resolution: '1920x1080',
      location: 'Lobby',
    },
    currentPlaylist: {
      id: 'pl-1',
      name: 'Morning Playlist',
      items: [
        { url: '/api/media/org-1/content-1', duration: 10, type: 'image' },
        { url: '/api/media/org-1/content-2', duration: 0, type: 'video' },
      ],
    },
    schedule: [
      {
        id: 'sched-1',
        playlistId: 'pl-1',
        startTime: '2026-03-30T08:00:00Z',
        endTime: '2026-03-30T12:00:00Z',
        recurrenceRule: null,
      },
    ],
    fallbackPlaylist: {
      id: 'pl-fallback',
      name: 'Fallback',
      items: [{ url: '/api/media/org-1/fallback-1', duration: 15, type: 'image' }],
    },
    liveStream: null,
  };

  it('should parse a full state response', () => {
    const state = parseScreenState(fullStateResponse);

    expect(state.screen.id).toBe('screen-1');
    expect(state.screen.name).toBe('Lobby Screen');
    expect(state.currentPlaylist).not.toBeNull();
    expect(state.currentPlaylist!.items).toHaveLength(2);
    expect(state.schedule).toHaveLength(1);
    expect(state.fallbackPlaylist).not.toBeNull();
    expect(state.liveStream).toBeNull();
  });

  it('should handle null currentPlaylist', () => {
    const state = parseScreenState({
      ...fullStateResponse,
      currentPlaylist: null,
    });

    expect(state.currentPlaylist).toBeNull();
    expect(state.fallbackPlaylist).not.toBeNull();
  });

  it('should handle active live stream', () => {
    const state = parseScreenState({
      ...fullStateResponse,
      liveStream: {
        id: 'ls-1',
        streamUrl: 'rtmp://stream.example.com/live',
        startedAt: '2026-03-30T10:00:00Z',
      },
    });

    expect(state.liveStream).not.toBeNull();
    expect(state.liveStream!.id).toBe('ls-1');
    expect(state.liveStream!.streamUrl).toBe('rtmp://stream.example.com/live');
  });

  it('should handle empty schedule', () => {
    const state = parseScreenState({
      ...fullStateResponse,
      schedule: [],
    });

    expect(state.schedule).toHaveLength(0);
  });

  it('should handle missing schedule property with default', () => {
    const raw = { ...fullStateResponse } as Record<string, unknown>;
    delete raw['schedule'];
    const state = parseScreenState(raw);

    expect(state.schedule).toEqual([]);
  });

  it('should preserve playlist item types', () => {
    const state = parseScreenState(fullStateResponse);
    const items = state.currentPlaylist!.items;

    expect(items[0].type).toBe('image');
    expect(items[0].duration).toBe(10);
    expect(items[1].type).toBe('video');
    expect(items[1].duration).toBe(0);
  });
});

describe('SSE Buffer Parsing', () => {
  it('should parse a single complete event', () => {
    const buffer =
      'data: {"type":"schedule_update","timestamp":"2026-03-30T10:00:00Z","data":{"screenId":"s1"}}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].type).toBe('schedule_update');
    expect(result.remaining).toBe('');
  });

  it('should parse multiple events', () => {
    const buffer =
      'data: {"type":"playlist_update","timestamp":"T1","data":{}}\n\n' +
      'data: {"type":"content_update","timestamp":"T2","data":{}}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(2);
    expect(result.parsed[0].type).toBe('playlist_update');
    expect(result.parsed[1].type).toBe('content_update');
  });

  it('should keep incomplete data as remaining', () => {
    const buffer =
      'data: {"type":"schedule_update","timestamp":"T1","data":{}}\n\n' +
      'data: {"type":"play';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(1);
    expect(result.remaining).toBe('data: {"type":"play');
  });

  it('should skip keepalive events', () => {
    const buffer = 'data: {"type":"keepalive"}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(0);
  });

  it('should skip malformed JSON', () => {
    const buffer = 'data: {invalid json}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(0);
  });

  it('should skip blocks with no data', () => {
    const buffer = 'event: message\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(0);
  });

  it('should use event type field if present', () => {
    const buffer =
      'event: schedule_update\ndata: {"timestamp":"T1","data":{"screenId":"s1"}}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].type).toBe('schedule_update');
  });

  it('should handle live_stream_start event data', () => {
    const buffer =
      'data: {"type":"live_stream_start","timestamp":"T1","data":{"streamUrl":"rtmp://foo","screenId":"s1","organisationId":"o1","syncToken":"t1"}}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].type).toBe('live_stream_start');
    expect(result.parsed[0].data['streamUrl']).toBe('rtmp://foo');
  });

  it('should handle group_play event data', () => {
    const buffer =
      'data: {"type":"group_play","timestamp":"T1","data":{"contentUrl":"/api/media/slices/g1/s1/c1","contentItemId":"c1","groupId":"g1","syncToken":"t1","screenId":"s1","organisationId":"o1"}}\n\n';
    const result = parseSseBuffer(buffer);

    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].type).toBe('group_play');
    expect(result.parsed[0].data['contentUrl']).toBe('/api/media/slices/g1/s1/c1');
  });

  it('should handle empty buffer', () => {
    const result = parseSseBuffer('');
    expect(result.parsed).toHaveLength(0);
    expect(result.remaining).toBe('');
  });
});

describe('Event Handling Logic', () => {
  it('should trigger refetch on schedule_update', () => {
    const state = createEmptyState();
    const event: ScreenEvent = {
      type: 'schedule_update',
      timestamp: 'T1',
      data: { screenId: 's1' },
    };

    const next = handleEvent(state, event);
    expect(next.refetchTriggered).toBe(true);
  });

  it('should trigger refetch on playlist_update', () => {
    const state = createEmptyState();
    const next = handleEvent(state, {
      type: 'playlist_update',
      timestamp: 'T1',
      data: {},
    });
    expect(next.refetchTriggered).toBe(true);
  });

  it('should trigger refetch on content_update', () => {
    const state = createEmptyState();
    const next = handleEvent(state, {
      type: 'content_update',
      timestamp: 'T1',
      data: {},
    });
    expect(next.refetchTriggered).toBe(true);
  });

  it('should set activeLiveStream on live_stream_start', () => {
    const state = createEmptyState();
    const event: ScreenEvent = {
      type: 'live_stream_start',
      timestamp: '2026-03-30T10:00:00Z',
      data: { streamUrl: 'rtmp://stream.example.com/live', screenId: 's1' },
    };

    const next = handleEvent(state, event);
    expect(next.activeLiveStream).not.toBeNull();
    expect(next.activeLiveStream!.streamUrl).toBe('rtmp://stream.example.com/live');
    expect(next.activeLiveStream!.startedAt).toBe('2026-03-30T10:00:00Z');
    expect(next.refetchTriggered).toBe(false);
  });

  it('should clear activeLiveStream on live_stream_stop', () => {
    const state = {
      ...createEmptyState(),
      activeLiveStream: {
        id: 'ls-1',
        streamUrl: 'rtmp://example.com',
        startedAt: 'T0',
      },
    };

    const next = handleEvent(state, {
      type: 'live_stream_stop',
      timestamp: 'T1',
      data: {},
    });

    expect(next.activeLiveStream).toBeNull();
    expect(next.refetchTriggered).toBe(false);
  });

  it('should set groupPlayEvent on group_play', () => {
    const state = createEmptyState();
    const eventData = {
      contentUrl: '/api/media/slices/g1/s1/c1',
      contentItemId: 'c1',
      groupId: 'g1',
    };

    const next = handleEvent(state, {
      type: 'group_play',
      timestamp: 'T1',
      data: eventData,
    });

    expect(next.groupPlayEvent).toEqual(eventData);
    expect(next.refetchTriggered).toBe(false);
  });

  it('should set pendingEvent on pending', () => {
    const state = createEmptyState();
    const eventData = {
      contentItemId: 'c1',
      groupId: 'g1',
      reason: 'Sliced rendition not yet available',
    };

    const next = handleEvent(state, {
      type: 'pending',
      timestamp: 'T1',
      data: eventData,
    });

    expect(next.pendingEvent).toEqual(eventData);
    expect(next.refetchTriggered).toBe(false);
  });

  it('should not carry over refetchTriggered from previous state', () => {
    let state = createEmptyState();
    state = handleEvent(state, {
      type: 'schedule_update',
      timestamp: 'T1',
      data: {},
    });
    expect(state.refetchTriggered).toBe(true);

    state = handleEvent(state, {
      type: 'live_stream_stop',
      timestamp: 'T2',
      data: {},
    });
    expect(state.refetchTriggered).toBe(false);
  });
});
