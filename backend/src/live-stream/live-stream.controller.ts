import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Res,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LiveStreamService } from './live-stream.service';
import { FfmpegLiveService } from './ffmpeg-live.service';
import {
  CreateLiveStreamDto,
  UpdateLiveStreamDto,
  ActivateLiveStreamDto,
} from './dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { LiveStream } from './live-stream.entity';

@Controller('live-streams')
export class LiveStreamController {
  constructor(
    private readonly liveStreamService: LiveStreamService,
    private readonly ffmpegLiveService: FfmpegLiveService,
  ) {}

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

  @Post(':id/activate')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  activate(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateLiveStreamDto,
  ): Promise<LiveStream> {
    return this.liveStreamService.activateStream(organisationId, id, dto);
  }

  @Post(':id/deactivate')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  deactivate(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LiveStream> {
    return this.liveStreamService.deactivateStream(organisationId, id);
  }

  @Get(':id/hls/index.m3u8')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  servePlaylist(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): void {
    const hlsDir = this.ffmpegLiveService.getHlsOutputDir(id);
    const filePath = path.resolve(path.join(hlsDir, 'index.m3u8'));

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('HLS playlist not found');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.sendFile(filePath);
  }

  @Get(':id/hls/:segment')
  @Roles(
    OrganisationRole.OrgAdmin,
    OrganisationRole.Editor,
    OrganisationRole.Viewer,
  )
  serveSegment(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segment') segment: string,
    @Res() res: Response,
  ): void {
    // Sanitize segment filename to prevent path traversal
    const sanitized = path.basename(segment);
    const hlsDir = this.ffmpegLiveService.getHlsOutputDir(id);
    const filePath = path.resolve(path.join(hlsDir, sanitized));

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('HLS segment not found');
    }

    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.sendFile(filePath);
  }
}
