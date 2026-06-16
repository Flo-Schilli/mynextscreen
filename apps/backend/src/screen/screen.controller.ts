import { Controller, Get, Post, Patch, Param, Body, Req, Sse, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { ScreenService, type ScreenWithPlaylist } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import {
  CreateScreenDto,
  RepairScreenDto,
  UpdateScreenDto,
  BulkDeleteScreensDto,
  BulkAssignGroupDto,
} from './dto';
import { Roles } from '../auth/roles.decorator';
import { ScreenAuth, ScreenAuthenticatedRequest, AuthenticatedRequest } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { Screen } from '../db/schema';

interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

@Controller('screens')
export class ScreenController {
  constructor(
    private readonly screenService: ScreenService,
    private readonly screenStateService: ScreenStateService,
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
    return this.screenStateService.getRenderedState(req.organisationId, id);
  }

  @Sse(':id/events')
  @ScreenAuth()
  events(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Observable<MessageEvent> {
    // Validate screen exists and belongs to the org
    void this.screenService.findOne(req.organisationId, id);
    return this.screenStateService.subscribe(id);
  }

  @Post(':id/heartbeat')
  @ScreenAuth()
  heartbeat(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Screen> {
    return this.screenService.recordHeartbeat(req.organisationId, id);
  }
}
