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
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { ScheduleEntry } from './schedule-entry.entity';
import { Playlist } from '../playlist/playlist.entity';

@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateScheduleEntryDto,
  ): Promise<ScheduleEntry> {
    return this.scheduleService.create(organisationId, dto);
  }

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  async find(
    @CurrentOrganisation() organisationId: string,
    @Query('screenId') screenId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<Record<string, unknown>[]> {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to
      ? new Date(to)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let entries: ScheduleEntry[];
    if (screenId) {
      entries = await this.scheduleService.findByScreen(
        screenId,
        organisationId,
        fromDate,
        toDate,
      );
    } else {
      entries = await this.scheduleService.findByOrganisation(
        organisationId,
        fromDate,
        toDate,
      );
    }

    return entries.map((entry) => ({
      ...entry,
      targetType: entry.targetType,
      targetId: entry.targetId,
    }));
  }

  @Get('current')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  getCurrentPlaylist(
    @Query('screenId') screenId: string,
  ): Promise<{ playlist: Playlist | null; isDefault: boolean }> {
    return this.scheduleService.getCurrentPlaylist(screenId);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleEntryDto,
  ): Promise<ScheduleEntry> {
    return this.scheduleService.update(id, organisationId, dto);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  delete(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.scheduleService.delete(id, organisationId);
  }
}
