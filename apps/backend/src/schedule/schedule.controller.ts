import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../auth';
import { ScheduleService } from './schedule.service';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { ScheduleEntry, Playlist } from '../db/schema';
import type { DisplacedSlot } from './displaced-slots';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateScheduleEntryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScheduleEntry> {
    return this.scheduleService.create(organisationId, dto, req.user.userId);
  }

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async find(
    @CurrentOrganisation() organisationId: string,
    @Query('screenId') screenId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<Record<string, unknown>[]> {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let entries: ScheduleEntry[];
    if (screenId) {
      entries = await this.scheduleService.findByScreen(screenId, organisationId, fromDate, toDate);
    } else {
      entries = await this.scheduleService.findByOrganisation(organisationId, fromDate, toDate);
    }

    return entries.map((entry) => ({
      ...entry,
      targetType: entry.groupId ? 'group' : 'screen',
      targetId: entry.groupId ?? entry.screenId,
    }));
  }

  /** Slots event schedule rules left to other entries; shown, never played. */
  @Get('displaced')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  findDisplaced(@CurrentOrganisation() organisationId: string): Promise<DisplacedSlot[]> {
    return this.scheduleService.findDisplaced(organisationId);
  }

  @Get('current')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  getCurrentPlaylist(
    @CurrentOrganisation() organisationId: string,
    @Query('screenId', ParseUUIDPipe) screenId: string,
  ): Promise<{ playlist: Playlist | null; isDefault: boolean }> {
    return this.scheduleService.getCurrentPlaylistScoped(organisationId, screenId);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleEntryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScheduleEntry> {
    return this.scheduleService.update(id, organisationId, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  delete(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.scheduleService.delete(id, organisationId, req.user.userId);
  }
}
