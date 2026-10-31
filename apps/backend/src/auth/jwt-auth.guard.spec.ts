import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ACCESS_COOKIE } from './cookies';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ALLOW_WITHOUT_MFA_KEY } from './mfa/allow-without-mfa.decorator';
import type { TokenService } from './token.service';
import type { AccessTokenPayload } from './token.types';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let tokens: { verifyAccessToken: jest.Mock };

  const VALID_PAYLOAD: AccessTokenPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    isSuperAdmin: false,
    mfa: false,
    jti: 'jti-1',
  };

  beforeEach(() => {
    reflector = new Reflector();
    tokens = { verifyAccessToken: jest.fn() };
    guard = new JwtAuthGuard(reflector, tokens as unknown as TokenService);
  });

  function createMockContext(
    cookies: Record<string, string> = {},
    metadata: Record<string, boolean> = {},
  ): { context: ExecutionContext; request: { cookies: Record<string, string>; user?: unknown } } {
    const request = { cookies, user: undefined as unknown };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => metadata[key as string] ?? false);
    return { context, request };
  }

  describe('public / screen routes', () => {
    it('allows @Public()/@ScreenAuth() routes without a token', async () => {
      const { context } = createMockContext({}, { [IS_PUBLIC_KEY]: true });
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('missing token', () => {
    it('throws when the access cookie is absent', async () => {
      const { context } = createMockContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the access cookie is empty', async () => {
      const { context } = createMockContext({ [ACCESS_COOKIE]: '' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('valid token', () => {
    it('attaches the user (incl. isSuperAdmin and mfa) to the request', async () => {
      tokens.verifyAccessToken.mockResolvedValue(VALID_PAYLOAD);
      const { context, request } = createMockContext({ [ACCESS_COOKIE]: 'good-token' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(tokens.verifyAccessToken).toHaveBeenCalledWith('good-token');
      expect(request.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        isSuperAdmin: false,
        mfa: false,
      });
    });

    it('lets an MFA-confirmed super-admin through', async () => {
      tokens.verifyAccessToken.mockResolvedValue({
        ...VALID_PAYLOAD,
        isSuperAdmin: true,
        mfa: true,
      });
      const { context, request } = createMockContext({ [ACCESS_COOKIE]: 'admin-token' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect((request.user as { isSuperAdmin: boolean }).isSuperAdmin).toBe(true);
    });
  });

  describe('super-admin MFA enforcement', () => {
    async function rejection(context: ExecutionContext): Promise<ForbiddenException> {
      try {
        await guard.canActivate(context);
      } catch (error: unknown) {
        if (error instanceof ForbiddenException) {
          return error;
        }
        throw error;
      }
      throw new Error('expected the guard to reject');
    }

    // A pre-MFA token arrives here as mfa=false (TokenService normalises the
    // missing claim, see token.service.spec), so this also covers the upgrade.
    it('answers 403 MFA_ENROLMENT_REQUIRED for a super-admin session without mfa', async () => {
      tokens.verifyAccessToken.mockResolvedValue({ ...VALID_PAYLOAD, isSuperAdmin: true });
      const { context, request } = createMockContext({ [ACCESS_COOKIE]: 'admin-token' });

      const error = await rejection(context);
      expect(error.getResponse()).toMatchObject({ code: 'MFA_ENROLMENT_REQUIRED' });
      // The user is still attached: the session itself is valid.
      expect(request.user).toMatchObject({ userId: 'user-123', mfa: false });
    });

    it('allows @AllowWithoutMfa routes for a super-admin without mfa', async () => {
      tokens.verifyAccessToken.mockResolvedValue({ ...VALID_PAYLOAD, isSuperAdmin: true });
      const { context } = createMockContext(
        { [ACCESS_COOKIE]: 'admin-token' },
        { [ALLOW_WITHOUT_MFA_KEY]: true },
      );

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('does not require mfa from regular users (org policy is enforced elsewhere)', async () => {
      tokens.verifyAccessToken.mockResolvedValue(VALID_PAYLOAD);
      const { context } = createMockContext({ [ACCESS_COOKIE]: 'user-token' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('invalid token', () => {
    it('throws when verification fails (expired / bad signature)', async () => {
      tokens.verifyAccessToken.mockRejectedValue(new Error('jwt expired'));
      const { context } = createMockContext({ [ACCESS_COOKIE]: 'bad-token' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
