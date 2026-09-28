import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ScreenSessionService } from './screen-session.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized by test-setup
}

const SERVER = 'http://localhost:3000';
const API_KEY = 'enrolment-key';

function sessionBody(accessToken: string, refreshToken: string) {
  return { accessToken, refreshToken, expiresIn: 900 };
}

describe('ScreenSessionService', () => {
  let service: ScreenSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScreenSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('establish', () => {
    it('exchanges the API key and keeps only the refresh token on disk', async () => {
      const promise = service.establish(SERVER, API_KEY);

      const request = httpMock.expectOne(`${SERVER}/api/screens/session`);
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${API_KEY}`);
      request.flush(sessionBody('access-1', 'refresh-1'));

      await expect(promise).resolves.toBe(true);
      expect(service.token()).toBe('access-1');
      // The access token is short-lived and stays in memory; only the rotating
      // refresh token is worth persisting.
      expect(localStorage.getItem('signage_refresh_token')).toBe('refresh-1');
      expect(JSON.stringify(localStorage)).not.toContain('access-1');
    });

    it('reports failure without leaving a stale token behind', async () => {
      const promise = service.establish(SERVER, API_KEY);
      httpMock
        .expectOne(`${SERVER}/api/screens/session`)
        .flush({}, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).resolves.toBe(false);
      expect(service.hasSession()).toBe(false);
    });
  });

  describe('refresh', () => {
    it('rotates the stored refresh token', async () => {
      localStorage.setItem('signage_refresh_token', 'refresh-1');

      const promise = service.refresh(SERVER, API_KEY);
      const request = httpMock.expectOne(`${SERVER}/api/screens/session/refresh`);
      expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
      request.flush(sessionBody('access-2', 'refresh-2'));

      await expect(promise).resolves.toBe(true);
      expect(service.token()).toBe('access-2');
      expect(localStorage.getItem('signage_refresh_token')).toBe('refresh-2');
    });

    it('falls back to the enrolment key when the refresh token is rejected', async () => {
      // A screen whose refresh token aged out or was lost must recover on its
      // own; the alternative is someone standing in front of the display.
      localStorage.setItem('signage_refresh_token', 'stale');

      const promise = service.refresh(SERVER, API_KEY);
      httpMock
        .expectOne(`${SERVER}/api/screens/session/refresh`)
        .flush({}, { status: 401, statusText: 'Unauthorized' });
      await Promise.resolve();
      httpMock.expectOne(`${SERVER}/api/screens/session`).flush(sessionBody('access-3', 'fresh'));

      await expect(promise).resolves.toBe(true);
      expect(service.token()).toBe('access-3');
    });

    it('goes straight to enrolment when there is no refresh token yet', async () => {
      const promise = service.refresh(SERVER, API_KEY);
      httpMock.expectOne(`${SERVER}/api/screens/session`).flush(sessionBody('access-4', 'r4'));

      await expect(promise).resolves.toBe(true);
    });

    it('gives up when there is neither a refresh token nor a key', async () => {
      await expect(service.refresh(SERVER, '')).resolves.toBe(false);
    });

    it('is single-flight: five racing callers produce one rotation', async () => {
      // State, heartbeat, SSE, HLS and media all hit 401 in the same moment.
      // Rotating once per caller would present an already-consumed token.
      localStorage.setItem('signage_refresh_token', 'refresh-1');

      const promises = [
        service.refresh(SERVER, API_KEY),
        service.refresh(SERVER, API_KEY),
        service.refresh(SERVER, API_KEY),
        service.refresh(SERVER, API_KEY),
        service.refresh(SERVER, API_KEY),
      ];

      const requests = httpMock.match(`${SERVER}/api/screens/session/refresh`);
      expect(requests).toHaveLength(1);
      requests[0].flush(sessionBody('access-5', 'refresh-5'));

      expect(await Promise.all(promises)).toEqual([true, true, true, true, true]);
    });

    it('allows a new rotation once the previous one finished', async () => {
      localStorage.setItem('signage_refresh_token', 'refresh-1');

      const first = service.refresh(SERVER, API_KEY);
      httpMock
        .expectOne(`${SERVER}/api/screens/session/refresh`)
        .flush(sessionBody('access-a', 'refresh-a'));
      await first;

      const second = service.refresh(SERVER, API_KEY);
      httpMock
        .expectOne(`${SERVER}/api/screens/session/refresh`)
        .flush(sessionBody('access-b', 'refresh-b'));

      await expect(second).resolves.toBe(true);
      expect(service.token()).toBe('access-b');
    });
  });

  describe('clear', () => {
    it('drops the session but not the enrolment credential', async () => {
      localStorage.setItem('signage_api_key', API_KEY);
      localStorage.setItem('signage_refresh_token', 'refresh-1');

      service.clear();

      expect(service.hasSession()).toBe(false);
      expect(localStorage.getItem('signage_refresh_token')).toBeNull();
      expect(localStorage.getItem('signage_api_key')).toBe(API_KEY);
    });
  });
});
