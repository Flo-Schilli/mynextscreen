import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { SecretCipher } from '../common/secret-cipher.service';
import { SITE_AGENT_STATUS_CHANGED } from './site-agent-status.event';
import {
  AUDIT_SITE_AGENT_CREATED,
  AUDIT_SITE_AGENT_DELETED,
  AUDIT_SITE_AGENT_ONLINE,
  AUDIT_SITE_AGENT_RESET,
  AUDIT_SITE_AGENT_REVOKED,
  AUDIT_SITE_AGENT_UPDATED,
} from '../audit-log/audit.events';
import { TokenService } from '../auth/token.service';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screenRemoteControls,
  screens,
  siteAgents,
  siteAgentEnrolments,
} from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('SiteAgentService', () => {
  let db: DrizzleDB;
  let service: SiteAgentService;
  let sessions: SiteAgentSessionService;
  let enrolments: SiteAgentEnrolmentService;
  let emitter: { emit: jest.Mock };
  let orgId: string;
  let otherOrgId: string;

  const userId = '880e8400-e29b-41d4-a716-446655440000';

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
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteAgentService,
        SiteAgentEnrolmentService,
        SiteAgentSessionService,
        ScreenRemoteControlService,
        SecretCipher,
        { provide: DRIZZLE, useValue: db },
        { provide: TokenService, useValue: tokens },
        { provide: EventEmitter2, useValue: emitter },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();
    service = module.get(SiteAgentService);
    sessions = module.get(SiteAgentSessionService);
    enrolments = module.get(SiteAgentEnrolmentService);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [other] = await db
      .insert(organisations)
      .values({ name: `Other ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    otherOrgId = other.id;
  });

  async function makeAgent(organisationId = orgId, name = 'Venue North') {
    const [agent] = await db.insert(siteAgents).values({ organisationId, name }).returning();
    return agent;
  }

  async function makeScreenWithAgent(agentId: string, organisationId = orgId) {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId,
        name: `Screen ${Math.random()}`,
        resolution: '1920x1080',
        location: 'Foyer',
        apiKeyHash: 'hash',
      })
      .returning();
    await db.insert(screenRemoteControls).values({
      screenId: screen.id,
      organisationId,
      agentId,
    });
    return screen;
  }

  describe('createAgent', () => {
    it('creates the agent and an enrolment token in one step', async () => {
      const result = await service.createAgent(orgId, { name: 'Venue North' }, userId);

      expect(result.agent.organisationId).toBe(orgId);
      expect(result.enrolment.token).toEqual(expect.any(String));
      const [enrolment] = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.agentId, result.agent.id));
      expect(enrolment).toBeDefined();
    });

    it('audits the creation', async () => {
      await service.createAgent(orgId, { name: 'Venue North' }, userId);

      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_CREATED,
        expect.objectContaining({ organisationId: orgId, userId }),
      );
    });

    it('starts offline until the agent checks in', async () => {
      const { agent } = await service.createAgent(orgId, { name: 'Venue North' }, userId);

      expect(agent.isOnline).toBe(false);
      expect(agent.lastHeartbeat).toBeNull();
    });
  });

  describe('updateAgent', () => {
    it('applies the change and audits it', async () => {
      const agent = await makeAgent();

      const updated = await service.updateAgent(
        orgId,
        agent.id,
        { name: 'Venue South', location: 'Rack 3' },
        userId,
      );

      expect(updated.name).toBe('Venue South');
      expect(updated.location).toBe('Rack 3');
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_UPDATED,
        expect.objectContaining({ agentId: agent.id, userId }),
      );
    });

    it('leaves the enrolment and online state untouched', async () => {
      const agent = await makeAgent();
      await service.recordHeartbeat(agent.id, '1.0.0');

      await service.updateAgent(orgId, agent.id, { name: 'Renamed' }, userId);

      const [row] = await db.select().from(siteAgents).where(eq(siteAgents.id, agent.id));
      expect(row.isOnline).toBe(true);
      expect(row.agentVersion).toBe('1.0.0');
    });
  });

  describe('tenant isolation', () => {
    it('does not find another organisation agent', async () => {
      const foreign = await makeAgent(otherOrgId);

      await expect(service.findOne(orgId, foreign.id)).rejects.toThrow(NotFoundException);
    });

    it('does not update another organisation agent', async () => {
      const foreign = await makeAgent(otherOrgId);

      await expect(
        service.updateAgent(orgId, foreign.id, { name: 'Hijacked' }, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not revoke another organisation agent', async () => {
      const foreign = await makeAgent(otherOrgId);

      await expect(service.revokeAccess(orgId, foreign.id, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lists only its own organisation agents', async () => {
      await makeAgent(orgId, 'Mine');
      await makeAgent(otherOrgId, 'Theirs');

      const list = await service.listWithScreenCounts(orgId);

      expect(list.map((a) => a.name)).toEqual(['Mine']);
    });
  });

  describe('listWithScreenCounts', () => {
    it('counts the screens assigned to each agent', async () => {
      const busy = await makeAgent(orgId, 'Busy');
      const idle = await makeAgent(orgId, 'Idle');
      await makeScreenWithAgent(busy.id);
      await makeScreenWithAgent(busy.id);

      const list = await service.listWithScreenCounts(orgId);

      expect(list.find((a) => a.id === busy.id)?.screenCount).toBe(2);
      expect(list.find((a) => a.id === idle.id)?.screenCount).toBe(0);
    });
  });

  describe('removeAgent', () => {
    // The foreign key alone would only null `agent_id`, leaving the address,
    // the passphrase and a completed onboarding behind for the next agent to
    // inherit. A screen whose agent is gone has to start from nothing.
    it('clears the settings of every screen it looked after', async () => {
      const agent = await makeAgent();
      const screen = await makeScreenWithAgent(agent.id);

      await service.removeAgent(orgId, agent.id, userId);

      const rows = await db
        .select()
        .from(screenRemoteControls)
        .where(eq(screenRemoteControls.screenId, screen.id));
      expect(rows).toHaveLength(0);
    });

    it('leaves the screens themselves alone', async () => {
      const agent = await makeAgent();
      const screen = await makeScreenWithAgent(agent.id);

      await service.removeAgent(orgId, agent.id, userId);

      const rows = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(rows).toHaveLength(1);
    });

    it('does not touch another agent screens', async () => {
      const mine = await makeAgent(orgId, 'Mine');
      const theirs = await makeAgent(orgId, 'Theirs');
      await makeScreenWithAgent(mine.id);
      const kept = await makeScreenWithAgent(theirs.id);

      await service.removeAgent(orgId, mine.id, userId);

      const rows = await db
        .select()
        .from(screenRemoteControls)
        .where(eq(screenRemoteControls.screenId, kept.id));
      expect(rows).toHaveLength(1);
    });

    it('audits how many screens it cleared', async () => {
      const agent = await makeAgent();
      await makeScreenWithAgent(agent.id);
      await makeScreenWithAgent(agent.id);

      await service.removeAgent(orgId, agent.id, userId);

      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_DELETED,
        expect.objectContaining({
          agentId: agent.id,
          details: expect.objectContaining({ clearedScreens: 2 }),
        }),
      );
    });
  });

  describe('reissueEnrolment', () => {
    it('does not disconnect the running agent', async () => {
      const agent = await makeAgent();
      const session = await sessions.createSession(agent.id, orgId);

      await service.reissueEnrolment(orgId, agent.id, userId);

      const refreshed = await sessions.refresh(session.refreshToken);
      expect(refreshed.status).toBe('ok');
    });
  });

  describe('revokeAccess', () => {
    it('ends the sessions and reports the count', async () => {
      const agent = await makeAgent();
      await sessions.createSession(agent.id, orgId);
      const session = await sessions.createSession(agent.id, orgId);

      const result = await service.revokeAccess(orgId, agent.id, userId);

      expect(result.revoked).toBe(2);
      expect((await sessions.refresh(session.refreshToken)).status).toBe('unknown');
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_REVOKED,
        expect.objectContaining({ agentId: agent.id }),
      );
    });

    it('marks the agent offline so the dashboard stops showing it connected', async () => {
      const agent = await makeAgent();
      await db.update(siteAgents).set({ isOnline: true }).where(eq(siteAgents.id, agent.id));

      await service.revokeAccess(orgId, agent.id, userId);

      const [row] = await db.select().from(siteAgents).where(eq(siteAgents.id, agent.id));
      expect(row.isOnline).toBe(false);
    });
  });

  describe('resetFromAgent', () => {
    it('ends the sessions when given a fresh setup code for the org', async () => {
      const agent = await makeAgent();
      const session = await sessions.createSession(agent.id, orgId);
      const code = await enrolments.issue(agent.id, orgId);

      await service.resetFromAgent(agent.id, orgId, code.token);

      expect((await sessions.refresh(session.refreshToken)).status).toBe('unknown');
    });

    it('does not consume the code, so it is still good for re-enrolment', async () => {
      const agent = await makeAgent();
      await sessions.createSession(agent.id, orgId);
      const code = await enrolments.issue(agent.id, orgId);

      await service.resetFromAgent(agent.id, orgId, code.token);

      const [row] = await db
        .select()
        .from(siteAgentEnrolments)
        .where(eq(siteAgentEnrolments.agentId, agent.id));
      expect(row.consumedAt).toBeNull();
    });

    it('audits the reset as agent-originated', async () => {
      const agent = await makeAgent();
      const code = await enrolments.issue(agent.id, orgId);

      await service.resetFromAgent(agent.id, orgId, code.token);

      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_RESET,
        expect.objectContaining({
          agentId: agent.id,
          organisationId: orgId,
          details: expect.objectContaining({ origin: 'agent' }),
        }),
      );
    });

    it('refuses without a fresh code and leaves the session intact', async () => {
      const agent = await makeAgent();
      const session = await sessions.createSession(agent.id, orgId);

      await expect(service.resetFromAgent(agent.id, orgId, 'never-issued')).rejects.toThrow();

      expect((await sessions.refresh(session.refreshToken)).status).toBe('ok');
    });

    it('refuses a code issued for another organisation', async () => {
      const agent = await makeAgent();
      const foreign = await makeAgent(otherOrgId);
      const foreignCode = await enrolments.issue(foreign.id, otherOrgId);
      const session = await sessions.createSession(agent.id, orgId);

      await expect(service.resetFromAgent(agent.id, orgId, foreignCode.token)).rejects.toThrow();

      expect((await sessions.refresh(session.refreshToken)).status).toBe('ok');
    });
  });

  describe('recordHeartbeat', () => {
    it('marks the agent online and stores the version', async () => {
      const agent = await makeAgent();

      await service.recordHeartbeat(agent.id, '1.2.3');

      const [row] = await db.select().from(siteAgents).where(eq(siteAgents.id, agent.id));
      expect(row.isOnline).toBe(true);
      expect(row.agentVersion).toBe('1.2.3');
      expect(row.lastHeartbeat).not.toBeNull();
    });

    it('emits a status change only on the offline to online edge', async () => {
      const agent = await makeAgent();

      await service.recordHeartbeat(agent.id, '1.0.0');
      const afterFirst = emitter.emit.mock.calls.filter(
        ([name]) => name === SITE_AGENT_STATUS_CHANGED,
      ).length;
      await service.recordHeartbeat(agent.id, '1.0.0');
      const afterSecond = emitter.emit.mock.calls.filter(
        ([name]) => name === SITE_AGENT_STATUS_CHANGED,
      ).length;

      expect(afterFirst).toBe(1);
      expect(afterSecond).toBe(1);
      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_ONLINE,
        expect.objectContaining({ agentId: agent.id }),
      );
    });

    it('keeps the stored version when the agent reports none', async () => {
      const agent = await makeAgent();
      await service.recordHeartbeat(agent.id, '1.2.3');

      await service.recordHeartbeat(agent.id, null);

      const [row] = await db.select().from(siteAgents).where(eq(siteAgents.id, agent.id));
      expect(row.agentVersion).toBe('1.2.3');
    });

    it('ignores a heartbeat for an agent that no longer exists', async () => {
      await expect(
        service.recordHeartbeat('00000000-0000-0000-0000-000000000000', '1.0.0'),
      ).resolves.toBeUndefined();
    });
  });

  describe('detectOfflineAgents', () => {
    it('flips stale agents and leaves fresh ones alone', async () => {
      const stale = await makeAgent(orgId, 'Stale');
      const fresh = await makeAgent(orgId, 'Fresh');
      await service.recordHeartbeat(stale.id, '1.0.0');
      await service.recordHeartbeat(fresh.id, '1.0.0');
      await db
        .update(siteAgents)
        .set({ lastHeartbeat: new Date(Date.now() - 600_000) })
        .where(eq(siteAgents.id, stale.id));

      const offline = await service.detectOfflineAgents(180_000);

      expect(offline.map((a) => a.id)).toEqual([stale.id]);
      const [freshRow] = await db.select().from(siteAgents).where(eq(siteAgents.id, fresh.id));
      expect(freshRow.isOnline).toBe(true);
    });

    it('does not re-report an agent that is already offline', async () => {
      const agent = await makeAgent();
      await service.recordHeartbeat(agent.id, '1.0.0');
      await db
        .update(siteAgents)
        .set({ lastHeartbeat: new Date(Date.now() - 600_000) })
        .where(eq(siteAgents.id, agent.id));
      await service.detectOfflineAgents(180_000);

      const second = await service.detectOfflineAgents(180_000);

      expect(second).toHaveLength(0);
    });

    // An agent that never checked in has a null heartbeat and is already
    // offline; it must not show up as "just went offline" every minute.
    it('ignores an agent that has never checked in', async () => {
      await makeAgent();

      expect(await service.detectOfflineAgents(180_000)).toHaveLength(0);
    });
  });

  describe('isOnline', () => {
    it('is false for an agent of another organisation even when it is up', async () => {
      const foreign = await makeAgent(otherOrgId);
      await service.recordHeartbeat(foreign.id, '1.0.0');

      expect(await service.isOnline(orgId, foreign.id)).toBe(false);
      expect(await service.isOnline(otherOrgId, foreign.id)).toBe(true);
    });

    it('is false for an agent that does not exist', async () => {
      expect(await service.isOnline(orgId, '00000000-0000-0000-0000-000000000000')).toBe(false);
    });
  });
});
