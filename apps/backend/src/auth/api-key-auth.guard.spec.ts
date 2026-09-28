import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { eq } from 'drizzle-orm';
import { hashApiKey, sha256hex } from '../screen/api-key.util';
import { organisations, screens } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let reflector: Reflector;
  let db: DrizzleDB;

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
    guard = new ApiKeyAuthGuard(reflector, db);
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
  ): ExecutionContext {
    const request = {
      headers,
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
});
