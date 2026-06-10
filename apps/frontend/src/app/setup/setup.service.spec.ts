import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, type AuthenticatedUser } from '../auth/auth.service';
import { SetupService } from './setup.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ADMIN: AuthenticatedUser = {
  userId: 'admin-1',
  email: 'admin@example.com',
  isSuperAdmin: true,
};

function setup(): {
  service: SetupService;
  auth: AuthService;
  httpMock: HttpTestingController;
} {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    service: TestBed.inject(SetupService),
    auth: TestBed.inject(AuthService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('SetupService', () => {
  afterEach(() => {
    const httpMock = TestBed.inject(HttpTestingController, null, { optional: true });
    httpMock?.verify();
  });

  it('reports setupNeeded=true and stores it in the signal', async () => {
    const { service, httpMock } = setup();
    const promise = service.checkStatus();

    const req = httpMock.expectOne('/api/auth/setup-status');
    expect(req.request.method).toBe('GET');
    req.flush({ setupNeeded: true });

    await expect(promise).resolves.toBe(true);
    expect(service.setupNeeded()).toBe(true);
  });

  it('reports setupNeeded=false', async () => {
    const { service, httpMock } = setup();
    const promise = service.checkStatus();
    httpMock.expectOne('/api/auth/setup-status').flush({ setupNeeded: false });

    await expect(promise).resolves.toBe(false);
    expect(service.setupNeeded()).toBe(false);
  });

  it('creates the first admin, logs in (seeds auth user), and clears setupNeeded', async () => {
    const { service, auth, httpMock } = setup();
    const promise = service.createFirstAdmin('admin@example.com', 'supersecret', 'Boss');

    const req = httpMock.expectOne('/api/auth/setup');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({
      email: 'admin@example.com',
      password: 'supersecret',
      name: 'Boss',
    });
    req.flush({ user: ADMIN });

    await promise;
    expect(auth.user()).toEqual(ADMIN);
    expect(auth.isAuthenticated()).toBe(true);
    expect(service.setupNeeded()).toBe(false);
  });
});
