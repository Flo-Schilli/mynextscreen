import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { ContentSource } from '../db/schema';
import type { AdapterDescriptor } from './adapter.registry';
import {
  ContentSourceService,
  type SourceEventWithSlides,
  type SourceFacets,
} from './content-source.service';
import {
  CreateContentSourceDto,
  SourceEventsQueryDto,
  SourceFacetsQueryDto,
  UpdateContentSourceDto,
} from './dto';

const READ_ROLES = [OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer];
const WRITE_ROLES = [OrganisationRole.OrgAdmin, OrganisationRole.Editor];

/**
 * Content sources of the current organisation. Static routes come before
 * `:id`, otherwise `adapters` and `facets` would be parsed as an id.
 */
@Controller('content-sources')
export class ContentSourceController {
  constructor(private readonly sourceService: ContentSourceService) {}

  @Get('adapters')
  @Roles(...READ_ROLES)
  adapters(): AdapterDescriptor[] {
    return this.sourceService.adapters();
  }

  @Get('facets')
  @Roles(...READ_ROLES)
  facets(
    @CurrentOrganisation() organisationId: string,
    @Query() query: SourceFacetsQueryDto,
  ): Promise<SourceFacets> {
    return this.sourceService.facets(organisationId, query);
  }

  @Get()
  @Roles(...READ_ROLES)
  findAll(@CurrentOrganisation() organisationId: string): Promise<ContentSource[]> {
    return this.sourceService.findAll(organisationId);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateContentSourceDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ContentSource> {
    return this.sourceService.create(organisationId, dto, req.user.userId);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findOne(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ContentSource> {
    return this.sourceService.findOne(organisationId, id);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentSourceDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ContentSource> {
    return this.sourceService.update(organisationId, id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.sourceService.remove(organisationId, id, req.user.userId);
  }

  @Post(':id/sync')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.ACCEPTED)
  sync(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ queued: true }> {
    return this.sourceService.requestSync(organisationId, id, req.user.userId);
  }

  @Get(':id/events')
  @Roles(...READ_ROLES)
  events(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SourceEventsQueryDto,
  ): Promise<SourceEventWithSlides[]> {
    return this.sourceService.listEvents(organisationId, id, query);
  }
}
