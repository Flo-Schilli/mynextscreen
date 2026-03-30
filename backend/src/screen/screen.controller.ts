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
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { CreateScreenDto, UpdateScreenDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { ScreenAuth, ScreenAuthenticatedRequest } from '../auth';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { Screen } from './screen.entity';

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
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateScreenDto,
  ): Promise<{ screen: Screen; apiKey: string }> {
    return this.screenService.createScreen(organisationId, dto);
  }

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  findAll(@CurrentOrganisation() organisationId: string): Promise<Screen[]> {
    return this.screenService.findAll(organisationId);
  }

  @Get(':id')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
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

  @Post(':id/regenerate-key')
  @Roles(OrganisationRole.OrgAdmin)
  regenerateKey(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ screen: Screen; apiKey: string }> {
    return this.screenService.regenerateApiKey(organisationId, id);
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
