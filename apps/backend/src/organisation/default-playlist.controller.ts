import { Controller, Get, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrgFromParam } from '../auth/org-from-param.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { OrganisationService } from './organisation.service';
import { SetDefaultPlaylistDto } from './dto';
import type { Organisation } from '../db/schema';

/** What every member may see of the default playlist; the rest of the organisation stays super-admin only. */
export interface DefaultPlaylistView {
  playlistId: string | null;
}

@Controller('organisations/:orgId/default-playlist')
@OrgFromParam('orgId')
export class DefaultPlaylistController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async getDefaultPlaylist(
    @Param('orgId', ParseUUIDPipe) orgId: string,
  ): Promise<DefaultPlaylistView> {
    const organisation = await this.organisationService.findOne(orgId);
    return { playlistId: organisation.defaultPlaylistId };
  }

  @Patch()
  @Roles(OrganisationRole.OrgAdmin)
  setDefaultPlaylist(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: SetDefaultPlaylistDto,
  ): Promise<Organisation> {
    return this.organisationService.setDefaultPlaylist(orgId, dto.playlistId);
  }
}
