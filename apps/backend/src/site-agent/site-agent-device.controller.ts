import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { PlayerAppsService } from '../player-apps/player-apps.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService, type SiteAgentSessionTokens } from './site-agent-session.service';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentConfigService } from './site-agent-config.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { ScreenRemoteCommandService } from './screen-remote-command.service';
import { AgentMetricsService } from '../observability/agent-metrics.service';
import type { AgentConfig } from './agent-config.types';
import { AgentHeartbeatDto, AgentReportDto, EnrolAgentDto, RefreshAgentSessionDto } from './dto';
import { AgentAuth } from '../auth/agent-auth.decorator';
import type { AgentAuthenticatedRequest } from '../auth/agent-auth.guard';
import { Public } from '../auth/public.decorator';
import { AUDIT_SITE_AGENT_ENROLLED, AuditSiteAgentEvent } from '../audit-log/audit.events';

interface AgentSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface EnrolResponse extends AgentSessionResponse {
  agentId: string;
  organisationId: string;
}

function toSessionResponse(tokens: SiteAgentSessionTokens): AgentSessionResponse {
  return {
    accessToken: tokens.accessToken.token,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
}

/**
 * The endpoints a site agent itself talks to. Separate from
 * {@link SiteAgentController}, which is the dashboard's view of the same
 * domain — the two have entirely different callers, credentials and payloads.
 */
@Controller('agents')
export class SiteAgentDeviceController {
  constructor(
    private readonly enrolments: SiteAgentEnrolmentService,
    private readonly sessions: SiteAgentSessionService,
    private readonly siteAgentService: SiteAgentService,
    private readonly configService: SiteAgentConfigService,
    private readonly sse: SiteAgentSseService,
    private readonly commands: ScreenRemoteCommandService,
    private readonly eventEmitter: EventEmitter2,
    private readonly playerApps: PlayerAppsService,
    private readonly agentMetrics: AgentMetricsService,
  ) {}

  /**
   * Redeems the one-time enrolment token. Public because the agent has no
   * credential yet — the token in the body is the credential.
   */
  @Post('enrol')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async enrol(@Body() dto: EnrolAgentDto): Promise<EnrolResponse> {
    const result = await this.enrolments.redeem(dto.enrolmentToken);
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_ENROLLED,
      new AuditSiteAgentEvent(result.agentId, result.organisationId, null, null),
    );
    return {
      agentId: result.agentId,
      organisationId: result.organisationId,
      ...toSessionResponse(result.tokens),
    };
  }

  /**
   * Rotates the refresh token. Public because the access token it replaces has
   * expired by definition.
   */
  @Post('session/refresh')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refreshSession(@Body() dto: RefreshAgentSessionDto): Promise<AgentSessionResponse> {
    const result = await this.sessions.refresh(dto.refreshToken);
    if (result.status !== 'ok') {
      // One answer for "unknown" and "replayed": the caller must not learn
      // which of the two it hit.
      throw new UnauthorizedException('Invalid refresh token');
    }
    return toSessionResponse(result.tokens);
  }

  /**
   * Everything the agent needs: its screens, their addresses, the Developer
   * Mode passphrases and when playback is next due.
   *
   * The agent caches this to disk and keeps working from the cache when the
   * server is unreachable — a venue must not go dark because the uplink is.
   */
  @Get('me/config')
  @AgentAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  config(@Req() req: AgentAuthenticatedRequest): Promise<AgentConfig> {
    return this.configService.buildAgentConfig(req.agentId);
  }

  /**
   * The native player package this server has, for the agent to install.
   *
   * Separate from the operator-facing download, which is `@UserScoped`: the
   * agent holds an agent token, not a session. Same file either way — one
   * source for what gets installed, whether a person or the agent does it.
   */
  @Get('me/app-package')
  @AgentAuth()
  appPackage(@Res() res: Response): void {
    const slug = this.configService.appPackageSlug();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${this.playerApps.getBinaryFilename(slug)}"`,
    );
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(this.playerApps.getBinaryPath(slug), { root: '/' });
  }

  /**
   * Commands the operator triggered, pushed as they happen.
   *
   * Carries nothing the agent cannot do without: everything on a schedule comes
   * from the config it already holds, so a dropped connection costs no state
   * and a reconnect needs no replay.
   */
  @Sse('me/events')
  @AgentAuth()
  events(@Req() req: AgentAuthenticatedRequest): Observable<unknown> {
    return this.sse.subscribe(req.agentId);
  }

  /** Batched observations: one entry per screen the agent looks after. */
  @Post('me/reports')
  @AgentAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async reports(@Req() req: AgentAuthenticatedRequest, @Body() dto: AgentReportDto): Promise<void> {
    for (const screen of dto.screens) {
      await this.commands.applyReport(req.agentId, req.organisationId, screen);
    }
  }

  @Post('me/heartbeat')
  @AgentAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(
    @Req() req: AgentAuthenticatedRequest,
    @Body() dto: AgentHeartbeatDto,
  ): Promise<void> {
    await this.siteAgentService.recordHeartbeat(req.agentId, dto.agentVersion ?? null);
    if (dto.metrics) {
      this.agentMetrics.record(req.agentId, dto.metrics);
    }
  }
}
