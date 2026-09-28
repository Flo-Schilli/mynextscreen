import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Sse,
  ParseUUIDPipe,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { ScreenService, type ScreenWithPlaylist } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { ScreenSessionService, type ScreenSessionTokens } from './screen-session.service';
import {
  CreateScreenDto,
  RepairScreenDto,
  UpdateScreenDto,
  BulkDeleteScreensDto,
  BulkAssignGroupDto,
  RefreshScreenSessionDto,
  HeartbeatDto,
} from './dto';
import { Roles } from '../auth/roles.decorator';
import { ScreenAuth, ScreenAuthenticatedRequest, AuthenticatedRequest, Public } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { Screen } from '../db/schema';

interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

/** Wire shape of a screen session. `expiresIn` is seconds, never an instant. */
interface ScreenSessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function toSessionResponse(session: ScreenSessionTokens): ScreenSessionResponse {
  return {
    accessToken: session.accessToken.token,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
  };
}

@Controller('screens')
export class ScreenController {
  constructor(
    private readonly screenService: ScreenService,
    private readonly screenStateService: ScreenStateService,
    private readonly screenSessionService: ScreenSessionService,
  ) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin)
  // Stricter than the global limit: claiming a screen consumes a pairing code.
  // 20/min is generous for an admin while throttling brute-force code guessing.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateScreenDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Screen> {
    return this.screenService.createScreen(organisationId, dto, req.user.userId);
  }

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findAll(@CurrentOrganisation() organisationId: string): Promise<ScreenWithPlaylist[]> {
    return this.screenService.findAllWithPlaylist(organisationId);
  }

  /**
   * Exchanges the enrolment credential for a session. This is the route the API
   * key exists for; every other screen route is meant to be reached with the
   * short-lived access token it hands out.
   *
   * Throttled harder than the rest: it is the only screen route that still runs
   * bcrypt, so it is also the only one worth flooding.
   */
  @Post('session')
  @ScreenAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async createSession(@Req() req: ScreenAuthenticatedRequest): Promise<ScreenSessionResponse> {
    const session = await this.screenSessionService.createSession(req.screenId, req.organisationId);
    return toSessionResponse(session);
  }

  /**
   * Rotates the refresh token. Public because the access token it replaces has
   * expired by definition — the refresh token in the body is the credential.
   */
  @Post('session/refresh')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refreshSession(@Body() dto: RefreshScreenSessionDto): Promise<ScreenSessionResponse> {
    const result = await this.screenSessionService.refresh(dto.refreshToken);
    if (result.status !== 'ok') {
      // Deliberately the same answer for "unknown" and "replayed": the caller
      // must not learn which of the two it hit.
      throw new UnauthorizedException('Invalid refresh token');
    }
    return toSessionResponse(result.tokens);
  }

  @Get('me')
  @ScreenAuth()
  identify(@Req() req: ScreenAuthenticatedRequest): {
    screenId: string;
    organisationId: string;
  } {
    return { screenId: req.screenId, organisationId: req.organisationId };
  }

  @Get(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findOne(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Screen> {
    return this.screenService.findOne(organisationId, id);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScreenDto,
  ): Promise<Screen> {
    return this.screenService.updateScreen(organisationId, id, dto);
  }

  @Post('bulk-delete')
  @Roles(OrganisationRole.OrgAdmin)
  bulkDelete(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkDeleteScreensDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ deleted: number; notFound: string[] }> {
    return this.screenService.bulkDelete(organisationId, dto.ids, req.user.userId);
  }

  @Post('bulk-assign-group')
  @Roles(OrganisationRole.OrgAdmin)
  bulkAssignGroup(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: BulkAssignGroupDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ updated: number; notFound: string[] }> {
    return this.screenService.bulkAssignGroup(
      organisationId,
      dto.ids,
      dto.groupId,
      req.user.userId,
    );
  }

  @Post(':id/repair')
  @Roles(OrganisationRole.OrgAdmin)
  // Same brute-force protection as create: re-pairing consumes a pairing code.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  repair(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RepairScreenDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Screen> {
    return this.screenService.repairScreen(organisationId, id, dto.pairingCode, req.user.userId);
  }

  @Post(':id/refresh')
  @Roles(OrganisationRole.OrgAdmin)
  refresh(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Screen> {
    return this.screenService.refreshScreen(organisationId, id, req.user.userId);
  }

  @Get(':id/state')
  @ScreenAuth()
  getState(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    this.assertOwnScreen(req, id);
    return this.screenStateService.getRenderedState(req.organisationId, id);
  }

  @Sse(':id/events')
  @ScreenAuth()
  events(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<MessageEvent> {
    // This used to be `void this.screenService.findOne(req.organisationId, id)`:
    // the promise was discarded, so the NotFoundException surfaced as an
    // unhandled rejection in a detached microtask and never blocked the
    // subscription — and `subscribe()` itself authorises nothing. The identity
    // check below is strictly stronger than the org check it replaces: the key's
    // screen necessarily lives in the key's organisation.
    this.assertOwnScreen(req, id);
    return this.screenStateService.subscribe(id);
  }

  @Post(':id/heartbeat')
  @ScreenAuth()
  heartbeat(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HeartbeatDto,
  ): Promise<Screen> {
    this.assertOwnScreen(req, id);
    return this.screenService.recordHeartbeat(req.organisationId, id, dto?.playerVersion);
  }

  /**
   * A screen API key authorises exactly one screen, but these routes take their
   * target from the path. Without this check a player could read a sibling
   * screen's rendered state, forge its heartbeat, or subscribe to its event
   * stream — across organisations, since the path is not tied to the key.
   *
   * Mirrors the check MediaController already performs for slice downloads.
   */
  private assertOwnScreen(req: ScreenAuthenticatedRequest, screenId: string): void {
    if (req.screenId !== screenId) {
      throw new ForbiddenException('Screen API key does not authorise this screen');
    }
  }
}
