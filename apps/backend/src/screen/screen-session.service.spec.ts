import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { ScreenSessionService } from './screen-session.service';
import { TokenService } from '../auth/token.service';
import { hashToken } from '../auth/token-hash.util';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, screenSessions } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScreenSessionService', () => {
  let db: DrizzleDB;
  let service: ScreenSessionService;
  let orgId: string;
  let screenId: string;

  const tokens = {
    issueScreenAccessToken: jest.fn().mockResolvedValue({
      token: 'access-token',
      jti: 'jti',
      expiresAt: new Date(Date.now() + 900_000),
    }),
    accessTokenTtlSeconds: 900,
  };

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenSessionService,
        { provide: DRIZZLE, useValue: db },
        { provide: TokenService, useValue: tokens },
      ],
    }).compile();
    service = module.get(ScreenSessionService);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Lobby',
        resolution: '1920x1080',
        location: 'Entrance',
        apiKeyHash: 'hash',
      })
      .returning();
    screenId = screen.id;
  });

  async function rowFor(token: string) {
    const [row] = await db
      .select()
      .from(screenSessions)
      .where(eq(screenSessions.tokenHash, hashToken(token)));
    return row;
  }

  describe('createSession', () => {
    it('issues a refresh token and never stores it in the clear', async () => {
      const session = await service.createSession(screenId, orgId);

      expect(session.refreshToken).toHaveLength(43);
      expect(session.expiresIn).toBe(900);
      const row = await rowFor(session.refreshToken);
      expect(row.screenId).toBe(screenId);
      expect(row.consumedAt).toBeNull();
      const [all] = await db.select().from(screenSessions);
      expect(all.tokenHash).not.toContain(session.refreshToken);
    });
  });

  describe('refresh', () => {
    it('rotates: the old token is consumed and a successor takes its place', async () => {
      const first = await service.createSession(screenId, orgId);

      const result = await service.refresh(first.refreshToken);

      expect(result.status).toBe('ok');
      if (result.status !== 'ok') return;
      expect(result.tokens.refreshToken).not.toBe(first.refreshToken);
      expect((await rowFor(first.refreshToken)).consumedAt).not.toBeNull();
      expect((await rowFor(result.tokens.refreshToken)).consumedAt).toBeNull();
      // Same family: the rotation is one continuous enrolment.
      expect((await rowFor(result.tokens.refreshToken)).familyId).toBe(
        (await rowFor(first.refreshToken)).familyId,
      );
    });

    it('rejects a token that was never issued', async () => {
      expect((await service.refresh('never-issued')).status).toBe('unknown');
    });

    it('rejects an expired token', async () => {
      const session = await service.createSession(screenId, orgId);
      await db
        .update(screenSessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(screenSessions.tokenHash, hashToken(session.refreshToken)));

      expect((await service.refresh(session.refreshToken)).status).toBe('unknown');
    });

    describe('parallel refreshes (the truck-roll case)', () => {
      it('serves every caller that races within the grace window', async () => {
        // State fetch, heartbeat, SSE, HLS and media all hit 401 together and
        // all present the same token. None of them may lose its session.
        const session = await service.createSession(screenId, orgId);

        const results = await Promise.all([
          service.refresh(session.refreshToken),
          service.refresh(session.refreshToken),
          service.refresh(session.refreshToken),
        ]);

        expect(results.every((result) => result.status === 'ok')).toBe(true);
        const issued = results.flatMap((result) =>
          result.status === 'ok' ? [result.tokens.refreshToken] : [],
        );
        expect(new Set(issued).size).toBe(3);
      });

      it('leaves the family intact — a replay is refused, not punished', async () => {
        const session = await service.createSession(screenId, orgId);
        const rotated = await service.refresh(session.refreshToken);
        expect(rotated.status).toBe('ok');

        // Age the tombstone past the grace window.
        await db
          .update(screenSessions)
          .set({ consumedAt: new Date(Date.now() - 120_000) })
          .where(eq(screenSessions.tokenHash, hashToken(session.refreshToken)));

        const replay = await service.refresh(session.refreshToken);

        expect(replay.status).toBe('replayed');
        // The successor still works: revoking the family here would cost a
        // physical visit for what is read access to one playlist.
        if (rotated.status !== 'ok') return;
        expect((await service.refresh(rotated.tokens.refreshToken)).status).toBe('ok');
      });
    });
  });

  describe('revocation', () => {
    it('revokeForScreen ends every session of that screen', async () => {
      await service.createSession(screenId, orgId);
      const second = await service.createSession(screenId, orgId);

      expect(await service.revokeForScreen(screenId)).toBe(2);
      expect((await service.refresh(second.refreshToken)).status).toBe('unknown');
    });

    it('deleting the screen removes its sessions through the foreign key', async () => {
      const session = await service.createSession(screenId, orgId);

      await db.delete(screens).where(eq(screens.id, screenId));

      expect(await rowFor(session.refreshToken)).toBeUndefined();
    });
  });
});
