import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { SiteAgentSessionService } from './site-agent-session.service';
import { TokenService } from '../auth/token.service';
import { hashToken } from '../auth/token-hash.util';
import { DRIZZLE } from '../db/database.constants';
import { organisations, siteAgents, siteAgentSessions } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('SiteAgentSessionService', () => {
  let db: DrizzleDB;
  let service: SiteAgentSessionService;
  let orgId: string;
  let agentId: string;

  const tokens = {
    issueAgentAccessToken: jest.fn().mockResolvedValue({
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
        SiteAgentSessionService,
        { provide: DRIZZLE, useValue: db },
        { provide: TokenService, useValue: tokens },
      ],
    }).compile();
    service = module.get(SiteAgentSessionService);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue North' })
      .returning();
    agentId = agent.id;
  });

  async function rowFor(token: string) {
    const [row] = await db
      .select()
      .from(siteAgentSessions)
      .where(eq(siteAgentSessions.tokenHash, hashToken(token)));
    return row;
  }

  describe('createSession', () => {
    it('stores only the hash of the refresh token', async () => {
      const session = await service.createSession(agentId, orgId);

      const stored = await rowFor(session.refreshToken);
      expect(stored).toBeDefined();
      expect(stored.tokenHash).toBe(hashToken(session.refreshToken));
      expect(stored.tokenHash).not.toBe(session.refreshToken);
    });

    it('scopes the session to the agent and its organisation', async () => {
      const session = await service.createSession(agentId, orgId);

      const stored = await rowFor(session.refreshToken);
      expect(stored.agentId).toBe(agentId);
      expect(stored.organisationId).toBe(orgId);
      expect(tokens.issueAgentAccessToken).toHaveBeenCalledWith(agentId, orgId);
    });

    it('starts a new family per enrolment', async () => {
      const first = await service.createSession(agentId, orgId);
      const second = await service.createSession(agentId, orgId);

      const a = await rowFor(first.refreshToken);
      const b = await rowFor(second.refreshToken);
      expect(a.familyId).not.toBe(b.familyId);
    });

    it('returns a relative lifetime, never an absolute instant', async () => {
      const session = await service.createSession(agentId, orgId);

      expect(session.expiresIn).toBe(900);
    });
  });

  describe('refresh', () => {
    it('rotates to a successor in the same family', async () => {
      const first = await service.createSession(agentId, orgId);

      const result = await service.refresh(first.refreshToken);

      expect(result.status).toBe('ok');
      if (result.status !== 'ok') return;
      expect(result.agentId).toBe(agentId);
      const old = await rowFor(first.refreshToken);
      const next = await rowFor(result.tokens.refreshToken);
      expect(old.consumedAt).not.toBeNull();
      expect(next.familyId).toBe(old.familyId);
      expect(next.consumedAt).toBeNull();
    });

    it('keeps the consumed row as a tombstone rather than updating in place', async () => {
      const first = await service.createSession(agentId, orgId);

      await service.refresh(first.refreshToken);

      const rows = await db
        .select()
        .from(siteAgentSessions)
        .where(eq(siteAgentSessions.agentId, agentId));
      expect(rows).toHaveLength(2);
    });

    it('treats a second refresh inside the grace window as a race, not a replay', async () => {
      const first = await service.createSession(agentId, orgId);
      await service.refresh(first.refreshToken);

      const racing = await service.refresh(first.refreshToken);

      expect(racing.status).toBe('ok');
    });

    it('refuses a replay outside the grace window but leaves the family intact', async () => {
      const first = await service.createSession(agentId, orgId);
      await service.refresh(first.refreshToken);
      // Backdate the tombstone past the 60s grace window.
      await db
        .update(siteAgentSessions)
        .set({ consumedAt: new Date(Date.now() - 120_000) })
        .where(eq(siteAgentSessions.tokenHash, hashToken(first.refreshToken)));

      const replay = await service.refresh(first.refreshToken);

      expect(replay.status).toBe('replayed');
      const survivors = await db
        .select()
        .from(siteAgentSessions)
        .where(eq(siteAgentSessions.agentId, agentId));
      expect(survivors.length).toBeGreaterThan(0);
    });

    it('returns unknown for a token that was never issued', async () => {
      const result = await service.refresh('not-a-real-token');

      expect(result.status).toBe('unknown');
    });

    it('returns unknown for an expired token', async () => {
      const first = await service.createSession(agentId, orgId);
      await db
        .update(siteAgentSessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(siteAgentSessions.tokenHash, hashToken(first.refreshToken)));

      const result = await service.refresh(first.refreshToken);

      expect(result.status).toBe('unknown');
    });
  });

  describe('revokeForAgent', () => {
    it('deletes every session of that agent', async () => {
      await service.createSession(agentId, orgId);
      await service.createSession(agentId, orgId);

      const revoked = await service.revokeForAgent(agentId);

      expect(revoked).toBe(2);
      const rows = await db
        .select()
        .from(siteAgentSessions)
        .where(eq(siteAgentSessions.agentId, agentId));
      expect(rows).toHaveLength(0);
    });

    it('leaves another agent untouched', async () => {
      const [other] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'Venue South' })
        .returning();
      await service.createSession(agentId, orgId);
      await service.createSession(other.id, orgId);

      await service.revokeForAgent(agentId);

      const rows = await db
        .select()
        .from(siteAgentSessions)
        .where(eq(siteAgentSessions.agentId, other.id));
      expect(rows).toHaveLength(1);
    });

    it('reports zero when the agent had no sessions', async () => {
      expect(await service.revokeForAgent(agentId)).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('drops rows more than a day past expiry and keeps live ones', async () => {
      const live = await service.createSession(agentId, orgId);
      const stale = await service.createSession(agentId, orgId);
      await db
        .update(siteAgentSessions)
        .set({ expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) })
        .where(eq(siteAgentSessions.tokenHash, hashToken(stale.refreshToken)));

      const removed = await service.cleanupExpired();

      expect(removed).toBe(1);
      expect(await rowFor(live.refreshToken)).toBeDefined();
    });
  });
});
