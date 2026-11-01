import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { UserService } from '../user/user.service';
import {
  AUTH_EMAIL_CHANGE_REQUESTED,
  AUTH_EMAIL_VERIFICATION_REQUESTED,
  AUTH_PASSWORD_CHANGED,
  AUTH_PASSWORD_RESET_REQUESTED,
  AUDIT_USER_REGISTERED,
  AUDIT_EMAIL_VERIFIED,
  AUDIT_AUTH_EMAIL_CHANGE_REQUESTED,
  AUDIT_AUTH_EMAIL_CHANGED,
  AUDIT_AUTH_PASSWORD_RESET_REQUESTED,
  AUDIT_AUTH_PASSWORD_CHANGED,
} from '../audit-log/audit.events';
import type { User } from '../db/schema';
import { MFA_CHALLENGE_COOKIE, MFA_CHALLENGE_EXPIRED } from './mfa/mfa.constants';
import type { MfaService } from './mfa/mfa.service';

const issuedAccess = { token: 'access', jti: 'jti', expiresAt: new Date(Date.now() + 1000) };
const issuedRefresh = { token: 'refresh', familyId: 'fam', expiresAt: new Date(Date.now() + 1000) };

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: null,
    passwordHash: 'hash',
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    pendingEmail: null,
    emailChangeToken: null,
    emailChangeTokenExpiresAt: null,
    isSuperAdmin: false,
    gravatarEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthController', () => {
  let controller: AuthController;
  let auth: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;
  let events: { emit: jest.Mock };
  let configValues: Record<string, unknown>;
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };
  let mfa: { isEnrolmentRequired: jest.Mock };

  beforeEach(() => {
    auth = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      createEmailVerificationToken: jest.fn(),
      createPasswordResetToken: jest.fn(),
      login: jest.fn(),
      loginMfa: jest.fn(),
      setupFirstSuperAdmin: jest.fn(),
      changePassword: jest.fn(),
      changeEmail: jest.fn(),
      confirmEmailChange: jest.fn(),
      deleteAccount: jest.fn(),
      setPassword: jest.fn(),
    };
    users = { hasAnyUser: jest.fn(), findByEmail: jest.fn(), findById: jest.fn() };
    events = { emit: jest.fn() };
    configValues = {
      SIGNUP_ENABLED: true,
      SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES: 111,
      SIGNUP_DEFAULT_STORAGE_TRANSCODED_BYTES: 222,
    };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => configValues[key] ?? fallback),
    } as unknown as ConfigService;
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    // Default policy stand-in: super-admins only; specs override per case.
    mfa = {
      isEnrolmentRequired: jest.fn((user: User, sessionMfa: boolean) =>
        Promise.resolve(!sessionMfa && user.isSuperAdmin),
      ),
    };

    controller = new AuthController(
      auth as unknown as AuthService,
      config,
      users as unknown as UserService,
      events as unknown as EventEmitter2,
      mfa as unknown as MfaService,
    );
  });

  describe('setupStatus', () => {
    it('reports setup needed + signup enabled', async () => {
      users.hasAnyUser.mockResolvedValue(false);
      expect(await controller.setupStatus()).toEqual({ setupNeeded: true, signupEnabled: true });
    });

    it('reflects SIGNUP_ENABLED=false', async () => {
      users.hasAnyUser.mockResolvedValue(true);
      configValues.SIGNUP_ENABLED = false;
      expect(await controller.setupStatus()).toEqual({ setupNeeded: false, signupEnabled: false });
    });
  });

  describe('register', () => {
    const dto = { email: 'New@Example.com', password: 'supersecret', organisationName: 'Acme' };

    it('registers and emits a verification event with the env storage limits', async () => {
      auth.register.mockResolvedValue({ user: makeUser(), verificationToken: 'vtok' });

      await controller.register(dto as never);

      expect(auth.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'New@Example.com',
          organisationName: 'Acme',
          storageOriginalLimitBytes: 111,
          storageTranscodedLimitBytes: 222,
        }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_EMAIL_VERIFICATION_REQUESTED,
        expect.objectContaining({ email: 'new@example.com', verificationToken: 'vtok' }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_USER_REGISTERED,
        expect.objectContaining({ userId: 'user-1', organisationId: null }),
      );
    });

    it("creates the organisation in the browser's time zone", async () => {
      auth.register.mockResolvedValue({ user: makeUser(), verificationToken: 'vtok' });

      await controller.register({ ...dto, timeZone: 'Europe/Berlin' } as never);

      expect(auth.register).toHaveBeenCalledWith(
        expect.objectContaining({ timeZone: 'Europe/Berlin' }),
      );
    });

    it('rejects with 403 when signup is disabled', async () => {
      configValues.SIGNUP_ENABLED = false;
      await expect(controller.register(dto as never)).rejects.toThrow(ForbiddenException);
      expect(auth.register).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('verifies, sets both cookies, and returns the user view', async () => {
      auth.verifyEmail.mockResolvedValue({
        kind: 'session',
        user: makeUser({ id: 'u9', email: 'v@example.com' }),
        mfa: false,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      const result = await controller.verifyEmail({ token: 't' }, res as unknown as Response);

      expect(auth.verifyEmail).toHaveBeenCalledWith('t');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        user: { userId: 'u9', email: 'v@example.com', isSuperAdmin: false },
        mfaEnrolmentRequired: false,
      });
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_EMAIL_VERIFIED,
        expect.objectContaining({ userId: 'u9', details: { email: 'v@example.com' } }),
      );
    });
  });

  describe('resendVerification', () => {
    it('emits a fresh verification event for an unverified account', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ emailVerified: false }));
      auth.createEmailVerificationToken.mockResolvedValue('fresh');

      await controller.resendVerification({ email: 'user@example.com' });

      expect(events.emit).toHaveBeenCalledWith(
        AUTH_EMAIL_VERIFICATION_REQUESTED,
        expect.objectContaining({ verificationToken: 'fresh' }),
      );
    });

    it('is enumeration-safe: no event for unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);
      await controller.resendVerification({ email: 'nobody@example.com' });
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('does nothing for an already-verified account', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ emailVerified: true }));
      await controller.resendVerification({ email: 'user@example.com' });
      expect(auth.createEmailVerificationToken).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('setPassword', () => {
    it("passes the token, the new password and an invitee's name on", async () => {
      await controller.setPassword({ token: 'tok', newPassword: 'supersecret', name: 'Jane Doe' });

      expect(auth.setPassword).toHaveBeenCalledWith('tok', 'supersecret', 'Jane Doe');
    });
  });

  describe('forgotPassword', () => {
    it('emits a reset event (no org context) for a known account', async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      auth.createPasswordResetToken.mockResolvedValue('rtok');

      await controller.forgotPassword({ email: 'user@example.com' });

      expect(events.emit).toHaveBeenCalledWith(
        AUTH_PASSWORD_RESET_REQUESTED,
        expect.objectContaining({ email: 'user@example.com', resetToken: 'rtok' }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_PASSWORD_RESET_REQUESTED,
        expect.objectContaining({ userId: 'user-1' }),
      );
    });

    it('is enumeration-safe: no event for unknown email', async () => {
      users.findByEmail.mockResolvedValue(null);
      await controller.forgotPassword({ email: 'nobody@example.com' });
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('issues no reset token (and no mail) for an unverified account', async () => {
      // An unverified self-signup must NOT be able to reset its way to
      // emailVerified=true and bypass the verification-link gate. Treated as a
      // silent no-op identical to an unknown email (no token write, no event).
      users.findByEmail.mockResolvedValue(makeUser({ emailVerified: false }));

      await controller.forgotPassword({ email: 'user@example.com' });

      expect(auth.createPasswordResetToken).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('sets the session cookies for a user without TOTP', async () => {
      auth.login.mockResolvedValue({
        kind: 'session',
        user: makeUser(),
        mfa: false,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      const result = await controller.login(
        { email: 'user@example.com', password: 'pw' },
        res as unknown as Response,
      );

      expect(result).toEqual({
        user: { userId: 'user-1', email: 'user@example.com', isSuperAdmin: false },
        mfaEnrolmentRequired: false,
      });
      expect(res.cookie).toHaveBeenCalledWith('access_token', 'access', expect.anything());
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.anything());
    });

    it('flags mfaEnrolmentRequired for a super-admin without TOTP', async () => {
      auth.login.mockResolvedValue({
        kind: 'session',
        user: makeUser({ isSuperAdmin: true }),
        mfa: false,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      const result = await controller.login(
        { email: 'user@example.com', password: 'pw' },
        res as unknown as Response,
      );

      expect(result).toMatchObject({ mfaEnrolmentRequired: true });
    });

    it('flags mfaEnrolmentRequired for a member of a requireMfa org (user-bound policy)', async () => {
      const member = makeUser();
      auth.login.mockResolvedValue({
        kind: 'session',
        user: member,
        mfa: false,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });
      mfa.isEnrolmentRequired.mockResolvedValue(true);

      const result = await controller.login(
        { email: 'user@example.com', password: 'pw' },
        res as unknown as Response,
      );

      expect(mfa.isEnrolmentRequired).toHaveBeenCalledWith(member, false);
      expect(result).toMatchObject({ mfaEnrolmentRequired: true });
    });

    it('sets only the challenge cookie (no session) for a user with TOTP', async () => {
      auth.login.mockResolvedValue({
        kind: 'mfa-required',
        user: makeUser(),
        challengeId: 'raw-challenge',
      });

      const result = await controller.login(
        { email: 'user@example.com', password: 'pw' },
        res as unknown as Response,
      );

      expect(result).toEqual({ mfaRequired: true, methods: ['totp', 'recovery'] });
      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        MFA_CHALLENGE_COOKIE,
        'raw-challenge',
        expect.objectContaining({ httpOnly: true, path: '/api/auth', maxAge: 300_000 }),
      );
    });
  });

  describe('loginMfa', () => {
    const req = (cookies: Record<string, string>) => ({ cookies }) as never;

    it('verifies the challenge from the cookie and issues the session', async () => {
      auth.loginMfa.mockResolvedValue({
        user: makeUser({ isSuperAdmin: true }),
        mfa: true,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      const result = await controller.loginMfa(
        { code: '123456' },
        req({ [MFA_CHALLENGE_COOKIE]: 'raw-challenge' }),
        res as unknown as Response,
      );

      expect(auth.loginMfa).toHaveBeenCalledWith('raw-challenge', { code: '123456' });
      expect(result).toMatchObject({ mfaEnrolmentRequired: false });
      expect(res.clearCookie).toHaveBeenCalledWith(MFA_CHALLENGE_COOKIE, expect.anything());
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });

    it('passes a recovery code on when no TOTP code is given', async () => {
      auth.loginMfa.mockResolvedValue({
        user: makeUser(),
        mfa: true,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      await controller.loginMfa(
        { recoveryCode: 'abcde-fghij' },
        req({ [MFA_CHALLENGE_COOKIE]: 'raw-challenge' }),
        res as unknown as Response,
      );

      expect(auth.loginMfa).toHaveBeenCalledWith('raw-challenge', {
        recoveryCode: 'abcde-fghij',
      });
    });

    it('answers 401 MFA_CHALLENGE_EXPIRED without a challenge cookie', async () => {
      const attempt = controller.loginMfa({ code: '123456' }, req({}), res as unknown as Response);
      await expect(attempt).rejects.toThrow(UnauthorizedException);
      await attempt.catch((error: UnauthorizedException) => {
        expect(error.getResponse()).toMatchObject({ statusCode: 401, code: MFA_CHALLENGE_EXPIRED });
      });
      expect(auth.loginMfa).not.toHaveBeenCalled();
    });
  });

  describe('setup', () => {
    it('logs the first super-admin in and sends them to MFA enrolment', async () => {
      auth.setupFirstSuperAdmin.mockResolvedValue({
        user: makeUser({ isSuperAdmin: true }),
        mfa: false,
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      const result = await controller.setup(
        { email: 'user@example.com', password: 'supersecret' },
        res as unknown as Response,
      );

      expect(result).toMatchObject({ mfaEnrolmentRequired: true });
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('changePassword', () => {
    it('changes the password then emits a password-changed notice', async () => {
      const req = {
        user: { userId: 'u1', email: 'user@example.com', isSuperAdmin: false, mfa: true },
      };
      auth.changePassword.mockResolvedValue({
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      await controller.changePassword(req as never, res as unknown as Response, {
        currentPassword: 'old',
        newPassword: 'newsecret',
      });

      expect(auth.changePassword).toHaveBeenCalledWith('u1', 'old', 'newsecret', { mfa: true });
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_PASSWORD_CHANGED,
        expect.objectContaining({ email: 'user@example.com' }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_PASSWORD_CHANGED,
        expect.objectContaining({ userId: 'u1', details: { email: 'user@example.com' } }),
      );
    });

    it('re-issues the caller\u2019s cookies so only the other sessions are logged out', async () => {
      const req = {
        user: { userId: 'u1', email: 'user@example.com', isSuperAdmin: false, mfa: false },
      };
      auth.changePassword.mockResolvedValue({
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      await controller.changePassword(req as never, res as unknown as Response, {
        currentPassword: 'old',
        newPassword: 'newsecret',
      });

      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('changeEmail', () => {
    it('requests the change then emits an email-change event (old+new+token)', async () => {
      const req = { user: { userId: 'u1', email: 'old@example.com', isSuperAdmin: false } };
      auth.changeEmail.mockResolvedValue({
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        changeToken: 'ctok',
      });

      await controller.changeEmail(req as never, {
        newEmail: 'new@example.com',
        currentPassword: 'pw',
      });

      expect(auth.changeEmail).toHaveBeenCalledWith('u1', 'new@example.com', 'pw');
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_EMAIL_CHANGE_REQUESTED,
        expect.objectContaining({
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changeToken: 'ctok',
        }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_EMAIL_CHANGE_REQUESTED,
        expect.objectContaining({
          userId: 'u1',
          details: { oldEmail: 'old@example.com', newEmail: 'new@example.com' },
        }),
      );
    });
  });

  describe('confirmEmailChange', () => {
    it('delegates to the auth service then emits an email-changed audit event', async () => {
      auth.confirmEmailChange.mockResolvedValue({
        userId: 'u1',
        oldEmail: 'old@example.com',
        newEmail: 'new@example.com',
        changeToken: 'ctok',
      });

      await controller.confirmEmailChange({ token: 'ctok' });

      expect(auth.confirmEmailChange).toHaveBeenCalledWith('ctok');
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_EMAIL_CHANGED,
        expect.objectContaining({
          userId: 'u1',
          details: { oldEmail: 'old@example.com', newEmail: 'new@example.com' },
        }),
      );
    });
  });

  describe('getMe', () => {
    it('returns the current user sourced from the DB, not the stale JWT payload', async () => {
      // JWT carries the pre-change email; the DB has the confirmed new address.
      const req = {
        user: { userId: 'u1', email: 'old@example.com', isSuperAdmin: false, mfa: true },
      };
      users.findById.mockResolvedValue({ id: 'u1', email: 'new@example.com', isSuperAdmin: true });

      const result = await controller.getMe(req as never);

      expect(users.findById).toHaveBeenCalledWith('u1');
      expect(result).toEqual({
        userId: 'u1',
        email: 'new@example.com',
        isSuperAdmin: true,
        mfa: true,
        mfaEnrolmentRequired: false,
      });
    });

    it('reports mfa=false and mfaEnrolmentRequired for a mandatory user without MFA', async () => {
      const req = {
        user: { userId: 'u1', email: 'user@example.com', isSuperAdmin: false, mfa: false },
      };
      const dbUser = { id: 'u1', email: 'user@example.com', isSuperAdmin: false };
      users.findById.mockResolvedValue(dbUser);
      mfa.isEnrolmentRequired.mockResolvedValue(true);

      const result = await controller.getMe(req as never);

      expect(mfa.isEnrolmentRequired).toHaveBeenCalledWith(dbUser, false);
      expect(result).toMatchObject({ mfa: false, mfaEnrolmentRequired: true });
    });

    it('throws when the user no longer exists', async () => {
      const req = { user: { userId: 'gone', email: 'x@example.com', isSuperAdmin: false } };
      users.findById.mockResolvedValue(null);

      await expect(controller.getMe(req as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('deletes the account and clears the auth cookies', async () => {
      const req = { user: { userId: 'u1', email: 'user@example.com', isSuperAdmin: false } };

      await controller.deleteAccount(
        req as never,
        { currentPassword: 'pw' },
        res as unknown as Response,
      );

      expect(auth.deleteAccount).toHaveBeenCalledWith('u1', 'pw');
      expect(res.clearCookie).toHaveBeenCalled();
    });
  });
});
