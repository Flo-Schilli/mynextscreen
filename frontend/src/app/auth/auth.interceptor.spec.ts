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
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  getToken: () => string;
}

interface OrgStub {
  selectedOrgId: () => string | null;
}

function configure(token: string, orgId: string | null): void {
  const authStub: AuthStub = { getToken: () => token };
  const orgStub: OrgStub = { selectedOrgId: () => orgId };
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: authStub },
      { provide: OrganisationStateService, useValue: orgStub },
    ],
  });
}

describe('authInterceptor', () => {
  afterEach(() => {
    const httpMock = TestBed.inject(HttpTestingController, null, { optional: true });
    httpMock?.verify();
  });

  it('adds Authorization and X-Organisation-Id headers for /api requests when both are present', () => {
    // Arrange
    configure('tok-123', 'org-7');
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    // Act
    http.get('/api/screens').subscribe();
    const req = httpMock.expectOne('/api/screens');

    // Assert
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    expect(req.request.headers.get('X-Organisation-Id')).toBe('org-7');
    req.flush({});
  });

  it('omits the Authorization header when no token is available', () => {
    // Arrange
    configure('', 'org-7');
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    // Act
    http.get('/api/screens').subscribe();
    const req = httpMock.expectOne('/api/screens');

    // Assert
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.get('X-Organisation-Id')).toBe('org-7');
    req.flush({});
  });

  it('omits the X-Organisation-Id header when no org is selected', () => {
    // Arrange
    configure('tok-123', null);
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    // Act
    http.get('/api/screens').subscribe();
    const req = httpMock.expectOne('/api/screens');

    // Assert
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
    req.flush({});
  });

  it('sends no auth headers when neither a token nor an org is present', () => {
    // Arrange
    configure('', null);
    const http = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    // Act
    http.get('/api/screens').subscribe();
    const req = httpMock.expectOne('/api/screens');

    // Assert
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
    req.flush({});
  });

  it('does not touch requests whose URL does not include /api', () => {
    // Arrange
    const authStub: AuthStub = { getToken: () => 'tok-123' };
    const orgStub: OrgStub = { selectedOrgId: () => 'org-7' };
    const getTokenSpy = vi.spyOn(authStub, 'getToken');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authStub },
        { provide: OrganisationStateService, useValue: orgStub },
      ],
    });
    const req = new HttpRequest('GET', '/assets/logo.svg');
    const next: HttpHandlerFn = (forwarded) => {
      // Assert: request passes through untouched
      expect(forwarded).toBe(req);
      expect(forwarded.headers.has('Authorization')).toBe(false);
      return of(new HttpResponse({ status: 200 }));
    };

    // Act
    TestBed.runInInjectionContext(() => authInterceptor(req, next).subscribe());

    // Assert: short-circuits before reading the token
    expect(getTokenSpy).not.toHaveBeenCalled();
  });
});
