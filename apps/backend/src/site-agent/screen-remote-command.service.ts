import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenRemoteControls } from '../db/schema';
import {
  AUDIT_SCREEN_REMOTE_COMMAND,
  AUDIT_SCREEN_REMOTE_ONBOARDED,
  AuditScreenRemoteEvent,
} from '../audit-log/audit.events';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { ONBOARDING_LAST_STEP, SiteAgentCommandType } from './site-agent-command.enum';
import { ScreenReachability } from './screen-reachability.enum';
import {
  SCREEN_ONBOARDING_CHECKED,
  SCREEN_REACHABILITY_CHANGED,
  SCREEN_REMOTE_CONFIG_CHANGED,
  ScreenOnboardingCheckedEvent,
  ScreenReachabilityChangedEvent,
  ScreenRemoteConfigChangedEvent,
} from './screen-onboarding.event';
import type { ManualCommandType } from './dto/screen-remote-command.dto';
import type { AgentScreenReportDto } from './dto/agent-report.dto';

/** What the dashboard gets back when it asks for something to happen. */
export interface DispatchedCommand {
  commandId: string;
}

@Injectable()
export class ScreenRemoteCommandService {
  private readonly logger = new Logger(ScreenRemoteCommandService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly remoteControls: ScreenRemoteControlService,
    private readonly sse: SiteAgentSseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Operator-triggered action on one screen. */
  async dispatchManual(
    organisationId: string,
    screenId: string,
    type: ManualCommandType,
    userId: string | null,
  ): Promise<DispatchedCommand> {
    const commandId = await this.push(organisationId, screenId, { type });
    this.eventEmitter.emit(
      AUDIT_SCREEN_REMOTE_COMMAND,
      new AuditScreenRemoteEvent(screenId, organisationId, userId, { type }),
    );
    return { commandId };
  }

  /** One step of the onboarding wizard. */
  async dispatchCheck(
    organisationId: string,
    screenId: string,
    step: number,
  ): Promise<DispatchedCommand> {
    const commandId = await this.push(organisationId, screenId, {
      type: SiteAgentCommandType.Check,
      step,
    });
    return { commandId };
  }

  @OnEvent(SCREEN_REMOTE_CONFIG_CHANGED)
  handleConfigChanged(event: ScreenRemoteConfigChangedEvent): void {
    for (const agentId of event.agentIds) {
      this.notifyConfigChanged(agentId);
    }
  }

  /**
   * Tells the agent its configuration changed. Unlike a command this is
   * best-effort and carries no payload: the agent re-pulls, and because it also
   * pulls periodically a missed event costs at most one interval.
   */
  notifyConfigChanged(agentId: string): void {
    this.sse.push(agentId, { commandId: randomUUID(), type: SiteAgentCommandType.ReloadConfig });
  }

  /**
   * Applies a batch of observations from an agent.
   *
   * Only fields the agent actually reported are written. A probe that found the
   * TV unreachable has nothing to say about SSH, and resetting that to
   * "unknown" would discard the very thing the operator needs to see.
   */
  async applyReport(
    agentId: string,
    organisationId: string,
    report: AgentScreenReportDto,
  ): Promise<void> {
    if (!(await this.remoteControls.isManagedBy(agentId, report.screenId))) {
      // Not an error worth failing the whole batch over: a screen can be
      // reassigned while a round is in flight.
      this.logger.warn(
        `Site agent ${agentId} reported on screen ${report.screenId}, which it does not manage`,
      );
      return;
    }

    const now = new Date();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (report.reachability) {
      updates.reachability = report.reachability;
      updates.lastProbeAt = now;
      updates.lastProbeError =
        report.reachability === ScreenReachability.Unreachable ? (report.detail ?? null) : null;
    }
    if (report.keyStatus) updates.keyStatus = report.keyStatus;
    if (report.sshStatus) updates.sshStatus = report.sshStatus;
    if (report.ssapStatus) updates.ssapStatus = report.ssapStatus;
    if (report.sshHostKeyFingerprint) {
      updates.sshHostKeyFingerprint = report.sshHostKeyFingerprint;
    }
    if (report.launched) updates.lastLaunchAt = now;
    if (report.woken) updates.lastWakeAt = now;
    if (report.devmodeExtended !== undefined) {
      updates.lastDevmodeExtendOk = report.devmodeExtended;
      // Only a success moves the clock. A failed attempt leaves the extension
      // due, so it is retried next time the TV is on rather than waiting out
      // another full interval.
      if (report.devmodeExtended) {
        updates.lastDevmodeExtendAt = now;
      }
    }

    await this.db
      .update(screenRemoteControls)
      .set(updates)
      .where(eq(screenRemoteControls.screenId, report.screenId));

    if (report.reachability) {
      this.eventEmitter.emit(
        SCREEN_REACHABILITY_CHANGED,
        new ScreenReachabilityChangedEvent(
          report.screenId,
          organisationId,
          report.reachability,
          now,
        ),
      );
    }

    if (report.step !== undefined) {
      await this.applyCheckResult(organisationId, report);
    }
  }

  /**
   * Advances the wizard on a passing check and reports either way.
   *
   * The step only ever moves forward past a step that succeeded; a failing
   * check leaves the operator where they are, which is the step whose
   * instructions they still need.
   */
  private async applyCheckResult(
    organisationId: string,
    report: AgentScreenReportDto,
  ): Promise<void> {
    const step = report.step as number;
    const ok = this.isCheckOk(report);

    if (ok) {
      const [current] = await this.db
        .select({ onboardingStep: screenRemoteControls.onboardingStep })
        .from(screenRemoteControls)
        .where(eq(screenRemoteControls.screenId, report.screenId))
        .limit(1);

      const nextStep = Math.min(
        Math.max(current?.onboardingStep ?? 1, step + 1),
        ONBOARDING_LAST_STEP,
      );
      const completed = step >= ONBOARDING_LAST_STEP;

      await this.db
        .update(screenRemoteControls)
        .set({
          onboardingStep: nextStep,
          ...(completed ? { onboardingCompletedAt: new Date() } : {}),
        })
        .where(eq(screenRemoteControls.screenId, report.screenId));

      if (completed) {
        this.eventEmitter.emit(
          AUDIT_SCREEN_REMOTE_ONBOARDED,
          new AuditScreenRemoteEvent(report.screenId, organisationId, null, null),
        );
      }
    }

    this.eventEmitter.emit(
      SCREEN_ONBOARDING_CHECKED,
      new ScreenOnboardingCheckedEvent(
        report.screenId,
        organisationId,
        report.commandId ?? null,
        step,
        ok,
        report.detail ?? null,
      ),
    );
  }

  /** A check passed when nothing it reported is a failure state. */
  private isCheckOk(report: AgentScreenReportDto): boolean {
    if (report.reachability === ScreenReachability.Unreachable) return false;
    if (report.keyStatus && report.keyStatus !== 'ok') return false;
    if (report.sshStatus && report.sshStatus !== 'ok') return false;
    if (report.ssapStatus && report.ssapStatus !== 'ok') return false;
    if (report.devmodeExtended === false) return false;
    return true;
  }

  private async push(
    organisationId: string,
    screenId: string,
    command: { type: SiteAgentCommandType; step?: number },
  ): Promise<string> {
    const remote = await this.remoteControls.getForScreen(organisationId, screenId);
    if (!remote.agentId) {
      throw new ConflictException('Screen is not assigned to a site agent');
    }

    const commandId = randomUUID();
    const delivered = this.sse.push(remote.agentId, {
      commandId,
      type: command.type,
      screenId,
      ...(command.step !== undefined ? { step: command.step } : {}),
    });

    if (!delivered) {
      throw new ConflictException('Site agent is offline');
    }
    return commandId;
  }
}
