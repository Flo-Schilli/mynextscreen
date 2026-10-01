import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { UpdateScreenRemoteControlDto } from './dto/update-screen-remote-control.dto';
import { ScreenRemoteCommandDto } from './dto/screen-remote-command.dto';
import { ScreenOnboardingCheckDto } from './dto/screen-onboarding-check.dto';
import {
  ScreenRemoteCommandService,
  type DispatchedCommand,
} from './screen-remote-command.service';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { toDashboardDto, type ScreenRemoteControlDto } from './screen-remote-control.dto-mapper';

@Controller('screens')
export class ScreenRemoteControlController {
  constructor(
    private readonly service: ScreenRemoteControlService,
    private readonly commands: ScreenRemoteCommandService,
  ) {}

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

  /**
   * Runs an action on the TV now. Answers 202 with a correlation id; the
   * outcome arrives on the dashboard's own SSE stream, so nothing has to hold
   * an HTTP request open across a round trip to the venue.
   *
   * 409 when the agent is offline — deliberately not queued. A "start the app
   * now" that fires six hours later is worse than none, and the operator needs
   * to know the venue is unreachable.
   */
  @Post(':id/remote-control/commands')
  @Roles(OrganisationRole.OrgAdmin)
  @HttpCode(HttpStatus.ACCEPTED)
  command(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) screenId: string,
    @Body() dto: ScreenRemoteCommandDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DispatchedCommand> {
    return this.commands.dispatchManual(organisationId, screenId, dto.type, req.user.userId);
  }

  /** One step of the onboarding wizard; same 202-then-SSE shape as above. */
  @Post(':id/remote-control/checks')
  @Roles(OrganisationRole.OrgAdmin)
  @HttpCode(HttpStatus.ACCEPTED)
  check(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) screenId: string,
    @Body() dto: ScreenOnboardingCheckDto,
  ): Promise<DispatchedCommand> {
    return this.commands.dispatchCheck(organisationId, screenId, dto.step);
  }
}
