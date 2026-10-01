import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Req } from '@nestjs/common';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { UpdateScreenRemoteControlDto } from './dto/update-screen-remote-control.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { toDashboardDto, type ScreenRemoteControlDto } from './screen-remote-control.dto-mapper';

@Controller('screens')
export class ScreenRemoteControlController {
  constructor(private readonly service: ScreenRemoteControlService) {}

  @Get(':id/remote-control')
  @Roles(OrganisationRole.OrgAdmin)
  async get(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) screenId: string,
  ): Promise<ScreenRemoteControlDto> {
    return toDashboardDto(await this.service.getForScreen(organisationId, screenId));
  }

  @Put(':id/remote-control')
  @Roles(OrganisationRole.OrgAdmin)
  async update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) screenId: string,
    @Body() dto: UpdateScreenRemoteControlDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScreenRemoteControlDto> {
    const saved = await this.service.upsert(organisationId, screenId, dto, req.user.userId);
    return toDashboardDto(saved);
  }
}
