import { Controller, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { OrganisationService } from './organisation.service';
import { SetDefaultPlaylistDto } from './dto';
import type { Organisation } from '../db/schema';

@Controller('organisations/:orgId/default-playlist')
export class DefaultPlaylistController {
  constructor(private readonly organisationService: OrganisationService) {}

  @Patch()
  @Roles(OrganisationRole.OrgAdmin)
  setDefaultPlaylist(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: SetDefaultPlaylistDto,
  ): Promise<Organisation> {
    return this.organisationService.setDefaultPlaylist(orgId, dto.playlistId);
  }
}
