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

  it("setPassword sends an invitee's name along", async () => {
    const { service, httpMock } = setup();
    const promise = service.setPassword('tok', 'newpassword', 'Jane Doe');
    const req = httpMock.expectOne('/api/auth/set-password');
    expect(req.request.body).toEqual({
      token: 'tok',
      newPassword: 'newpassword',
      name: 'Jane Doe',
    });
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

  it("register posts email, password, organisation name and the browser's time zone", async () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Europe/Berlin',
    } as Intl.ResolvedDateTimeFormatOptions);
    const { service, httpMock } = setup();
    const promise = service.register('new@example.com', 'newpassword', 'Acme');
    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({
      email: 'new@example.com',
      password: 'newpassword',
      organisationName: 'Acme',
      timeZone: 'Europe/Berlin',
    });
    req.flush(null);
    await promise;
    vi.restoreAllMocks();
  });

  it('verifyEmail posts the token and stores the auto-login user', async () => {
    const { service, httpMock } = setup();
    const promise = service.verifyEmail('vtok');
    const req = httpMock.expectOne('/api/auth/verify-email');
    expect(req.request.body).toEqual({ token: 'vtok' });
    req.flush({ user: USER });
    await promise;
    expect(service.user()).toEqual(USER);
  });

  it('resendVerification posts the email', async () => {
    const { service, httpMock } = setup();
    const promise = service.resendVerification('user@example.com');
    const req = httpMock.expectOne('/api/auth/resend-verification');
    expect(req.request.body).toEqual({ email: 'user@example.com' });
    req.flush(null);
    await promise;
  });

  it('changeEmail posts new email and current password', async () => {
    const { service, httpMock } = setup();
    const promise = service.changeEmail('new@example.com', 'pw');
    const req = httpMock.expectOne('/api/auth/change-email');
    expect(req.request.body).toEqual({ newEmail: 'new@example.com', currentPassword: 'pw' });
    req.flush(null);
    await promise;
  });

  it('confirmEmailChange posts the token', async () => {
    const { service, httpMock } = setup();
    const promise = service.confirmEmailChange('ctok');
    const req = httpMock.expectOne('/api/auth/confirm-email-change');
    expect(req.request.body).toEqual({ token: 'ctok' });
    req.flush(null);
    await promise;
  });

  it('deleteAccount posts the current password and clears the user signal', async () => {
    const { service, httpMock } = setup();
    service.user.set(USER);
    const promise = service.deleteAccount('pw');
    const req = httpMock.expectOne('/api/auth/delete-account');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ currentPassword: 'pw' });
    req.flush(null);
    await promise;
    expect(service.user()).toBeNull();
  });

  describe('MFA', () => {
    it("login resolves 'mfa-required' without a user when the backend wants a second factor", async () => {
      const { service, httpMock } = setup();
      const promise = service.login('user@example.com', 'pw');
      httpMock
        .expectOne('/api/auth/login')
        .flush({ mfaRequired: true, methods: ['totp', 'recovery'] });

      expect(await promise).toBe('mfa-required');
      expect(service.user()).toBeNull();
      expect(service.mfaChallengePending()).toBe(true);
    });

    it("login resolves 'ok' and clears any enrolment lock for a regular session", async () => {
      const { service, httpMock } = setup();
      service.requireEnrolment({ kind: 'super-admin' });
      const promise = service.login('user@example.com', 'pw');
      httpMock.expectOne('/api/auth/login').flush({ user: USER, mfaEnrolmentRequired: false });

      expect(await promise).toBe('ok');
      expect(service.mfaEnrolment()).toBeNull();
    });

    it("login resolves 'enrolment-required' and locks into the wizard for a super-admin", async () => {
      const { service, httpMock } = setup();
      const promise = service.login('admin@example.com', 'pw');
      httpMock
        .expectOne('/api/auth/login')
        .flush({ user: { ...USER, isSuperAdmin: true }, mfaEnrolmentRequired: true });

      expect(await promise).toBe('enrolment-required');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.mfaEnrolment()).toEqual({ kind: 'super-admin' });
    });

    it('verifyMfa posts the code to login/mfa and stores the user', async () => {
      const { service, httpMock } = setup();
      service.mfaChallengePending.set(true);
      const promise = service.verifyMfa({ code: '123456' });

      const req = httpMock.expectOne('/api/auth/login/mfa');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual({ code: '123456' });
      req.flush({ user: USER, mfaEnrolmentRequired: false });

      expect(await promise).toBe('ok');
      expect(service.user()).toEqual(USER);
      expect(service.mfaChallengePending()).toBe(false);
    });

    it('verifyMfa sends a recovery code as such', async () => {
      const { service, httpMock } = setup();
      const promise = service.verifyMfa({ recoveryCode: 'abcde-fgh23' });
      const req = httpMock.expectOne('/api/auth/login/mfa');
      expect(req.request.body).toEqual({ recoveryCode: 'abcde-fgh23' });
      req.flush({ user: USER, mfaEnrolmentRequired: false });
      await promise;
    });

    it('verifyMfa rejects on a wrong code and keeps the challenge pending', async () => {
      const { service, httpMock } = setup();
      service.mfaChallengePending.set(true);
      const promise = service.verifyMfa({ code: '000000' });
      httpMock
        .expectOne('/api/auth/login/mfa')
        .flush({ message: 'Invalid code' }, { status: 401, statusText: 'Unauthorized' });

      await expect(promise).rejects.toMatchObject({ status: 401 });
      expect(service.user()).toBeNull();
      expect(service.mfaChallengePending()).toBe(true);
    });

    it("verifyEmail resolves 'mfa-required' for a TOTP user (no session)", async () => {
      const { service, httpMock } = setup();
      const promise = service.verifyEmail('tok');
      httpMock
        .expectOne('/api/auth/verify-email')
        .flush({ mfaRequired: true, methods: ['totp', 'recovery'] });
      expect(await promise).toBe('mfa-required');
      expect(service.user()).toBeNull();
    });

    it('completeEnrolment lifts the lock and reloads the user', async () => {
      const { service, httpMock } = setup();
      service.requireEnrolment({ kind: 'organisation', organisationId: 'org-1' });
      const promise = service.completeEnrolment();
      expect(service.mfaEnrolment()).toBeNull();
      httpMock.expectOne('/api/auth/me').flush(USER);
      await promise;
      expect(service.user()).toEqual(USER);
    });

    it('logout drops the enrolment lock and a pending challenge', async () => {
      const { service, httpMock } = setup();
      service.requireEnrolment({ kind: 'super-admin' });
      service.mfaChallengePending.set(true);
      const promise = service.logout();
      httpMock.expectOne('/api/auth/logout').flush(null);
      await promise;
      expect(service.mfaEnrolment()).toBeNull();
      expect(service.mfaChallengePending()).toBe(false);
    });
  });
});
