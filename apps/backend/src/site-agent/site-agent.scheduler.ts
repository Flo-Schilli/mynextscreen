import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { SITE_AGENT_STATUS_CHANGED, SiteAgentStatusChangedEvent } from './site-agent-status.event';
import { AUDIT_SITE_AGENT_OFFLINE, AuditSiteAgentEvent } from '../audit-log/audit.events';

/**
 * Default before an agent counts as offline. Longer than the screen threshold
 * (120 s) because an agent missing one heartbeat is far less interesting than a
 * display going dark, and a venue uplink that blips should not paint the whole
 * site red.
 */
const DEFAULT_OFFLINE_THRESHOLD_MS = 180_000;

@Injectable()
export class SiteAgentScheduler {
  private readonly logger = new Logger(SiteAgentScheduler.name);
  private readonly offlineThresholdMs: number;

  constructor(
    private readonly siteAgentService: SiteAgentService,
    private readonly enrolments: SiteAgentEnrolmentService,
    private readonly sessions: SiteAgentSessionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.offlineThresholdMs = this.configService.get<number>(
      'SITE_AGENT_OFFLINE_THRESHOLD_MS',
      DEFAULT_OFFLINE_THRESHOLD_MS,
    );
  }

  @Interval(60_000)
  async detectOfflineAgents(): Promise<void> {
    const offline = await this.siteAgentService.detectOfflineAgents(this.offlineThresholdMs);

    for (const agent of offline) {
      this.eventEmitter.emit(
        SITE_AGENT_STATUS_CHANGED,
        new SiteAgentStatusChangedEvent(
          agent.id,
          agent.organisationId,
          agent.name,
          false,
          agent.lastHeartbeat,
        ),
      );
      this.eventEmitter.emit(
        AUDIT_SITE_AGENT_OFFLINE,
        new AuditSiteAgentEvent(agent.id, agent.organisationId, null, { name: agent.name }),
      );
    }

    if (offline.length > 0) {
      this.logger.log(`Marked ${offline.length} site agent(s) as offline`);
    }
  }

  @Interval(60 * 60_000)
  async cleanupExpired(): Promise<void> {
    const [enrolments, sessions] = await Promise.all([
      this.enrolments.cleanupExpired(),
      this.sessions.cleanupExpired(),
    ]);
    if (enrolments > 0 || sessions > 0) {
      this.logger.log(
        `Cleaned up ${enrolments} expired enrolment(s) and ${sessions} expired session(s)`,
      );
    }
  }
}
