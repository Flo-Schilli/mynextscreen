import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardSseService, DashboardEvent } from './dashboard-sse.service';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const encoder = new TextEncoder();

/**
 * Builds a Response whose body is a ReadableStream that yields the provided
 * SSE chunks in order, then closes. Each chunk is a raw SSE text fragment.
 */
function streamingResponse(chunks: readonly string[], ok = true, status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(ok ? body : null, { status }) as Response;
}

describe('DashboardSseService', () => {
  let service: DashboardSseService;
  let getToken: ReturnType<typeof vi.fn>;
  let selectedOrgId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getToken = vi.fn(() => 'tok');
    selectedOrgId = vi.fn(() => 'org1');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DashboardSseService,
        { provide: AuthService, useValue: { getToken } },
        { provide: OrganisationStateService, useValue: { selectedOrgId } },
      ],
    });

    service = TestBed.inject(DashboardSseService);
  });

  afterEach(() => {
    service.disconnect();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('parseSseBuffer', () => {
    it('parses a single well-formed SSE frame into a typed event', () => {
      // Arrange
      const buffer =
        'event: screen.online\ndata: {"type":"screen.online","timestamp":"2026-01-01T00:00:00Z","data":{"screenId":"s1"}}\n\n';

      // Act
      const { parsed, remaining } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual<DashboardEvent>({
        type: 'screen.online',
        timestamp: '2026-01-01T00:00:00Z',
        data: { screenId: 's1' },
      });
      expect(remaining).toBe('');
    });

    it('parses multiple frames contained in one buffer', () => {
      // Arrange
      const buffer =
        'data: {"type":"screen.online","data":{}}\n\n' +
        'data: {"type":"screen.offline","data":{}}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed.map((event) => event.type)).toEqual(['screen.online', 'screen.offline']);
    });

    it('returns an incomplete trailing frame as remaining buffer', () => {
      // Arrange
      const buffer = 'data: {"type":"screen.online","data":{}}\n\n' + 'data: {"type":"schedule.up';

      // Act
      const { parsed, remaining } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(1);
      expect(remaining).toBe('data: {"type":"schedule.up');
    });

    it('falls back to the event-line type when payload omits type', () => {
      // Arrange
      const buffer = 'event: notification.new\ndata: {"data":{"id":"n1"}}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed[0].type).toBe('notification.new');
      expect(parsed[0].data).toEqual({ id: 'n1' });
    });

    it('uses the full payload as data when no nested data field exists', () => {
      // Arrange
      const buffer = 'data: {"type":"schedule.updated","scheduleId":"sc1"}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed[0].type).toBe('schedule.updated');
      expect(parsed[0].data).toEqual({ type: 'schedule.updated', scheduleId: 'sc1' });
    });

    it('generates a timestamp when the payload omits one', () => {
      // Arrange
      const buffer = 'data: {"type":"screen.online","data":{}}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(typeof parsed[0].timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(parsed[0].timestamp))).toBe(false);
    });

    it('skips keepalive frames identified by event line', () => {
      // Arrange
      const buffer = 'event: keepalive\ndata: ping\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(0);
    });

    it('skips keepalive frames identified by payload type', () => {
      // Arrange
      const buffer = 'data: {"type":"keepalive"}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(0);
    });

    it('skips frames with empty data', () => {
      // Arrange
      const buffer = 'event: screen.online\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(0);
    });

    it('skips malformed JSON without throwing', () => {
      // Arrange
      const buffer = 'data: {not valid json}\n\n' + 'data: {"type":"screen.online","data":{}}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert — only the valid frame survives
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('screen.online');
    });

    it('skips a parsed payload that has no resolvable type', () => {
      // Arrange — no payload type and no event line
      const buffer = 'data: {"data":{"foo":"bar"}}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(0);
    });

    it('concatenates multiple data lines within a single frame', () => {
      // Arrange
      const buffer = 'data: {"type":"screen.online",\ndata: "data":{}}\n\n';

      // Act
      const { parsed } = service.parseSseBuffer(buffer);

      // Assert
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('screen.online');
    });
  });

  describe('connect / event routing', () => {
    function emitFromStream(...frames: string[]): void {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(streamingResponse(frames))),
      );
    }

    it('does not connect when no token is available', () => {
      // Arrange
      getToken.mockReturnValue(null);
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      // Act
      service.connect();

      // Assert
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not connect when no organisation is selected', () => {
      // Arrange
      selectedOrgId.mockReturnValue(null);
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      // Act
      service.connect();

      // Assert
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('issues a fetch with auth and organisation headers', async () => {
      // Arrange
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([])));
      vi.stubGlobal('fetch', fetchSpy);

      // Act
      service.connect();
      await Promise.resolve();

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('/api/dashboard/events');
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer tok');
      expect(headers['Accept']).toBe('text/event-stream');
      expect(headers['X-Organisation-Id']).toBe('org1');
    });

    it('routes a screen.online frame to the screenOnline$ subject', async () => {
      // Arrange
      emitFromStream('data: {"type":"screen.online","data":{"screenId":"s1"}}\n\n');
      const received = firstValueFrom(service.screenOnline$);

      // Act
      service.connect();
      const event = await received;

      // Assert
      expect(event.type).toBe('screen.online');
      expect(event.data).toEqual({ screenId: 's1' });
    });

    it('routes each event type to its dedicated subject', async () => {
      // Arrange
      const cases: readonly { type: string; subject: typeof service.screenOnline$ }[] = [
        { type: 'screen.offline', subject: service.screenOffline$ },
        { type: 'schedule.updated', subject: service.scheduleUpdated$ },
        { type: 'transcoding.progress', subject: service.transcodingProgress$ },
        { type: 'transcoding.complete', subject: service.transcodingComplete$ },
        { type: 'transcoding.failed', subject: service.transcodingFailed$ },
        { type: 'notification.new', subject: service.notificationNew$ },
        { type: 'live-stream-health', subject: service.liveStreamHealth$ },
      ];

      emitFromStream(...cases.map(({ type }) => `data: {"type":"${type}","data":{}}\n\n`));
      const received = Promise.all(cases.map(({ subject }) => firstValueFrom(subject)));

      // Act
      service.connect();
      const events = await received;

      // Assert
      expect(events.map((event) => event.type)).toEqual(cases.map((c) => c.type));
    });

    it('is a no-op when already connected to the same organisation', async () => {
      // Arrange — never-closing stream keeps the connection open
      const fetchSpy = vi.fn(() => new Promise<Response>(() => undefined));
      vi.stubGlobal('fetch', fetchSpy);

      // Act
      service.connect();
      await Promise.resolve();
      service.connect();
      await Promise.resolve();

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnect / backoff', () => {
    it('schedules a reconnect with the initial delay after the stream ends', async () => {
      // Arrange
      vi.useFakeTimers();
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([])));
      vi.stubGlobal('fetch', fetchSpy);
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      // Act — first connect, let stream drain to end
      service.connect();
      await vi.advanceTimersByTimeAsync(0);

      // Assert — a reconnect timer was scheduled at the initial 1000ms delay
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy.mock.calls[0][1]).toBe(1_000);
    });

    it('reconnects by issuing a fresh fetch once the backoff delay elapses', async () => {
      // Arrange
      vi.useFakeTimers();
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([])));
      vi.stubGlobal('fetch', fetchSpy);

      // Act
      service.connect();
      await vi.advanceTimersByTimeAsync(0); // drain first stream -> schedule reconnect
      await vi.advanceTimersByTimeAsync(1_000); // fire reconnect timer

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('does not reconnect after disconnect aborts the stream', async () => {
      // Arrange
      vi.useFakeTimers();
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([])));
      vi.stubGlobal('fetch', fetchSpy);
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      // Act
      service.connect();
      service.disconnect();
      await vi.advanceTimersByTimeAsync(2_000);

      // Assert — no reconnect timer scheduled (aborted before stream completion)
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('schedules a reconnect when the connection fails (response not ok)', async () => {
      // Arrange
      vi.useFakeTimers();
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([], false, 503)));
      vi.stubGlobal('fetch', fetchSpy);
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      // Act
      service.connect();
      await vi.advanceTimersByTimeAsync(0);

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy.mock.calls[0][1]).toBe(1_000);
    });

    it('clears the pending reconnect timer on disconnect', async () => {
      // Arrange
      vi.useFakeTimers();
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([])));
      vi.stubGlobal('fetch', fetchSpy);

      // Act — let stream end so a reconnect is scheduled, then disconnect
      service.connect();
      await vi.advanceTimersByTimeAsync(0);
      service.disconnect();
      await vi.advanceTimersByTimeAsync(5_000);

      // Assert — reconnect never fired, fetch count unchanged
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('stops reconnecting after the service is destroyed', async () => {
      // Arrange
      vi.useFakeTimers();
      const fetchSpy = vi.fn(() => Promise.resolve(streamingResponse([])));
      vi.stubGlobal('fetch', fetchSpy);

      // Act
      service.connect();
      await vi.advanceTimersByTimeAsync(0); // schedule reconnect
      service.ngOnDestroy();
      await vi.advanceTimersByTimeAsync(10_000);

      // Assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
