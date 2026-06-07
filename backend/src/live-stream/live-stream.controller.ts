import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  ParseUUIDPipe,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LiveStreamService, ActivateStreamResult } from './live-stream.service';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { StreamHealthService, StreamHealthState } from './stream-health.service';
import { CreateLiveStreamDto, UpdateLiveStreamDto, ActivateLiveStreamDto } from './dto';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ScreenAuth } from '../auth/screen-auth.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { LiveStream } from './live-stream.entity';
import { LiveStreamStatus } from './live-stream-status.enum';

export interface LiveStreamWithHealth extends LiveStream {
  health?: StreamHealthState;
}

@Controller('live-streams')
export class LiveStreamController {
  constructor(
    private readonly liveStreamService: LiveStreamService,
    private readonly ffmpegLiveService: FfmpegLiveService,
    private readonly streamHealthService: StreamHealthService,
  ) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateLiveStreamDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<LiveStream> {
    return this.liveStreamService.createLiveStream(organisationId, dto, req.user.userId);
  }

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async findAll(@CurrentOrganisation() organisationId: string): Promise<LiveStreamWithHealth[]> {
    const streams = await this.liveStreamService.findAll(organisationId);

    return streams.map((stream) => {
      const result: LiveStreamWithHealth = { ...stream };
      if (stream.status === LiveStreamStatus.Active) {
        const health = this.streamHealthService.getHealth(stream.id);
        if (health) {
          result.health = health;
        }
      }
      return result;
    });
  }

  @Get(':id/health')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async getHealth(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamHealthState> {
    // Verify the stream exists and belongs to the org
    const stream = await this.liveStreamService.findOne(organisationId, id);

    const health = this.streamHealthService.getHealth(id);
    if (health) {
      return health;
    }

    // Return a default state if no health check has run yet
    return {
      streamId: id,
      status: stream.status,
      health: stream.status === LiveStreamStatus.Active ? 'healthy' : 'stopped',
      checkedAt: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
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
    @Req() req: AuthenticatedRequest,
  ): Promise<LiveStream> {
    return this.liveStreamService.updateLiveStream(organisationId, id, dto, req.user.userId);
  }

  @Delete(':id')
  @Roles(OrganisationRole.OrgAdmin)
  remove(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.liveStreamService.removeLiveStream(organisationId, id, req.user.userId);
  }

  @Post(':id/activate')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  activate(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivateLiveStreamDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ActivateStreamResult> {
    return this.liveStreamService.activateStream(organisationId, id, dto, req.user.userId);
  }

  @Post(':id/deactivate')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  deactivate(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<LiveStream> {
    return this.liveStreamService.deactivateStream(organisationId, id, req.user.userId);
  }

  @Get(':id/hls/index.m3u8')
  @ScreenAuth()
  servePlaylist(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): void {
    const hlsDir = this.ffmpegLiveService.getHlsOutputDir(id);
    const filePath = path.resolve(path.join(hlsDir, 'index.m3u8'));

    if (!fs.existsSync(filePath)) {
      // If FFmpeg is still starting up, return 503 so hls.js retries
      if (this.ffmpegLiveService.isRunning(id)) {
        throw new ServiceUnavailableException('HLS playlist not ready yet');
      }
      throw new NotFoundException('HLS playlist not found');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.sendFile(filePath);
  }

  @Get(':id/hls/:segment')
  @ScreenAuth()
  serveSegment(
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
