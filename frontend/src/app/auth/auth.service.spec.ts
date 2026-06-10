import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, type AuthenticatedUser } from './auth.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const USER: AuthenticatedUser = {
  userId: 'u1',
  email: 'user@example.com',
  isSuperAdmin: false,
};

function setup(): { service: AuthService; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    service: TestBed.inject(AuthService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService', () => {
  afterEach(() => {
    const httpMock = TestBed.inject(HttpTestingController, null, { optional: true });
    httpMock?.verify();
  });

  it('logs in with credentials and stores the user signal', async () => {
    const { service, httpMock } = setup();
    const promise = service.login('user@example.com', 'pw');

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ email: 'user@example.com', password: 'pw' });
    req.flush({ user: USER });

    await promise;
    expect(service.user()).toEqual(USER);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears the user signal on logout', async () => {
    const { service, httpMock } = setup();
    service.user.set(USER);
    const promise = service.logout();
    httpMock.expectOne('/api/auth/logout').flush(null);
    await promise;
    expect(service.user()).toBeNull();
  });

  it('loadCurrent populates the user from /api/auth/me', async () => {
    const { service, httpMock } = setup();
    const promise = service.loadCurrent();
    httpMock.expectOne('/api/auth/me').flush(USER);
    await promise;
    expect(service.user()).toEqual(USER);
  });

  it('loadCurrent clears the user when the request fails', async () => {
    const { service, httpMock } = setup();
    service.user.set(USER);
    const promise = service.loadCurrent();
    httpMock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await promise;
    expect(service.user()).toBeNull();
  });

  it('refreshSession calls the refresh endpoint with credentials', async () => {
    const { service, httpMock } = setup();
    const promise = service.refreshSession();
    const req = httpMock.expectOne('/api/auth/refresh');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ refreshed: true });
    await promise;
  });

  it('setPassword posts the token and new password', async () => {
    const { service, httpMock } = setup();
    const promise = service.setPassword('tok', 'newpassword');
    const req = httpMock.expectOne('/api/auth/set-password');
    expect(req.request.body).toEqual({ token: 'tok', newPassword: 'newpassword' });
    req.flush(null);
    await promise;
  });

  it('changePassword posts current and new password', async () => {
    const { service, httpMock } = setup();
    const promise = service.changePassword('old', 'newpassword');
    const req = httpMock.expectOne('/api/auth/change-password');
    expect(req.request.body).toEqual({ currentPassword: 'old', newPassword: 'newpassword' });
    req.flush(null);
    await promise;
  });
});
