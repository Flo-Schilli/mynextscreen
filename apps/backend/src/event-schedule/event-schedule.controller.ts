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
  Put,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { CreateEventScheduleRuleDto, UpdateEventScheduleRuleDto } from './dto';
import {
  EventScheduleRuleService,
  type EventSchedulePreviewItem,
  type EventScheduleRuleView,
} from './event-schedule-rule.service';

const READ_ROLES = [OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer];
const WRITE_ROLES = [OrganisationRole.OrgAdmin, OrganisationRole.Editor];

/** Rules that schedule a playlist on the event days of a content source. */
@Controller('content-sources/:sourceId/event-schedules')
export class EventScheduleController {
  constructor(private readonly ruleService: EventScheduleRuleService) {}

  @Get()
  @Roles(...READ_ROLES)
  findAll(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ): Promise<EventScheduleRuleView[]> {
    return this.ruleService.findAll(organisationId, sourceId);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() dto: CreateEventScheduleRuleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<EventScheduleRuleView> {
    return this.ruleService.create(organisationId, sourceId, dto, req.user.userId);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findOne(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventScheduleRuleView> {
    return this.ruleService.findOne(organisationId, sourceId, id);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventScheduleRuleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<EventScheduleRuleView> {
    return this.ruleService.update(organisationId, sourceId, id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.ruleService.remove(organisationId, sourceId, id, req.user.userId);
  }

  @Get(':id/preview')
  @Roles(...READ_ROLES)
  preview(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventSchedulePreviewItem[]> {
    return this.ruleService.preview(organisationId, sourceId, id);
  }

  @Put(':id/exclusions/:eventId')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  exclude(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.ruleService.setExcluded(
      organisationId,
      sourceId,
      id,
      eventId,
      true,
      req.user.userId,
    );
  }

  @Delete(':id/exclusions/:eventId')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  include(
    @CurrentOrganisation() organisationId: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.ruleService.setExcluded(
      organisationId,
      sourceId,
      id,
      eventId,
      false,
      req.user.userId,
    );
  }
}
