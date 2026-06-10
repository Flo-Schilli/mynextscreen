import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ACCESS_COOKIE } from './cookies';
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
    jti: 'jti-1',
  };

  beforeEach(() => {
    reflector = new Reflector();
    tokens = { verifyAccessToken: jest.fn() };
    guard = new JwtAuthGuard(reflector, tokens as unknown as TokenService);
  });

  function createMockContext(
    cookies: Record<string, string> = {},
    reflectorValue = false,
  ): { context: ExecutionContext; request: { cookies: Record<string, string>; user?: unknown } } {
    const request = { cookies, user: undefined as unknown };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(reflectorValue);
    return { context, request };
  }

  describe('public / screen routes', () => {
    it('allows @Public()/@ScreenAuth() routes without a token', async () => {
      const { context } = createMockContext({}, true);
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
    it('attaches the user (incl. isSuperAdmin) to the request', async () => {
      tokens.verifyAccessToken.mockResolvedValue(VALID_PAYLOAD);
      const { context, request } = createMockContext({ [ACCESS_COOKIE]: 'good-token' });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(tokens.verifyAccessToken).toHaveBeenCalledWith('good-token');
      expect(request.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        isSuperAdmin: false,
      });
    });

    it('carries isSuperAdmin=true through', async () => {
      tokens.verifyAccessToken.mockResolvedValue({ ...VALID_PAYLOAD, isSuperAdmin: true });
      const { context, request } = createMockContext({ [ACCESS_COOKIE]: 'admin-token' });

      await guard.canActivate(context);
      expect((request.user as { isSuperAdmin: boolean }).isSuperAdmin).toBe(true);
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
