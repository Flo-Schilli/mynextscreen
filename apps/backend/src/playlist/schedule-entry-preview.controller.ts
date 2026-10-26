import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import {
  ScheduleEntryPreviewService,
  type ScheduleEntryPreview,
} from './schedule-entry-preview.service';

/**
 * Lives with playlists rather than schedules: previewing needs the rule
 * resolver, and the schedule module must not depend on the playlist module.
 */
@Controller('schedules')
export class ScheduleEntryPreviewController {
  constructor(private readonly previews: ScheduleEntryPreviewService) {}

  /** What the entry's playlist shows now. */
  @Get(':id/preview')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  preview(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScheduleEntryPreview> {
    return this.previews.preview(organisationId, id);
  }
}
