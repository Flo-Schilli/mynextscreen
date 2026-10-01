import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService, type SiteAgentSessionTokens } from './site-agent-session.service';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentConfigService } from './site-agent-config.service';
import type { AgentConfig } from './agent-config.types';
import { AgentHeartbeatDto, EnrolAgentDto, RefreshAgentSessionDto } from './dto';
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
    private readonly eventEmitter: EventEmitter2,
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

  @Post('me/heartbeat')
  @AgentAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(
    @Req() req: AgentAuthenticatedRequest,
    @Body() dto: AgentHeartbeatDto,
  ): Promise<void> {
    await this.siteAgentService.recordHeartbeat(req.agentId, dto.agentVersion ?? null);
  }
}
