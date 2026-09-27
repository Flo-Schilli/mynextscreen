import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '../db/schema';
import type { UserService } from '../user/user.service';
import { removeOrganisationMedia } from '../content/content-storage.util';
import type { PasswordService } from './password.service';
import type { TokenService } from './token.service';
import { AuthService } from './auth.service';

jest.mock('../content/content-storage.util', () => ({
  removeOrganisationMedia: jest.fn().mockResolvedValue(undefined),
}));

const removeOrganisationMediaMock = removeOrganisationMedia as jest.MockedFunction<
  typeof removeOrganisationMedia
>;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: null,
    passwordHash: 'hashed',
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

describe('AuthService', () => {
  let users: jest.Mocked<
    Pick<
      UserService,
      | 'findByEmail'
      | 'findById'
      | 'findByPasswordResetToken'
      | 'setPasswordResetToken'
      | 'setPassword'
      | 'createFirstSuperAdmin'
      | 'createUserWithOrganisation'
      | 'findByEmailVerificationToken'
      | 'markEmailVerified'
      | 'setEmailVerificationToken'
      | 'setPendingEmail'
      | 'findByEmailChangeToken'
      | 'applyEmailChange'
      | 'deleteUser'
      | 'countSuperAdmins'
    >
  >;
  let passwords: jest.Mocked<Pick<PasswordService, 'hash' | 'verify'>>;
  let tokens: jest.Mocked<
    Pick<
      TokenService,
      | 'issueAccessToken'
      | 'issueInitialRefreshToken'
      | 'rotateRefreshToken'
      | 'revokeToken'
      | 'revokeAllForUser'
    >
  >;
  let service: AuthService;

  const issuedAccess = { token: 'access', jti: 'jti', expiresAt: new Date(Date.now() + 1000) };
  const issuedRefresh = {
    token: 'refresh',
    familyId: 'fam',
    expiresAt: new Date(Date.now() + 1000),
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByPasswordResetToken: jest.fn(),
      setPasswordResetToken: jest.fn(),
      setPassword: jest.fn(),
      createFirstSuperAdmin: jest.fn(),
      createUserWithOrganisation: jest.fn(),
      findByEmailVerificationToken: jest.fn(),
      markEmailVerified: jest.fn(),
      setEmailVerificationToken: jest.fn(),
      setPendingEmail: jest.fn(),
      findByEmailChangeToken: jest.fn(),
      applyEmailChange: jest.fn(),
      deleteUser: jest.fn(),
      countSuperAdmins: jest.fn(),
    } as never;
    passwords = { hash: jest.fn(), verify: jest.fn() } as never;
    tokens = {
      issueAccessToken: jest.fn().mockResolvedValue(issuedAccess),
      issueInitialRefreshToken: jest.fn().mockResolvedValue(issuedRefresh),
      rotateRefreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllForUser: jest.fn().mockResolvedValue(0),
    } as never;
    const config = { get: jest.fn(() => '/tmp/media') } as unknown as ConfigService;
    service = new AuthService(
      users as unknown as UserService,
      passwords as unknown as PasswordService,
      tokens as unknown as TokenService,
      config,
    );
    removeOrganisationMediaMock.mockClear();
    removeOrganisationMediaMock.mockResolvedValue(undefined);
  });

  describe('login', () => {
    it('issues tokens for valid credentials', async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(true);

      const result = await service.login('user@example.com', 'pw');
      expect(result.accessToken).toBe(issuedAccess);
      expect(result.refreshToken).toBe(issuedRefresh);
      expect(tokens.issueAccessToken).toHaveBeenCalledWith('user-1', {
        email: 'user@example.com',
        isSuperAdmin: false,
      });
    });

    it('rejects unknown accounts', async () => {
      users.findByEmail.mockResolvedValue(null);
      passwords.verify.mockResolvedValue(false);
      await expect(service.login('nope@example.com', 'pw')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a null-hash (invitee) account even with any password', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ passwordHash: null }));
      passwords.verify.mockResolvedValue(false); // PasswordService.verify(null,...) === false
      await expect(service.login('user@example.com', 'pw')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      users.findByEmail.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(false);
      await expect(service.login('user@example.com', 'bad')).rejects.toThrow(UnauthorizedException);
    });

    it('blocks an unverified account with ForbiddenException even with valid credentials', async () => {
      users.findByEmail.mockResolvedValue(makeUser({ emailVerified: false }));
      passwords.verify.mockResolvedValue(true);
      await expect(service.login('user@example.com', 'pw')).rejects.toThrow(ForbiddenException);
      expect(tokens.issueAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const input = {
      email: 'owner@example.com',
      password: 'supersecret',
      name: 'Owner',
      organisationName: 'Acme',
      storageOriginalLimitBytes: 100,
      storageTranscodedLimitBytes: 200,
    };

    it('hashes the password, mints a token, creates user+org, issues no login tokens', async () => {
      passwords.hash.mockResolvedValue('new-hash');
      users.createUserWithOrganisation.mockResolvedValue(
        makeUser({ id: 'owner-1', email: 'owner@example.com', emailVerified: false }),
      );

      const result = await service.register(input);

      expect(passwords.hash).toHaveBeenCalledWith('supersecret');
      const callArg = users.createUserWithOrganisation.mock.calls[0][0];
      expect(callArg).toMatchObject({
        email: 'owner@example.com',
        passwordHash: 'new-hash',
        name: 'Owner',
        organisationName: 'Acme',
        storageOriginalLimitBytes: 100,
        storageTranscodedLimitBytes: 200,
      });
      expect(typeof callArg.verificationToken).toBe('string');
      expect(callArg.verificationToken.length).toBeGreaterThan(0);
      expect(result.verificationToken).toBe(callArg.verificationToken);
      expect(tokens.issueAccessToken).not.toHaveBeenCalled();
    });

    it('propagates a ConflictException from the user service', async () => {
      passwords.hash.mockResolvedValue('new-hash');
      users.createUserWithOrganisation.mockRejectedValue(new ConflictException('Email in use'));
      await expect(service.register(input)).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('marks verified and auto-logs-in on a valid unexpired token', async () => {
      users.findByEmailVerificationToken.mockResolvedValue(
        makeUser({
          id: 'owner-1',
          emailVerified: false,
          emailVerificationToken: 'tok',
          emailVerificationTokenExpiresAt: new Date(Date.now() + 60_000),
        }),
      );

      const result = await service.verifyEmail('tok');

      expect(users.markEmailVerified).toHaveBeenCalledWith('owner-1');
      expect(result.user.emailVerified).toBe(true);
      expect(result.accessToken).toBe(issuedAccess);
      expect(result.refreshToken).toBe(issuedRefresh);
    });

    it('throws NotFound for an unknown token', async () => {
      users.findByEmailVerificationToken.mockResolvedValue(null);
      await expect(service.verifyEmail('nope')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFound for an expired token', async () => {
      users.findByEmailVerificationToken.mockResolvedValue(
        makeUser({
          emailVerificationToken: 'tok',
          emailVerificationTokenExpiresAt: new Date(Date.now() - 1),
        }),
      );
      await expect(service.verifyEmail('tok')).rejects.toThrow(NotFoundException);
      expect(users.markEmailVerified).not.toHaveBeenCalled();
    });
  });

  describe('createEmailVerificationToken', () => {
    it('persists a fresh token and returns it', async () => {
      const token = await service.createEmailVerificationToken(makeUser({ id: 'owner-1' }));
      expect(typeof token).toBe('string');
      expect(users.setEmailVerificationToken).toHaveBeenCalledWith(
        'owner-1',
        token,
        expect.any(Date),
      );
    });
  });

  describe('changeEmail', () => {
    it('verifies the password, parks the new email, returns old+new+token', async () => {
      users.findById.mockResolvedValue(makeUser({ id: 'u1', email: 'old@example.com' }));
      passwords.verify.mockResolvedValue(true);

      const result = await service.changeEmail('u1', 'New@Example.com', 'pw');

      expect(result.oldEmail).toBe('old@example.com');
      expect(result.newEmail).toBe('new@example.com');
      expect(typeof result.changeToken).toBe('string');
      expect(users.setPendingEmail).toHaveBeenCalledWith(
        'u1',
        'new@example.com',
        result.changeToken,
        expect.any(Date),
      );
    });

    it('throws Unauthorized on a wrong current password', async () => {
      users.findById.mockResolvedValue(makeUser({ id: 'u1' }));
      passwords.verify.mockResolvedValue(false);
      await expect(service.changeEmail('u1', 'new@example.com', 'bad')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(users.setPendingEmail).not.toHaveBeenCalled();
    });

    it('throws NotFound for an unknown user', async () => {
      users.findById.mockResolvedValue(null);
      await expect(service.changeEmail('ghost', 'new@example.com', 'pw')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirmEmailChange', () => {
    it('applies the change on a valid unexpired token', async () => {
      users.findByEmailChangeToken.mockResolvedValue(
        makeUser({ id: 'u1', emailChangeTokenExpiresAt: new Date(Date.now() + 60_000) }),
      );
      await service.confirmEmailChange('tok');
      expect(users.applyEmailChange).toHaveBeenCalledWith('u1');
    });

    it('throws NotFound for an expired token', async () => {
      users.findByEmailChangeToken.mockResolvedValue(
        makeUser({ emailChangeTokenExpiresAt: new Date(Date.now() - 1) }),
      );
      await expect(service.confirmEmailChange('tok')).rejects.toThrow(NotFoundException);
      expect(users.applyEmailChange).not.toHaveBeenCalled();
    });

    it('throws NotFound for an unknown token', async () => {
      users.findByEmailChangeToken.mockResolvedValue(null);
      await expect(service.confirmEmailChange('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setupFirstSuperAdmin', () => {
    it('hashes the password, creates the first super-admin and issues tokens', async () => {
      passwords.hash.mockResolvedValue('new-hash');
      users.createFirstSuperAdmin.mockResolvedValue(
        makeUser({ id: 'admin-1', email: 'admin@example.com', isSuperAdmin: true }),
      );

      const result = await service.setupFirstSuperAdmin('admin@example.com', 'supersecret', 'Boss');

      expect(passwords.hash).toHaveBeenCalledWith('supersecret');
      expect(users.createFirstSuperAdmin).toHaveBeenCalledWith(
        'admin@example.com',
        'new-hash',
        'Boss',
      );
      expect(result.accessToken).toBe(issuedAccess);
      expect(result.refreshToken).toBe(issuedRefresh);
      expect(tokens.issueAccessToken).toHaveBeenCalledWith('admin-1', {
        email: 'admin@example.com',
        isSuperAdmin: true,
      });
    });

    it('passes a null name through when none is provided', async () => {
      passwords.hash.mockResolvedValue('new-hash');
      users.createFirstSuperAdmin.mockResolvedValue(makeUser({ isSuperAdmin: true }));

      await service.setupFirstSuperAdmin('admin@example.com', 'supersecret');

      expect(users.createFirstSuperAdmin).toHaveBeenCalledWith(
        'admin@example.com',
        'new-hash',
        null,
      );
    });

    it('propagates the conflict when setup is already completed', async () => {
      passwords.hash.mockResolvedValue('new-hash');
      users.createFirstSuperAdmin.mockRejectedValue(
        new ConflictException('Setup already completed'),
      );

      await expect(
        service.setupFirstSuperAdmin('admin@example.com', 'supersecret'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('refresh', () => {
    it('rotates and re-issues an access token', async () => {
      tokens.rotateRefreshToken.mockResolvedValue({
        status: 'ok',
        userId: 'user-1',
        familyId: 'fam',
        next: issuedRefresh,
      });
      users.findById.mockResolvedValue(makeUser());

      const result = await service.refresh('raw');
      expect(result.accessToken).toBe(issuedAccess);
      expect(result.refreshToken).toBe(issuedRefresh);
    });

    it('throws on an unknown refresh token', async () => {
      tokens.rotateRefreshToken.mockResolvedValue({ status: 'unknown' });
      await expect(service.refresh('raw')).rejects.toThrow(UnauthorizedException);
    });

    it('throws on detected reuse', async () => {
      tokens.rotateRefreshToken.mockResolvedValue({ status: 'reuse', familyId: 'fam' });
      await expect(service.refresh('raw')).rejects.toThrow(UnauthorizedException);
    });

    it('throws if the user disappeared after rotation', async () => {
      tokens.rotateRefreshToken.mockResolvedValue({
        status: 'ok',
        userId: 'user-1',
        familyId: 'fam',
        next: issuedRefresh,
      });
      users.findById.mockResolvedValue(null);
      await expect(service.refresh('raw')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the refresh token family', async () => {
      tokens.revokeToken.mockResolvedValue('fam');
      await service.logout('raw');
      expect(tokens.revokeToken).toHaveBeenCalledWith('raw');
    });
  });

  describe('changePassword', () => {
    it('updates the password when the current one matches', async () => {
      users.findById.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(true);
      passwords.hash.mockResolvedValue('new-hash');

      await service.changePassword('user-1', 'old', 'newpassword');
      expect(users.setPassword).toHaveBeenCalledWith('user-1', 'new-hash');
    });

    it('revokes every existing session and issues a fresh one for the caller', async () => {
      users.findById.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(true);
      passwords.hash.mockResolvedValue('new-hash');

      const result = await service.changePassword('user-1', 'old', 'newpassword');

      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
      // The new pair must be minted AFTER the revocation, otherwise it is killed too.
      expect(tokens.revokeAllForUser.mock.invocationCallOrder[0]).toBeLessThan(
        tokens.issueInitialRefreshToken.mock.invocationCallOrder[0],
      );
      expect(result.accessToken).toBe(issuedAccess);
      expect(result.refreshToken).toBe(issuedRefresh);
    });

    it('keeps sessions alive when the current password is wrong', async () => {
      users.findById.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(false);

      await expect(service.changePassword('user-1', 'bad', 'new')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('throws when the user is missing', async () => {
      users.findById.mockResolvedValue(null);
      await expect(service.changePassword('user-1', 'old', 'new')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the current password is wrong', async () => {
      users.findById.mockResolvedValue(makeUser());
      passwords.verify.mockResolvedValue(false);
      await expect(service.changePassword('user-1', 'bad', 'new')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('deleteAccount', () => {
    it('throws Unauthorized when the current password is wrong', async () => {
      users.findById.mockResolvedValue(makeUser({ id: 'u1' }));
      passwords.verify.mockResolvedValue(false);

      await expect(service.deleteAccount('u1', 'bad')).rejects.toThrow(UnauthorizedException);
      expect(users.deleteUser).not.toHaveBeenCalled();
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('throws NotFound when the user is missing', async () => {
      users.findById.mockResolvedValue(null);
      await expect(service.deleteAccount('ghost', 'pw')).rejects.toThrow(NotFoundException);
    });

    it('refuses to delete the last super-admin (lockout protection)', async () => {
      // The guard is now atomic inside deleteUser (row lock + re-count); the
      // service delegates with guardLastSuperAdmin and surfaces its 403.
      users.findById.mockResolvedValue(makeUser({ id: 'sa', isSuperAdmin: true }));
      passwords.verify.mockResolvedValue(true);
      users.deleteUser.mockRejectedValue(
        new ForbiddenException('Cannot delete the last super-admin'),
      );

      await expect(service.deleteAccount('sa', 'pw')).rejects.toThrow(ForbiddenException);
      expect(users.deleteUser).toHaveBeenCalledWith('sa', { guardLastSuperAdmin: true });
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('allows deleting a super-admin when others remain', async () => {
      users.findById.mockResolvedValue(makeUser({ id: 'sa', isSuperAdmin: true }));
      passwords.verify.mockResolvedValue(true);
      users.deleteUser.mockResolvedValue([]);

      await service.deleteAccount('sa', 'pw');
      expect(users.deleteUser).toHaveBeenCalledWith('sa', { guardLastSuperAdmin: true });
    });

    it('deletes the user, revokes tokens, and wipes orphaned-org media (happy path)', async () => {
      users.findById.mockResolvedValue(makeUser({ id: 'u1' }));
      passwords.verify.mockResolvedValue(true);
      users.deleteUser.mockResolvedValue(['org-1', 'org-2']);

      await service.deleteAccount('u1', 'pw');

      expect(users.deleteUser).toHaveBeenCalledWith('u1', { guardLastSuperAdmin: true });
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('u1');
      expect(removeOrganisationMediaMock).toHaveBeenCalledTimes(2);
      expect(removeOrganisationMediaMock).toHaveBeenCalledWith('/tmp/media', 'org-1');
      expect(removeOrganisationMediaMock).toHaveBeenCalledWith('/tmp/media', 'org-2');
    });

    it('swallows a media-cleanup error (deletion already committed)', async () => {
      users.findById.mockResolvedValue(makeUser({ id: 'u1' }));
      passwords.verify.mockResolvedValue(true);
      users.deleteUser.mockResolvedValue(['org-1']);
      removeOrganisationMediaMock.mockRejectedValue(new Error('fs boom'));

      await expect(service.deleteAccount('u1', 'pw')).resolves.toBeUndefined();
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('u1');
    });
  });

  describe('setPassword', () => {
    it('sets the password for a valid, unexpired token', async () => {
      users.findByPasswordResetToken.mockResolvedValue(
        makeUser({
          passwordResetToken: 'tok',
          passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
        }),
      );
      passwords.hash.mockResolvedValue('new-hash');

      await service.setPassword('tok', 'newpassword');
      expect(users.setPassword).toHaveBeenCalledWith('user-1', 'new-hash');
    });

    it('revokes every existing session (a reset must log out a thief)', async () => {
      users.findByPasswordResetToken.mockResolvedValue(
        makeUser({
          passwordResetToken: 'tok',
          passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
        }),
      );
      passwords.hash.mockResolvedValue('new-hash');

      await service.setPassword('tok', 'newpassword');

      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });

    it('throws for an unknown token', async () => {
      users.findByPasswordResetToken.mockResolvedValue(null);
      await expect(service.setPassword('tok', 'new')).rejects.toThrow(NotFoundException);
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('throws for an expired token', async () => {
      users.findByPasswordResetToken.mockResolvedValue(
        makeUser({
          passwordResetToken: 'tok',
          passwordResetTokenExpiresAt: new Date(Date.now() - 1000),
        }),
      );
      await expect(service.setPassword('tok', 'new')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPasswordResetToken', () => {
    it('persists a reset token and returns it', async () => {
      const token = await service.createPasswordResetToken(makeUser());
      expect(token).toBeTruthy();
      expect(users.setPasswordResetToken).toHaveBeenCalledWith('user-1', token, expect.any(Date));
    });
  });
});
