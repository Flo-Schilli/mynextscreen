/**
 * Tests for the pairing ConnectionDialogComponent.
 *
 * Verifies the dialog requests a code on init, renders the grouped 6-digit code,
 * polls for status, and emits `connected` once the pairing is claimed. HttpClient
 * is mocked via HttpClientTesting; the ~3s poll interval is driven with Vitest
 * fake timers (fakeAsync is unavailable under the Analog/Vitest zone setup).
 */

import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConnectionDialogComponent } from './connection-dialog';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized by test-setup
}

const SERVER = 'http://localhost:3000';

describe('ConnectionDialogComponent (pairing)', () => {
  let fixture: ComponentFixture<ConnectionDialogComponent>;
  let component: ConnectionDialogComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ConnectionDialogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ConnectionDialogComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  /** Flush the startPairing POST and let its promise chain settle. */
  async function flushStartPairing(code = '427913'): Promise<void> {
    const req = httpMock.expectOne(`${SERVER}/api/screens/pairing`);
    expect(req.request.method).toBe('POST');
    req.flush({
      pairingId: 'pair-1',
      code,
      expiresAt: '2030-01-01T00:00:00.000Z',
      pairingSecret: 'secret-xyz',
    });
    await Promise.resolve();
    await Promise.resolve();
  }

  it('requests a pairing code on init and renders it grouped', async () => {
    fixture.detectChanges(); // ngOnInit → startPairing
    await flushStartPairing('427913');
    fixture.detectChanges();

    const codeEl = fixture.nativeElement.querySelector('[data-testid="pairing-code"]');
    expect(codeEl).not.toBeNull();
    expect(codeEl.textContent.trim()).toBe('427 913');

    component['stopPolling']();
  });

  it('polls every ~3s and emits connected when claimed', async () => {
    const connectedSpy = vi.fn();
    component.connected.subscribe(connectedSpy);

    fixture.detectChanges();
    await flushStartPairing();

    // First poll after 3s → still pending
    await vi.advanceTimersByTimeAsync(3000);
    httpMock.expectOne(`${SERVER}/api/screens/pairing/pair-1/status`).flush({ status: 'pending' });
    await Promise.resolve();
    expect(connectedSpy).not.toHaveBeenCalled();

    // Second poll → claimed
    await vi.advanceTimersByTimeAsync(3000);
    httpMock.expectOne(`${SERVER}/api/screens/pairing/pair-1/status`).flush({
      status: 'claimed',
      apiKey: 'api-key-1',
      screenId: 'screen-1',
      organisationId: 'org-1',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(connectedSpy).toHaveBeenCalledTimes(1);

    // Polling stopped: no further requests
    await vi.advanceTimersByTimeAsync(3000);
    httpMock.expectNone(`${SERVER}/api/screens/pairing/pair-1/status`);
  });

  it('re-requests a fresh code when the pairing expires', async () => {
    fixture.detectChanges();
    await flushStartPairing('111222');

    await vi.advanceTimersByTimeAsync(3000);
    httpMock
      .expectOne(`${SERVER}/api/screens/pairing/pair-1/status`)
      .flush('gone', { status: 410, statusText: 'Gone' });
    await Promise.resolve();
    await Promise.resolve();

    // Expiry triggers a new startPairing
    await flushStartPairing('333444');
    fixture.detectChanges();

    const codeEl = fixture.nativeElement.querySelector('[data-testid="pairing-code"]');
    expect(codeEl.textContent.trim()).toBe('333 444');

    component['stopPolling']();
  });

  it('shows an error and a retry button when starting pairing fails', async () => {
    fixture.detectChanges();
    httpMock
      .expectOne(`${SERVER}/api/screens/pairing`)
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.error');
    expect(errorEl).not.toBeNull();
    const retryBtn = fixture.nativeElement.querySelector('[data-testid="retry-pairing"]');
    expect(retryBtn).not.toBeNull();
  });

  it('toggles the advanced server-url field', async () => {
    fixture.detectChanges();
    await flushStartPairing();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#serverUrl')).toBeNull();

    fixture.nativeElement.querySelector('[data-testid="advanced-toggle"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#serverUrl')).not.toBeNull();

    component['stopPolling']();
  });
});
