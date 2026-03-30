import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as jose from 'jose';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let configService: ConfigService;

  const HANKO_URL = 'https://test-project.hanko.io';

  // Key pair generated per test run
  let privateKey: CryptoKey;
  let publicKey: CryptoKey;

  beforeAll(async () => {
    const keyPair = await jose.generateKeyPair('RS256');
    privateKey = keyPair.privateKey as CryptoKey;
    publicKey = keyPair.publicKey as CryptoKey;
  });

  beforeEach(() => {
    reflector = new Reflector();
    configService = new ConfigService({ HANKO_API_URL: HANKO_URL });
    guard = new JwtAuthGuard(reflector, configService);
  });

  function createMockContext(
    headers: Record<string, string> = {},
    isPublic = false,
  ): ExecutionContext {
    const request = { headers, user: undefined as unknown };
    const mockContext = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return mockContext;
  }

  async function signToken(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): Promise<string> {
    let builder = new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(HANKO_URL)
      .setSubject(payload.sub as string);
    if (options?.expiresIn) {
      builder = builder.setExpirationTime(options.expiresIn);
    } else {
      builder = builder.setExpirationTime('1h');
    }
    return builder.sign(privateKey);
  }

  function mockJwksToUseTestKey(): void {
    // Override the internal JWKS to use our test public key
    const mockJwks = jest.fn().mockImplementation(async () => {
      const jwk = await jose.exportJWK(publicKey);
      return { ...jwk, alg: 'RS256' };
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (guard as any).jwks = mockJwks;
  }

  describe('public routes', () => {
    it('should allow access to routes decorated with @Public()', async () => {
      const context = createMockContext({}, true);
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('missing token', () => {
    it('should throw UnauthorizedException when no Authorization header', async () => {
      const context = createMockContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when Authorization header has no Bearer scheme', async () => {
      const context = createMockContext({ authorization: 'Basic abc123' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when Bearer token is empty', async () => {
      const context = createMockContext({ authorization: 'Bearer ' });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('valid token', () => {
    it('should allow access and attach user to request', async () => {
      const token = await signToken({
        sub: 'user-123',
        email: 'test@example.com',
      });
      mockJwksToUseTestKey();

      const context = createMockContext({
        authorization: `Bearer ${token}`,
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });
  });

  describe('expired token', () => {
    it('should throw UnauthorizedException for expired token', async () => {
      const token = await signToken(
        { sub: 'user-123', email: 'test@example.com' },
        { expiresIn: '-1s' },
      );
      mockJwksToUseTestKey();

      const context = createMockContext({
        authorization: `Bearer ${token}`,
      });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('malformed token', () => {
    it('should throw UnauthorizedException for malformed token', async () => {
      mockJwksToUseTestKey();

      const context = createMockContext({
        authorization: 'Bearer not.a.valid.jwt.token',
      });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for token with invalid signature', async () => {
      // Sign with a different key
      const otherKeyPair = await jose.generateKeyPair('RS256');
      const token = await new jose.SignJWT({
        sub: 'user-123',
        email: 'test@example.com',
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(HANKO_URL)
        .setSubject('user-123')
        .setExpirationTime('1h')
        .sign(otherKeyPair.privateKey);

      mockJwksToUseTestKey();

      const context = createMockContext({
        authorization: `Bearer ${token}`,
      });
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
