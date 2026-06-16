/**
 * Tests for ConnectionService.
 *
 * Two parts:
 * 1. Pure-function tests for the postMessage listener (kept from before) — they
 *    mirror the service's onMessage filter without Angular DI.
 * 2. TestBed-backed tests for the pairing device-flow (startPairing / pollPairing)
 *    using HttpClientTesting to mock the backend.
 */

import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectionService } from './connection.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized by test-setup
}

type ConnectFn = (serverUrl: string, apiKey: string) => void;

function createPostMessageHandler(connectFn: ConnectFn): (event: { data: unknown }) => void {
  return (event: { data: unknown }): void => {
    const data = event.data;
    if (
      data == null ||
      typeof data !== 'object' ||
      (data as Record<string, unknown>).type !== 'signage-connect'
    ) {
      return;
    }

    const { serverUrl, apiKey } = data as Record<string, unknown>;
    if (typeof serverUrl !== 'string' || !serverUrl || typeof apiKey !== 'string' || !apiKey) {
      return;
    }

    connectFn(serverUrl, apiKey);
  };
}

describe('ConnectionService postMessage listener', () => {
  let connectFn: ReturnType<typeof vi.fn>;
  let handler: (event: { data: unknown }) => void;

  beforeEach(() => {
    connectFn = vi.fn();
    handler = createPostMessageHandler(connectFn);
  });

  it('should call connect when receiving a valid signage-connect message', () => {
    handler({
      data: { type: 'signage-connect', serverUrl: 'https://example.com', apiKey: 'key-123' },
    });

    expect(connectFn).toHaveBeenCalledWith('https://example.com', 'key-123');
    expect(connectFn).toHaveBeenCalledTimes(1);
  });

  it('should ignore messages with wrong type', () => {
    handler({ data: { type: 'other-event', serverUrl: 'https://x.com', apiKey: 'k' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with no type', () => {
    handler({ data: { serverUrl: 'https://x.com', apiKey: 'k' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with missing serverUrl', () => {
    handler({ data: { type: 'signage-connect', apiKey: 'key-123' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with missing apiKey', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 'https://example.com' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with empty serverUrl', () => {
    handler({ data: { type: 'signage-connect', serverUrl: '', apiKey: 'key-123' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages with empty apiKey', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 'https://example.com', apiKey: '' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore non-object messages', () => {
    handler({ data: 'plain string' });
    handler({ data: 42 });
    handler({ data: null });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages where serverUrl is not a string', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 123, apiKey: 'key' } });
    expect(connectFn).not.toHaveBeenCalled();
  });

  it('should ignore messages where apiKey is not a string', () => {
    handler({ data: { type: 'signage-connect', serverUrl: 'https://x.com', apiKey: true } });
    expect(connectFn).not.toHaveBeenCalled();
  });
});

describe('ConnectionService pairing flow', () => {
  let service: ConnectionService;
  let httpMock: HttpTestingController;

  const SERVER = 'http://localhost:3000';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConnectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('startPairing', () => {
    it('POSTs to /api/screens/pairing and returns + exposes the code', async () => {
      const promise = service.startPairing(SERVER);

      const req = httpMock.expectOne(`${SERVER}/api/screens/pairing`);
      expect(req.request.method).toBe('POST');
      req.flush({
        pairingId: 'pair-1',
        code: '427913',
        expiresAt: '2030-01-01T00:00:00.000Z',
        pairingSecret: 'secret-xyz',
      });

      const result = await promise;
      expect(result.code).toBe('427913');
      expect(result.expiresAt).toBe('2030-01-01T00:00:00.000Z');
      expect(service.pairingCode()).toBe('427913');
      expect(service.pairingExpiresAt()).toBe('2030-01-01T00:00:00.000Z');
    });

    it('persists pairingId + serverUrl to localStorage and the secret to sessionStorage', async () => {
      const promise = service.startPairing(SERVER);
      httpMock.expectOne(`${SERVER}/api/screens/pairing`).flush({
        pairingId: 'pair-1',
        code: '427913',
        expiresAt: '2030-01-01T00:00:00.000Z',
        pairingSecret: 'secret-xyz',
      });
      await promise;

      expect(localStorage.getItem('signage_pairing_id')).toBe('pair-1');
      expect(localStorage.getItem('signage_server_url')).toBe(SERVER);
      // the 256-bit secret lives in sessionStorage (tab-scoped, not in localStorage)
      expect(sessionStorage.getItem('signage_pairing_secret')).toBe('secret-xyz');
      expect(localStorage.getItem('signage_pairing_secret')).toBeNull();
    });

    it('normalizes a trailing slash in the server URL', async () => {
      const promise = service.startPairing(`${SERVER}/`);
      httpMock.expectOne(`${SERVER}/api/screens/pairing`).flush({
        pairingId: 'pair-1',
        code: '111222',
        expiresAt: '2030-01-01T00:00:00.000Z',
        pairingSecret: 'secret',
      });
      await promise;
      expect(service.serverUrl()).toBe(SERVER);
    });

    it('sets an error and throws when the request fails', async () => {
      const promise = service.startPairing(SERVER);
      httpMock
        .expectOne(`${SERVER}/api/screens/pairing`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(promise).rejects.toThrow('Failed to start pairing');
      expect(service.error()).not.toBe('');
    });
  });

  describe('pollPairing', () => {
    beforeEach(() => {
      localStorage.setItem('signage_pairing_id', 'pair-1');
      sessionStorage.setItem('signage_pairing_secret', 'secret-xyz');
    });

    it('returns "pending" while the pairing is unclaimed', async () => {
      const promise = service.pollPairing(SERVER);
      const req = httpMock.expectOne(`${SERVER}/api/screens/pairing/pair-1/status`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Pairing-Secret')).toBe('secret-xyz');
      req.flush({ status: 'pending' });

      await expect(promise).resolves.toBe('pending');
      expect(service.connected()).toBe(false);
    });

    it('returns "claimed", stores creds and marks connected', async () => {
      const promise = service.pollPairing(SERVER);
      httpMock.expectOne(`${SERVER}/api/screens/pairing/pair-1/status`).flush({
        status: 'claimed',
        apiKey: 'api-key-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
      });

      await expect(promise).resolves.toBe('claimed');
      expect(service.connected()).toBe(true);
      expect(service.apiKey()).toBe('api-key-1');
      expect(service.screenId()).toBe('screen-1');
      expect(service.organisationId()).toBe('org-1');

      expect(localStorage.getItem('signage_api_key')).toBe('api-key-1');
      expect(localStorage.getItem('signage_screen_id')).toBe('screen-1');
      expect(localStorage.getItem('signage_org_id')).toBe('org-1');
      // pairing keys cleared after claim
      expect(localStorage.getItem('signage_pairing_id')).toBeNull();
      expect(sessionStorage.getItem('signage_pairing_secret')).toBeNull();
    });

    it('returns "expired" and clears pairing keys on 410 Gone', async () => {
      const promise = service.pollPairing(SERVER);
      httpMock
        .expectOne(`${SERVER}/api/screens/pairing/pair-1/status`)
        .flush('gone', { status: 410, statusText: 'Gone' });

      await expect(promise).resolves.toBe('expired');
      expect(localStorage.getItem('signage_pairing_id')).toBeNull();
      expect(sessionStorage.getItem('signage_pairing_secret')).toBeNull();
    });

    it('returns "expired" on 404 (unknown id / wrong secret)', async () => {
      const promise = service.pollPairing(SERVER);
      httpMock
        .expectOne(`${SERVER}/api/screens/pairing/pair-1/status`)
        .flush('not found', { status: 404, statusText: 'Not Found' });

      await expect(promise).resolves.toBe('expired');
    });

    it('returns "pending" on a transient network error (keep polling)', async () => {
      const promise = service.pollPairing(SERVER);
      httpMock
        .expectOne(`${SERVER}/api/screens/pairing/pair-1/status`)
        .flush('oops', { status: 503, statusText: 'Service Unavailable' });

      await expect(promise).resolves.toBe('pending');
    });

    it('returns "expired" without an HTTP call when pairing keys are missing', async () => {
      localStorage.removeItem('signage_pairing_id');
      sessionStorage.removeItem('signage_pairing_secret');

      await expect(service.pollPairing(SERVER)).resolves.toBe('expired');
      httpMock.expectNone(`${SERVER}/api/screens/pairing/pair-1/status`);
    });
  });
});

describe('ConnectionService auto-reconnect', () => {
  let service: ConnectionService;
  let httpMock: HttpTestingController;

  const SERVER = 'http://localhost:3000';
  const STATE_URL = `${SERVER}/api/screens/screen-1/state`;

  function seedSavedSettings(): void {
    localStorage.setItem('signage_server_url', SERVER);
    localStorage.setItem('signage_api_key', 'api-key-1');
    localStorage.setItem('signage_screen_id', 'screen-1');
    localStorage.setItem('signage_org_id', 'org-1');
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConnectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  // Lets queued microtasks (firstValueFrom resolution + async continuations) settle
  // while fake timers are active.
  const flushMicrotasks = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  };

  it('schedules a retry and reconnects after 60s when the backend was unreachable', async () => {
    seedSavedSettings();

    const first = service.tryAutoConnect();
    // status 0 ⇒ network error ⇒ treated as unreachable
    httpMock.expectOne(STATE_URL).error(new ProgressEvent('error'));
    await expect(first).resolves.toBe(false);

    expect(service.connected()).toBe(false);
    expect(service.reconnecting()).toBe(true);

    // Nothing fires before the 60s delay elapses.
    vi.advanceTimersByTime(59_000);
    httpMock.expectNone(STATE_URL);

    // At 60s the retry runs; this time the server is back.
    vi.advanceTimersByTime(1_000);
    await flushMicrotasks();
    httpMock.expectOne(STATE_URL).flush({});
    await flushMicrotasks();

    expect(service.connected()).toBe(true);
    expect(service.reconnecting()).toBe(false);
  });

  it('does NOT schedule a retry when the credential is rejected (401)', async () => {
    seedSavedSettings();

    const promise = service.tryAutoConnect();
    httpMock.expectOne(STATE_URL).flush('nope', { status: 401, statusText: 'Unauthorized' });
    await expect(promise).resolves.toBe(false);

    expect(service.reconnecting()).toBe(false);
    vi.advanceTimersByTime(120_000);
    httpMock.expectNone(STATE_URL);
  });

  it('does nothing when there are no saved settings', async () => {
    await expect(service.tryAutoConnect()).resolves.toBe(false);
    expect(service.reconnecting()).toBe(false);
    vi.advanceTimersByTime(120_000);
    httpMock.expectNone(STATE_URL);
  });

  it('stops the reconnect loop on disconnect()', async () => {
    seedSavedSettings();

    const promise = service.tryAutoConnect();
    httpMock.expectOne(STATE_URL).error(new ProgressEvent('error'));
    await expect(promise).resolves.toBe(false);
    expect(service.reconnecting()).toBe(true);

    service.disconnect();
    expect(service.reconnecting()).toBe(false);

    vi.advanceTimersByTime(120_000);
    httpMock.expectNone(STATE_URL);
  });
});
