import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { CreateLiveStreamDto, UpdateLiveStreamDto } from './dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { LiveStream } from './live-stream.entity';

@Controller('live-streams')
export class LiveStreamController {
  constructor(private readonly liveStreamService: LiveStreamService) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateLiveStreamDto,
  ): Promise<LiveStream> {
    return this.liveStreamService.createLiveStream(organisationId, dto);
  }

  @Get()
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  findAll(
    @CurrentOrganisation() organisationId: string,
  ): Promise<LiveStream[]> {
    return this.liveStreamService.findAll(organisationId);
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
  ): Promise<LiveStream> {
    return this.liveStreamService.findOne(organisationId, id);
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveStreamDto,
  ): Promise<LiveStream> {
    return this.liveStreamService.updateLiveStream(organisationId, id, dto);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin)
  remove(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.liveStreamService.removeLiveStream(organisationId, id);
  }
}
