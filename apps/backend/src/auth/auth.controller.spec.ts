import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
} from '../audit-log/audit.events';
import type { User } from '../db/schema';

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

  beforeEach(() => {
    auth = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      createEmailVerificationToken: jest.fn(),
      createPasswordResetToken: jest.fn(),
      login: jest.fn(),
      changePassword: jest.fn(),
      changeEmail: jest.fn(),
      confirmEmailChange: jest.fn(),
      deleteAccount: jest.fn(),
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

    controller = new AuthController(
      auth as unknown as AuthService,
      config,
      users as unknown as UserService,
      events as unknown as EventEmitter2,
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
        user: makeUser({ id: 'u9', email: 'v@example.com' }),
        accessToken: issuedAccess,
        refreshToken: issuedRefresh,
      });

      const result = await controller.verifyEmail({ token: 't' }, res as unknown as Response);

      expect(auth.verifyEmail).toHaveBeenCalledWith('t');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result.user).toEqual({ userId: 'u9', email: 'v@example.com', isSuperAdmin: false });
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

  describe('forgotPassword', () => {
    it('emits a reset event (no org context) for a known account', async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      auth.createPasswordResetToken.mockResolvedValue('rtok');

      await controller.forgotPassword({ email: 'user@example.com' });

      expect(events.emit).toHaveBeenCalledWith(
        AUTH_PASSWORD_RESET_REQUESTED,
        expect.objectContaining({ email: 'user@example.com', resetToken: 'rtok' }),
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

  describe('changePassword', () => {
    it('changes the password then emits a password-changed notice', async () => {
      const req = { user: { userId: 'u1', email: 'user@example.com', isSuperAdmin: false } };

      await controller.changePassword(req as never, {
        currentPassword: 'old',
        newPassword: 'newsecret',
      });

      expect(auth.changePassword).toHaveBeenCalledWith('u1', 'old', 'newsecret');
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_PASSWORD_CHANGED,
        expect.objectContaining({ email: 'user@example.com' }),
      );
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
    });
  });

  describe('confirmEmailChange', () => {
    it('delegates to the auth service', async () => {
      await controller.confirmEmailChange({ token: 'ctok' });
      expect(auth.confirmEmailChange).toHaveBeenCalledWith('ctok');
    });
  });

  describe('getMe', () => {
    it('returns the current user sourced from the DB, not the stale JWT payload', async () => {
      // JWT carries the pre-change email; the DB has the confirmed new address.
      const req = { user: { userId: 'u1', email: 'old@example.com', isSuperAdmin: false } };
      users.findById.mockResolvedValue({ id: 'u1', email: 'new@example.com', isSuperAdmin: true });

      const result = await controller.getMe(req as never);

      expect(users.findById).toHaveBeenCalledWith('u1');
      expect(result).toEqual({ userId: 'u1', email: 'new@example.com', isSuperAdmin: true });
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
