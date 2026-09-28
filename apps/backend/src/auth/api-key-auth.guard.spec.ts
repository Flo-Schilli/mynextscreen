import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { IS_SIGNED_MEDIA_KEY } from './signed-media.decorator';
import { eq } from 'drizzle-orm';
import { hashApiKey, sha256hex } from '../screen/api-key.util';
import { organisations, screens } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import type { ConfigService } from '@nestjs/config';
import { MediaUrlSigner } from '../common/media-url-signer.service';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

const TEST_SECRET = 'x'.repeat(48);

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let reflector: Reflector;
  let db: DrizzleDB;
  let signer: MediaUrlSigner;
  let tokenService: TokenService;

  const VALID_API_KEY = 'test-api-key-1234567890abcdef';
  let validKeyHash: string;

  beforeAll(async () => {
    db = await initTestDb();
    validKeyHash = await hashApiKey(VALID_API_KEY);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    reflector = new Reflector();
    signer = new MediaUrlSigner({ getOrThrow: () => TEST_SECRET } as unknown as ConfigService);
    // Real TokenService so the audience separation is exercised, not stubbed.
    tokenService = new TokenService(
      new JwtService({}),
      {
        get: (_key: string, fallback?: unknown) => fallback,
        getOrThrow: () => TEST_SECRET,
      } as unknown as ConfigService,
      { get: jest.fn(), set: jest.fn(), del: jest.fn() } as never,
    );
    guard = new ApiKeyAuthGuard(reflector, db, signer, tokenService);
  });

  /** Seed an organisation and a screen carrying the given api-key hash. */
  async function seedScreen(
    apiKeyHash: string,
    apiKeyFingerprint: string | null = null,
  ): Promise<{ screenId: string; orgId: string }> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: org.id,
        name: 'Lobby',
        resolution: '1920x1080',
        location: 'Entrance',
        apiKeyHash,
        apiKeyFingerprint,
      })
      .returning();
    return { screenId: screen.id, orgId: org.id };
  }

  function createMockContext(
    headers: Record<string, string> = {},
    isScreenAuth = true,
    options: { path?: string; query?: Record<string, string>; signedMedia?: boolean } = {},
  ): ExecutionContext {
    const path = options.path ?? '/api/screens/me';
    const query = options.query ?? {};
    const request = {
      headers,
      path,
      query,
      screenId: undefined as string | undefined,
      organisationId: undefined as string | undefined,
    };

    const mockContext = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_SCREEN_AUTH_KEY) return isScreenAuth;
      if (key === IS_SIGNED_MEDIA_KEY) return options.signedMedia === true;
      return false;
    });

    return mockContext;
  }

  describe('non-screen-auth routes', () => {
    it('should skip and allow access when route is not @ScreenAuth()', async () => {
      await seedScreen(validKeyHash);
      const context = createMockContext({}, false);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBeUndefined();
      expect(request.organisationId).toBeUndefined();
    });
  });

  describe('missing header', () => {
    it('should throw UnauthorizedException when no Authorization header', async () => {
      const context = createMockContext({});
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Missing API key');
    });

    it('should throw UnauthorizedException when Authorization has no Bearer scheme', async () => {
      const context = createMockContext({ authorization: 'Basic abc123' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Bearer token is empty', async () => {
      const context = createMockContext({ authorization: 'Bearer ' });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('invalid key', () => {
    it('should throw UnauthorizedException when API key does not match any screen', async () => {
      await seedScreen(validKeyHash);

      const context = createMockContext({ authorization: 'Bearer wrong-api-key' });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key');
    });

    it('should throw UnauthorizedException when no screens exist', async () => {
      const context = createMockContext({ authorization: `Bearer ${VALID_API_KEY}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('valid key', () => {
    it('should allow access and attach screenId and organisationId to request', async () => {
      const { screenId, orgId } = await seedScreen(validKeyHash);

      const context = createMockContext({ authorization: `Bearer ${VALID_API_KEY}` });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBe(screenId);
      expect(request.organisationId).toBe(orgId);
    });

    it('should match the correct screen among multiple screens', async () => {
      await seedScreen(await hashApiKey('other-api-key'));
      const { screenId, orgId } = await seedScreen(validKeyHash);

      const context = createMockContext({ authorization: `Bearer ${VALID_API_KEY}` });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBe(screenId);
      expect(request.organisationId).toBe(orgId);
    });
  });

  describe('fingerprint lookup', () => {
    it('authenticates a screen through its indexed fingerprint', async () => {
      const { screenId } = await seedScreen(validKeyHash, sha256hex(VALID_API_KEY));
      const context = createMockContext({ authorization: `Bearer ${VALID_API_KEY}` });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(context.switchToHttp().getRequest().screenId).toBe(screenId);
    });

    it('still rejects a key whose fingerprint collides but whose hash does not', async () => {
      // The bcrypt check runs on the row the fingerprint found, so a row
      // carrying someone else's fingerprint cannot be used to log in.
      await seedScreen(await hashApiKey('a-different-key'), sha256hex(VALID_API_KEY));
      const context = createMockContext({ authorization: `Bearer ${VALID_API_KEY}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('authenticates a legacy screen and backfills its fingerprint', async () => {
      const { screenId } = await seedScreen(validKeyHash, null);
      const context = createMockContext({ authorization: `Bearer ${VALID_API_KEY}` });

      await expect(guard.canActivate(context)).resolves.toBe(true);

      const [row] = await db.select().from(screens).where(eq(screens.id, screenId));
      expect(row.apiKeyFingerprint).toBe(sha256hex(VALID_API_KEY));
    });

    it('does not touch legacy rows when the key is wrong', async () => {
      const { screenId } = await seedScreen(validKeyHash, null);
      const context = createMockContext({ authorization: 'Bearer wrong-key' });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

      const [row] = await db.select().from(screens).where(eq(screens.id, screenId));
      expect(row.apiKeyFingerprint).toBeNull();
    });
  });

  describe('signed media URLs', () => {
    const MEDIA_PATH = '/api/media/org-1/content-1';

    function signedQuery(screenId: string, path = MEDIA_PATH): Record<string, string> {
      const url = signer.sign(screenId, path);
      const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      return { s: params.get('s') ?? '', sig: params.get('sig') ?? '' };
    }

    it('authenticates a screen from a valid signature, without any credential', async () => {
      const { screenId, orgId } = await seedScreen(validKeyHash, sha256hex(VALID_API_KEY));
      const context = createMockContext({}, true, {
        path: MEDIA_PATH,
        query: signedQuery(screenId),
        signedMedia: true,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBe(screenId);
      expect(request.organisationId).toBe(orgId);
    });

    it('ignores unknown query parameters — an un-migrated player still works', async () => {
      // The rollout depends on this: a player from before the change appends
      // `&token=<apiKey>` to the signed URL it was given.
      const { screenId } = await seedScreen(validKeyHash, sha256hex(VALID_API_KEY));
      const context = createMockContext({}, true, {
        path: MEDIA_PATH,
        query: { ...signedQuery(screenId), token: VALID_API_KEY, cacheBust: '42' },
        signedMedia: true,
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('rejects a signature minted for a different path', async () => {
      const { screenId } = await seedScreen(validKeyHash, sha256hex(VALID_API_KEY));
      const context = createMockContext({}, true, {
        path: MEDIA_PATH,
        query: signedQuery(screenId, '/api/media/org-1/another-content'),
        signedMedia: true,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a signature for a screen that no longer exists', async () => {
      const context = createMockContext({}, true, {
        path: MEDIA_PATH,
        query: signedQuery('11111111-1111-1111-1111-111111111111'),
        signedMedia: true,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('does not accept a signature on a route that is not media', async () => {
      const { screenId } = await seedScreen(validKeyHash, sha256hex(VALID_API_KEY));
      const context = createMockContext({}, true, {
        path: MEDIA_PATH,
        query: signedQuery(screenId),
        signedMedia: false,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('screen session tokens', () => {
    it('authenticates a screen from its access token, with no database lookup of the key', async () => {
      const { screenId, orgId } = await seedScreen(validKeyHash, sha256hex(VALID_API_KEY));
      const { token } = await tokenService.issueScreenAccessToken(screenId, orgId);
      const context = createMockContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.screenId).toBe(screenId);
      expect(request.organisationId).toBe(orgId);
    });

    it('refuses a user access token — the audience makes them different kinds', async () => {
      // Same secret and issuer: without the separate audience this would
      // authenticate as a screen whose id happens to be a user id.
      const { token } = await tokenService.issueAccessToken(
        '11111111-1111-1111-1111-111111111111',
        {
          email: 'user@example.com',
          isSuperAdmin: true,
        },
      );
      const context = createMockContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('refuses a screen token whose signature was made with another secret', async () => {
      const foreign = new TokenService(
        new JwtService({}),
        {
          get: (_key: string, fallback?: unknown) => fallback,
          getOrThrow: () => 'y'.repeat(48),
        } as unknown as ConfigService,
        { get: jest.fn(), set: jest.fn(), del: jest.fn() } as never,
      );
      const { token } = await foreign.issueScreenAccessToken(
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      );
      const context = createMockContext({ authorization: `Bearer ${token}` });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
