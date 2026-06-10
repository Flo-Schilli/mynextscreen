import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
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
import { AuthService } from './auth.service';
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
