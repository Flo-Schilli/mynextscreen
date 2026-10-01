import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, count, eq, lt, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenRemoteControls, siteAgents, type SiteAgent } from '../db/schema';
import { OrganisationScopedService } from '../organisation/organisation-scope.service';
import {
  AUDIT_SITE_AGENT_CREATED,
  AUDIT_SITE_AGENT_DELETED,
  AUDIT_SITE_AGENT_ONLINE,
  AUDIT_SITE_AGENT_REVOKED,
  AUDIT_SITE_AGENT_UPDATED,
  AuditSiteAgentEvent,
} from '../audit-log/audit.events';
import { SITE_AGENT_STATUS_CHANGED, SiteAgentStatusChangedEvent } from './site-agent-status.event';
import {
  SiteAgentEnrolmentService,
  type IssuedEnrolmentToken,
} from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';

/** A site agent plus the count of screens assigned to it. */
export interface SiteAgentListItem extends SiteAgent {
  screenCount: number;
}

/** What creating an agent returns: the row, plus a token shown exactly once. */
export interface CreatedSiteAgent {
  agent: SiteAgent;
  enrolment: IssuedEnrolmentToken;
}

@Injectable()
export class SiteAgentService extends OrganisationScopedService<SiteAgent> {
  constructor(
    @Inject(DRIZZLE) db: DrizzleDB,
    private readonly enrolments: SiteAgentEnrolmentService,
    private readonly sessions: SiteAgentSessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(db, siteAgents, 'Site agent');
  }

  /** Creates an agent and issues the one-time token that enrols it. */
  async createAgent(
    organisationId: string,
    data: { name: string; location?: string | null },
    userId: string | null,
  ): Promise<CreatedSiteAgent> {
    const agent = await this.create(organisationId, data);
    const enrolment = await this.enrolments.issue(agent.id, organisationId);

    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_CREATED,
      new AuditSiteAgentEvent(agent.id, organisationId, userId, { name: agent.name }),
    );
    return { agent, enrolment };
  }

  async updateAgent(
    organisationId: string,
    id: string,
    data: { name?: string; location?: string | null },
    userId: string | null,
  ): Promise<SiteAgent> {
    const agent = await this.update(organisationId, id, data);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_UPDATED,
      new AuditSiteAgentEvent(id, organisationId, userId, { ...data }),
    );
    return agent;
  }

  async removeAgent(organisationId: string, id: string, userId: string | null): Promise<void> {
    const agent = await this.findOne(organisationId, id);
    await this.remove(organisationId, id);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_DELETED,
      new AuditSiteAgentEvent(id, organisationId, userId, { name: agent.name }),
    );
  }

  /** Lists an organisation's agents with how many screens each one looks after. */
  async listWithScreenCounts(organisationId: string): Promise<SiteAgentListItem[]> {
    const rows = await this.db
      .select({
        agent: siteAgents,
        screenCount: count(screenRemoteControls.screenId),
      })
      .from(siteAgents)
      .leftJoin(screenRemoteControls, eq(screenRemoteControls.agentId, siteAgents.id))
      .where(eq(siteAgents.organisationId, organisationId))
      .groupBy(siteAgents.id)
      .orderBy(siteAgents.name);

    return rows.map((row) => ({ ...row.agent, screenCount: Number(row.screenCount) }));
  }

  /**
   * Issues a fresh enrolment token, superseding any unredeemed one.
   *
   * Deliberately does not revoke the running session: an operator who wants a
   * token to re-install an agent elsewhere should not knock the live one
   * offline as a side effect. Revoking is its own, explicit action.
   */
  async reissueEnrolment(
    organisationId: string,
    id: string,
    userId: string | null,
  ): Promise<IssuedEnrolmentToken> {
    await this.findOne(organisationId, id);
    const enrolment = await this.enrolments.issue(id, organisationId);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_CREATED,
      new AuditSiteAgentEvent(id, organisationId, userId, { reissuedEnrolment: true }),
    );
    return enrolment;
  }

  /** Ends every session of an agent; it has to be enrolled again to come back. */
  async revokeAccess(
    organisationId: string,
    id: string,
    userId: string | null,
  ): Promise<{ revoked: number }> {
    await this.findOne(organisationId, id);
    const revoked = await this.sessions.revokeForAgent(id);
    await this.markOffline(id, organisationId);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_REVOKED,
      new AuditSiteAgentEvent(id, organisationId, userId, { revoked }),
    );
    return { revoked };
  }

  /**
   * Records a heartbeat. Emits a status event only on the offline→online edge,
   * so a healthy agent does not push an event every interval.
   */
  async recordHeartbeat(agentId: string, agentVersion: string | null): Promise<void> {
    const [row] = await this.db
      .select({
        organisationId: siteAgents.organisationId,
        name: siteAgents.name,
        isOnline: siteAgents.isOnline,
      })
      .from(siteAgents)
      .where(eq(siteAgents.id, agentId))
      .limit(1);
    if (!row) {
      return;
    }

    await this.db
      .update(siteAgents)
      .set({
        lastHeartbeat: new Date(),
        isOnline: true,
        ...(agentVersion ? { agentVersion } : {}),
      })
      .where(eq(siteAgents.id, agentId));

    if (!row.isOnline) {
      this.eventEmitter.emit(
        SITE_AGENT_STATUS_CHANGED,
        new SiteAgentStatusChangedEvent(agentId, row.organisationId, row.name, true),
      );
      this.eventEmitter.emit(
        AUDIT_SITE_AGENT_ONLINE,
        new AuditSiteAgentEvent(agentId, row.organisationId, null, { name: row.name }),
      );
    }
  }

  /**
   * Flips agents whose last heartbeat is older than the threshold to offline and
   * returns them. Emitting is left to {@link SiteAgentScheduler}, matching how
   * `ScreenService.detectOfflineScreens` and `ScreenScheduler` divide the work.
   */
  async detectOfflineAgents(thresholdMs: number): Promise<SiteAgent[]> {
    const cutoff = new Date(Date.now() - thresholdMs);
    return this.db
      .update(siteAgents)
      .set({ isOnline: false })
      .where(and(eq(siteAgents.isOnline, true), lt(siteAgents.lastHeartbeat, cutoff)))
      .returning();
  }

  /** True when the agent exists, belongs to the org and is currently connected. */
  async isOnline(organisationId: string, agentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ isOnline: siteAgents.isOnline })
      .from(siteAgents)
      .where(and(eq(siteAgents.id, agentId), eq(siteAgents.organisationId, organisationId)))
      .limit(1);
    return row?.isOnline ?? false;
  }

  private async markOffline(agentId: string, organisationId: string): Promise<void> {
    const [row] = await this.db
      .update(siteAgents)
      .set({ isOnline: false })
      .where(and(eq(siteAgents.id, agentId), sql`${siteAgents.isOnline} = true`))
      .returning({ name: siteAgents.name });
    if (row) {
      this.eventEmitter.emit(
        SITE_AGENT_STATUS_CHANGED,
        new SiteAgentStatusChangedEvent(agentId, organisationId, row.name, false),
      );
    }
  }
}
