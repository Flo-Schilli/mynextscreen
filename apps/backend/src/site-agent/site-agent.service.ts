import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
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
  AUDIT_SITE_AGENT_RESET,
  AUDIT_SITE_AGENT_REVOKED,
  AUDIT_SITE_AGENT_UPDATE_REQUESTED,
  AUDIT_SITE_AGENT_UPDATED,
  AuditSiteAgentEvent,
} from '../audit-log/audit.events';
import { isAgentOutdated, latestAgentVersion } from './agent-update';
import { SITE_AGENT_STATUS_CHANGED, SiteAgentStatusChangedEvent } from './site-agent-status.event';
import {
  SiteAgentEnrolmentService,
  type IssuedEnrolmentToken,
} from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import {
  SCREEN_REMOTE_CONFIG_CHANGED,
  ScreenRemoteConfigChangedEvent,
} from './screen-onboarding.event';
import type { AgentNetworkDto } from './dto';

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
    private readonly remoteControls: ScreenRemoteControlService,
    private readonly sse: SiteAgentSseService,
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
    data: {
      name?: string;
      location?: string | null;
      probeIntervalMinutes?: number;
      subnetSweepEnabled?: boolean;
    },
    userId: string | null,
  ): Promise<SiteAgent> {
    const agent = await this.update(organisationId, id, data);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_UPDATED,
      new AuditSiteAgentEvent(id, organisationId, userId, { ...data }),
    );
    if (data.probeIntervalMinutes !== undefined || data.subnetSweepEnabled !== undefined) {
      // Both travel in the agent's config, so it has to re-pull.
      this.eventEmitter.emit(
        SCREEN_REMOTE_CONFIG_CHANGED,
        new ScreenRemoteConfigChangedEvent([id]),
      );
    }
    return agent;
  }

  /**
   * Asks the agent to probe every display now and forget its backoff.
   *
   * 409 when the agent is offline, like every other operator command: a check
   * queued until the venue reconnects would answer a question nobody is
   * still asking.
   */
  async probeNow(organisationId: string, id: string): Promise<{ commandId: string }> {
    await this.findOne(organisationId, id);
    const commandId = randomUUID();
    if (!this.sse.push(id, { commandId, type: SiteAgentCommandType.ProbeNow })) {
      throw new ConflictException('Site agent is offline');
    }
    return { commandId };
  }

  /**
   * Asks the agent to update itself to the server's version.
   *
   * Two 409s, both deliberate: an agent that already runs the server's version
   * has nothing to pull, and one that is offline cannot be reached — queueing
   * the command would fire an unexpected restart whenever the venue happens to
   * reconnect. The agent turns the command into a sentinel file; the host's
   * systemd path unit does the actual `podman auto-update`.
   */
  async requestUpdate(
    organisationId: string,
    id: string,
    userId: string | null,
  ): Promise<{ commandId: string }> {
    const agent = await this.findOne(organisationId, id);
    const latest = latestAgentVersion();
    if (!isAgentOutdated(agent.agentVersion, latest)) {
      throw new ConflictException('Site agent is already up to date');
    }
    const commandId = randomUUID();
    if (!this.sse.push(id, { commandId, type: SiteAgentCommandType.UpdateAgent })) {
      throw new ConflictException('Site agent is offline');
    }
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_UPDATE_REQUESTED,
      new AuditSiteAgentEvent(id, organisationId, userId, {
        fromVersion: agent.agentVersion,
        toVersion: latest,
      }),
    );
    return { commandId };
  }

  /**
   * Deletes an agent and clears the settings of every screen it looked after.
   *
   * The foreign key alone would only null `agent_id`, leaving each screen with
   * the address, passphrase and completed onboarding of a venue that no longer
   * has an agent — and the next agent would inherit all of it untouched. A
   * screen whose agent is gone starts from nothing, like one never managed.
   */
  async removeAgent(organisationId: string, id: string, userId: string | null): Promise<void> {
    const agent = await this.findOne(organisationId, id);
    const clearedScreens = await this.remoteControls.removeForAgent(id);
    await this.remove(organisationId, id);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_DELETED,
      new AuditSiteAgentEvent(id, organisationId, userId, {
        name: agent.name,
        clearedScreens,
      }),
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

  /**
   * Resets an agent at the operator's own request, from the agent's setup page.
   *
   * Gated on a fresh setup code from the dashboard — proof the caller holds an
   * authenticated dashboard session for this organisation, not merely a browser
   * on the venue LAN. Without the gate, anyone who could reach the agent's setup
   * port could strand the venue by resetting it.
   *
   * The code is verified, not consumed: the operator still needs it to re-enrol
   * the agent immediately afterwards.
   */
  async resetFromAgent(agentId: string, organisationId: string, setupCode: string): Promise<void> {
    await this.enrolments.verifyFresh(setupCode, organisationId);
    await this.sessions.revokeForAgent(agentId);
    await this.markOffline(agentId, organisationId);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_RESET,
      new AuditSiteAgentEvent(agentId, organisationId, null, { origin: 'agent' }),
    );
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
  async recordHeartbeat(
    agentId: string,
    agentVersion: string | null,
    network: AgentNetworkDto | null = null,
  ): Promise<void> {
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

    const now = new Date();
    await this.db
      .update(siteAgents)
      .set({
        lastHeartbeat: now,
        isOnline: true,
        ...(agentVersion ? { agentVersion } : {}),
        // Replaced as a whole when reported, so a switch from Wi-Fi to cable
        // does not leave the old SSID behind; kept when an older agent omits it.
        ...(network
          ? {
              networkInterface: network.interfaceName,
              networkKind: network.kind,
              networkSsid: network.kind === 'wifi' ? network.ssid : null,
              networkIp: network.ipAddress,
            }
          : {}),
      })
      .where(eq(siteAgents.id, agentId));

    if (!row.isOnline) {
      this.eventEmitter.emit(
        SITE_AGENT_STATUS_CHANGED,
        new SiteAgentStatusChangedEvent(agentId, row.organisationId, row.name, true, now),
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
      .returning({ name: siteAgents.name, lastHeartbeat: siteAgents.lastHeartbeat });
    if (row) {
      this.eventEmitter.emit(
        SITE_AGENT_STATUS_CHANGED,
        new SiteAgentStatusChangedEvent(
          agentId,
          organisationId,
          row.name,
          false,
          row.lastHeartbeat,
        ),
      );
    }
  }
}
