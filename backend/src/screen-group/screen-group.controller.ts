import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ScreenGroupService } from './screen-group.service';
import { CreateScreenGroupDto, UpdateScreenGroupDto, AssignScreenDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { ScreenGroup } from './screen-group.entity';
import { Screen } from '../screen/screen.entity';

@Controller('screen-groups')
export class ScreenGroupController {
  constructor(private readonly screenGroupService: ScreenGroupService) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateScreenGroupDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScreenGroup> {
    return this.screenGroupService.createGroup(organisationId, dto, req.user.userId);
  }

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  findAll(
    @CurrentOrganisation() organisationId: string,
  ): Promise<ScreenGroup[]> {
    return this.screenGroupService.findAll(organisationId);
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
  ): Promise<ScreenGroup> {
    return this.screenGroupService.findOne(organisationId, id);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScreenGroupDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ScreenGroup> {
    return this.screenGroupService.updateGroup(organisationId, id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin)
  remove(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.screenGroupService.removeGroup(organisationId, id, req.user.userId);
  }

  @Put(':groupId/screens/:screenId')
  @Roles(OrganisationRole.OrgAdmin)
  assignScreen(
    @CurrentOrganisation() organisationId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @Body() dto: AssignScreenDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Screen> {
    return this.screenGroupService.assignScreen(
      organisationId,
      groupId,
      screenId,
      dto,
      req.user.userId,
    );
  }

  @Delete(':groupId/screens/:screenId')
  @Roles(OrganisationRole.OrgAdmin)
  removeScreen(
    @CurrentOrganisation() organisationId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Screen> {
    return this.screenGroupService.removeScreen(
      organisationId,
      groupId,
      screenId,
      req.user.userId,
    );
  }
}
