/**
 * Tests for the startup clock pass.
 *
 * `connect()` awaits `syncFirstPass()` alongside the state fetch, so this call
 * sits directly in front of the first frame a screen shows. It must therefore
 * settle under every failure mode of `/api/time` — a screen that cannot reach
 * the endpoint still has to play, just on its own clock.
 */

import { TestBed, getTestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { TimeSyncService } from './time-sync.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized by test-setup
}

describe('TimeSyncService.syncFirstPass', () => {
  let service: TimeSyncService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TimeSyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stop();
    TestBed.resetTestingModule();
  });

  /** Answer the sequential sample requests as they arrive. */
  async function answerSamples(count: number, nowMs: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await Promise.resolve();
      const pending = httpMock.match((req) => req.url.endsWith('/api/time'));
      if (pending.length === 0) return;
      pending[0].flush({ now: nowMs });
    }
  }

  it('adopts an offset and flips synced once samples come back', async () => {
    const pass = service.syncFirstPass();
    await answerSamples(3, Date.now() + 5_000);
    await pass;

    expect(service.synced()).toBe(true);
    expect(service.offsetMs()).toBeGreaterThan(0);
  });

  it('resolves without rejecting when every sample fails', async () => {
    const pass = service.syncFirstPass();
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      const pending = httpMock.match((req) => req.url.endsWith('/api/time'));
      if (pending.length === 0) break;
      pending[0].error(new ProgressEvent('error'));
    }

    await expect(pass).resolves.toBeUndefined();
    expect(service.synced()).toBe(false);
  });

  it('leaves the local clock in place until a pass succeeds', () => {
    // serverNow() must stay usable before any sync — callers re-anchor on the
    // `synced` flip rather than waiting for a clock that may never arrive.
    expect(service.offsetMs()).toBe(0);
    expect(service.serverNow()).toBeCloseTo(Date.now(), -2);
  });
});
