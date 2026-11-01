import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  HttpRequest,
  HttpHandlerFn,
  HttpResponse,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { authInterceptor, __resetRefreshInFlight } from './auth.interceptor';
import type { MfaRequiredBy } from '@mynextscreen/shared-types';
import { AuthService, type MfaEnrolmentLock } from './auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  refreshSession: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
}

interface OrgStub {
  selectedOrgId: () => string | null;
}

function configure(orgId: string | null, overrides: Partial<AuthStub> = {}): { auth: AuthStub } {
  const auth: AuthStub = {
    refreshSession: vi.fn(() => Promise.resolve()),
    logout: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  const orgStub: OrgStub = { selectedOrgId: () => orgId };
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: OrganisationStateService, useValue: orgStub },
    ],
  });
  return { auth };
}

describe('authInterceptor', () => {
  afterEach(() => {
    __resetRefreshInFlight();
    const httpMock = TestBed.inject(HttpTestingController, null, { optional: true });
    httpMock?.verify();
  });

  it('sends credentials and the X-Organisation-Id header for /api requests', () => {
    configure('org-7');
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get('/api/screens').subscribe();
    const req = httpMock.expectOne('/api/screens');

    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.get('X-Organisation-Id')).toBe('org-7');
    req.flush({});
  });

  it('omits the X-Organisation-Id header when no org is selected', () => {
    configure(null);
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.get('/api/screens').subscribe();
    const req = httpMock.expectOne('/api/screens');

    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
    req.flush({});
  });

  it('refreshes once and retries the request on a 401', async () => {
    const { auth } = configure('org-7');
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = new Promise((resolve) => http.get('/api/screens').subscribe(resolve));

    httpMock.expectOne('/api/screens').flush(null, { status: 401, statusText: 'Unauthorized' });
    // Let the refresh promise + switchMap resubscription settle before the retry.
    await new Promise((r) => setTimeout(r, 0));
    httpMock.expectOne('/api/screens').flush({ ok: true });

    await result;
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('does not refresh on /api/auth/* routes', () => {
    const { auth } = configure('org-7');
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpMock.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.refreshSession).not.toHaveBeenCalled();
  });

  it('does not touch requests whose URL does not include /api', () => {
    configure('org-7');
    const req = new HttpRequest('GET', '/assets/logo.svg');
    const next: HttpHandlerFn = (forwarded) => {
      expect(forwarded).toBe(req);
      expect(forwarded.withCredentials).toBe(false);
      return of(new HttpResponse({ status: 200 }));
    };
    TestBed.runInInjectionContext(() => authInterceptor(req, next).subscribe());
  });
});

describe('authInterceptor — MFA enforcement', () => {
  function configureMfa(url = '/screens') {
    const enrolment = signal<MfaEnrolmentLock | null>(null);
    const auth = {
      refreshSession: vi.fn(() => Promise.resolve()),
      logout: vi.fn(() => Promise.resolve()),
      mfaEnrolment: enrolment,
      requireEnrolment: vi.fn((requiredBy: MfaRequiredBy | null) => enrolment.set({ requiredBy })),
      enrolmentGeneration: 0,
    };
    const router = { url, navigateByUrl: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: OrganisationStateService, useValue: { selectedOrgId: () => 'org-1' } },
      ],
    });
    return {
      auth,
      router,
      http: TestBed.inject(HttpClient),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => {
    __resetRefreshInFlight();
    TestBed.inject(HttpTestingController, null, { optional: true })?.verify();
  });

  it('maps 403 MFA_ENROLMENT_REQUIRED to the wizard with the requiredBy of the body', () => {
    const { auth, router, http, httpMock } = configureMfa();
    const error = vi.fn();
    http.get('/api/screens').subscribe({ error });

    const requiredBy: MfaRequiredBy = { superAdmin: true, organisationIds: ['org-9'] };
    httpMock
      .expectOne('/api/screens')
      .flush(
        { code: 'MFA_ENROLMENT_REQUIRED', requiredBy },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(auth.requireEnrolment).toHaveBeenCalledWith(requiredBy);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mfa-enrolment');
    expect(error).toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('locks with an unknown reason when the body carries no valid requiredBy', () => {
    const { auth, router, http, httpMock } = configureMfa();
    http.get('/api/playlists').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/playlists')
      .flush(
        { code: 'MFA_ENROLMENT_REQUIRED', requiredBy: 'nope' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(auth.requireEnrolment).toHaveBeenCalledWith(null);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mfa-enrolment');
  });

  it('ignores the removed org-scoped MFA_REQUIRED code', () => {
    const { auth, router, http, httpMock } = configureMfa();
    http.get('/api/playlists').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/playlists')
      .flush(
        { code: 'MFA_REQUIRED', organisationId: 'org-9' },
        { status: 403, statusText: 'Forbidden' },
      );

    expect(auth.requireEnrolment).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignores a late 403 of a request sent before the enrolment completed', () => {
    const { auth, router, http, httpMock } = configureMfa();
    const error = vi.fn();
    http.get('/api/screens').subscribe({ error });
    const pending = httpMock.expectOne('/api/screens');

    // The enrolment completes while the request is still in flight.
    auth.enrolmentGeneration = 1;
    pending.flush({ code: 'MFA_ENROLMENT_REQUIRED' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.requireEnrolment).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });

  it('still locks on a 403 of a request sent after the enrolment', () => {
    const { auth, router, http, httpMock } = configureMfa();
    auth.enrolmentGeneration = 1;
    http.get('/api/screens').subscribe({ error: () => undefined });
    httpMock
      .expectOne('/api/screens')
      .flush({ code: 'MFA_ENROLMENT_REQUIRED' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.requireEnrolment).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mfa-enrolment');
  });

  it('navigates only once for a burst of 403s', () => {
    const { router, http, httpMock } = configureMfa();
    http.get('/api/screens').subscribe({ error: () => undefined });
    http.get('/api/playlists').subscribe({ error: () => undefined });

    const body = { code: 'MFA_ENROLMENT_REQUIRED' };
    httpMock.expectOne('/api/screens').flush(body, { status: 403, statusText: 'Forbidden' });
    httpMock.expectOne('/api/playlists').flush(body, { status: 403, statusText: 'Forbidden' });

    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
  });

  it('does not navigate again while the wizard is already shown', () => {
    const { auth, router, http, httpMock } = configureMfa('/mfa-enrolment');
    http.get('/api/me/memberships').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/me/memberships')
      .flush({ code: 'MFA_ENROLMENT_REQUIRED' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.requireEnrolment).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it("never maps the wizard's own /api/auth/mfa/* calls (no loop)", () => {
    const { auth, router, http, httpMock } = configureMfa('/mfa-enrolment');
    http.post('/api/auth/mfa/totp/setup', {}).subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/auth/mfa/totp/setup')
      .flush({ code: 'MFA_ENROLMENT_REQUIRED' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.requireEnrolment).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('leaves other 403s alone', () => {
    const { auth, router, http, httpMock } = configureMfa();
    http.get('/api/screens').subscribe({ error: () => undefined });

    httpMock
      .expectOne('/api/screens')
      .flush({ message: 'Forbidden resource' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.requireEnrolment).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('sends a refreshed-but-unconfirmed session to the wizard instead of logging out', async () => {
    const { auth, router, http, httpMock } = configureMfa();
    http.get('/api/screens').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/screens').flush(null, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r, 0));
    httpMock
      .expectOne('/api/screens')
      .flush({ code: 'MFA_ENROLMENT_REQUIRED' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mfa-enrolment');
  });
});
