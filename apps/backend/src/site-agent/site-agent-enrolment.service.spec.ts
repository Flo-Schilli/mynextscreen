import { Test, TestingModule } from '@nestjs/testing';
import { GoneException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import {
  DEFAULT_ENROLMENT_TTL_MS,
  SiteAgentEnrolmentService,
} from './site-agent-enrolment.service';
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

  async function buildService(configValue?: string): Promise<SiteAgentEnrolmentService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteAgentEnrolmentService,
        SiteAgentSessionService,
        { provide: DRIZZLE, useValue: db },
        { provide: TokenService, useValue: tokens },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(configValue) },
        },
      ],
    }).compile();
    sessions = module.get(SiteAgentSessionService);
    return module.get(SiteAgentEnrolmentService);
  }

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();

    service = await buildService();

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

  describe('time to live', () => {
    it('defaults to the 15-minute window when unconfigured', async () => {
      const issued = await service.issue(agentId, orgId);

      const expectedMs = Date.now() + DEFAULT_ENROLMENT_TTL_MS;
      // Within a minute of the computed default: the row is written with a real
      // clock, so an exact match would be flaky.
      expect(Math.abs(issued.expiresAt.getTime() - expectedMs)).toBeLessThan(60_000);
    });

    it('honours SITE_AGENT_ENROLMENT_TTL_MS when it is a usable value', async () => {
      const oneHour = 60 * 60 * 1000;
      const configured = await buildService(String(oneHour));

      const issued = await configured.issue(agentId, orgId);

      expect(Math.abs(issued.expiresAt.getTime() - (Date.now() + oneHour))).toBeLessThan(60_000);
    });

    it('falls back to the default on a nonsense or too-small TTL', async () => {
      const configured = await buildService('nonsense');

      const issued = await configured.issue(agentId, orgId);

      expect(
        Math.abs(issued.expiresAt.getTime() - (Date.now() + DEFAULT_ENROLMENT_TTL_MS)),
      ).toBeLessThan(60_000);
    });
  });

  describe('verifyFresh', () => {
    it('accepts a fresh code scoped to the organisation without consuming it', async () => {
      const issued = await service.issue(agentId, orgId);

      await expect(service.verifyFresh(issued.token, orgId)).resolves.toBeUndefined();

      const [row] = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.tokenHash, hashToken(issued.token)));
      // Still redeemable afterwards: verification must not spend the code.
      expect(row.consumedAt).toBeNull();
    });

    it('rejects a code issued for a different organisation with 401', async () => {
      const issued = await service.issue(agentId, orgId);
      const [other] = await db
        .insert(organisations)
        .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
        .returning();

      await expect(service.verifyFresh(issued.token, other.id)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an already-used code with 410', async () => {
      const issued = await service.issue(agentId, orgId);
      await service.redeem(issued.token);

      await expect(service.verifyFresh(issued.token, orgId)).rejects.toThrow(GoneException);
    });

    it('rejects an expired code with 401', async () => {
      const issued = await service.issue(agentId, orgId);
      await db
        .update(siteAgentEnrolments)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(siteAgentEnrolments.tokenHash, hashToken(issued.token)));

      await expect(service.verifyFresh(issued.token, orgId)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown code with 401', async () => {
      await expect(service.verifyFresh('never-issued', orgId)).rejects.toThrow(
        UnauthorizedException,
      );
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
