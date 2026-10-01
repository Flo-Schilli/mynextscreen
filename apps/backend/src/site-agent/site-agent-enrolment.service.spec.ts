import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { TokenService } from '../auth/token.service';
import { hashToken } from '../auth/token-hash.util';
import { DRIZZLE } from '../db/database.constants';
import { organisations, siteAgents, siteAgentEnrolments } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('SiteAgentEnrolmentService', () => {
  let db: DrizzleDB;
  let service: SiteAgentEnrolmentService;
  let sessions: SiteAgentSessionService;
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
        SiteAgentEnrolmentService,
        SiteAgentSessionService,
        { provide: DRIZZLE, useValue: db },
        { provide: TokenService, useValue: tokens },
      ],
    }).compile();
    service = module.get(SiteAgentEnrolmentService);
    sessions = module.get(SiteAgentSessionService);

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

  describe('issue', () => {
    it('stores only the hash of the token', async () => {
      const issued = await service.issue(agentId, orgId);

      const [row] = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.agentId, agentId));
      expect(row.tokenHash).toBe(hashToken(issued.token));
      expect(row.tokenHash).not.toBe(issued.token);
    });

    it('supersedes an earlier unredeemed token instead of accumulating', async () => {
      const first = await service.issue(agentId, orgId);

      const second = await service.issue(agentId, orgId);

      const rows = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.agentId, agentId));
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(hashToken(second.token));
      await expect(service.redeem(first.token)).rejects.toThrow(UnauthorizedException);
    });

    it('keeps a redeemed token as the tombstone when a new one is issued', async () => {
      const first = await service.issue(agentId, orgId);
      await service.redeem(first.token);

      await service.issue(agentId, orgId);

      const rows = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.agentId, agentId));
      expect(rows).toHaveLength(2);
      await expect(service.redeem(first.token)).rejects.toThrow(GoneException);
    });
  });

  describe('redeem', () => {
    it('returns a session scoped to the agent organisation', async () => {
      const issued = await service.issue(agentId, orgId);

      const result = await service.redeem(issued.token);

      expect(result.agentId).toBe(agentId);
      expect(result.organisationId).toBe(orgId);
      expect(result.tokens.refreshToken).toEqual(expect.any(String));
      expect(tokens.issueAgentAccessToken).toHaveBeenCalledWith(agentId, orgId);
    });

    it('marks the token consumed', async () => {
      const issued = await service.issue(agentId, orgId);

      await service.redeem(issued.token);

      const [row] = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.tokenHash, hashToken(issued.token)));
      expect(row.consumedAt).not.toBeNull();
    });

    it('lets exactly one of two concurrent redemptions win', async () => {
      const issued = await service.issue(agentId, orgId);

      const results = await Promise.allSettled([
        service.redeem(issued.token),
        service.redeem(issued.token),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('rejects a second redemption with 410 so the operator knows it was used', async () => {
      const issued = await service.issue(agentId, orgId);
      await service.redeem(issued.token);

      await expect(service.redeem(issued.token)).rejects.toThrow(GoneException);
    });

    it('rejects an unknown token with 401 and no hint that it never existed', async () => {
      await expect(service.redeem('never-issued')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired token with 401, not 410', async () => {
      const issued = await service.issue(agentId, orgId);
      await db
        .update(siteAgentEnrolments)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(siteAgentEnrolments.tokenHash, hashToken(issued.token)));

      await expect(service.redeem(issued.token)).rejects.toThrow(UnauthorizedException);
    });

    it('issues a working session, not just a token pair', async () => {
      const issued = await service.issue(agentId, orgId);

      const result = await service.redeem(issued.token);

      const refreshed = await sessions.refresh(result.tokens.refreshToken);
      expect(refreshed.status).toBe('ok');
    });
  });

  describe('cleanupExpired', () => {
    it('drops rows more than a day past expiry and keeps live ones', async () => {
      await service.issue(agentId, orgId);
      const [other] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'Venue South' })
        .returning();
      const stale = await service.issue(other.id, orgId);
      await db
        .update(siteAgentEnrolments)
        .set({ expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) })
        .where(eq(siteAgentEnrolments.tokenHash, hashToken(stale.token)));

      const removed = await service.cleanupExpired();

      expect(removed).toBe(1);
      const rows = await db.select().from(siteAgentEnrolments);
      expect(rows).toHaveLength(1);
    });
  });
});
