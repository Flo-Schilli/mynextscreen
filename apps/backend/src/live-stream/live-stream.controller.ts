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
import { ScreenAuthenticatedRequest } from '../auth/api-key-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ScreenAuth } from '../auth/screen-auth.decorator';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { LiveStream } from '../db/schema';
import { LiveStreamStatus } from './live-stream-status.enum';
import { LiveStreamSourceType } from './live-stream-source-type.enum';
import {
  NdiStreamStatusService,
  type NdiStreamStatus,
} from '../site-agent/ndi-stream-status.service';

export interface LiveStreamWithHealth extends Omit<LiveStream, 'qualityPreset' | 'encoderPref'> {
  /** Null for pull streams, where the NDI settings do not apply. */
  qualityPreset: LiveStream['qualityPreset'] | null;
  encoderPref: LiveStream['encoderPref'] | null;
  health?: StreamHealthState;
}

export interface LiveStreamDetail extends LiveStreamWithHealth {
  ndiStatus?: NdiStreamStatus;
}

/** The NDI settings carry column defaults on pull streams; the API hides them. */
function toResponse(stream: LiveStream): LiveStreamWithHealth {
  if (stream.sourceType === LiveStreamSourceType.Ndi) {
    return { ...stream };
  }
  return { ...stream, qualityPreset: null, encoderPref: null };
}

/** An active NDI playlist older than this means the agent stopped uploading. */
const NDI_PLAYLIST_STALE_MS = 10_000;

@Controller('live-streams')
export class LiveStreamController {
  constructor(
    private readonly liveStreamService: LiveStreamService,
    private readonly ffmpegLiveService: FfmpegLiveService,
    private readonly streamHealthService: StreamHealthService,
    private readonly ndiStatusService: NdiStreamStatusService,
  ) {}

  @Post()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  async create(
    @CurrentOrganisation() organisationId: string,
    @Body() dto: CreateLiveStreamDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<LiveStreamWithHealth> {
    return toResponse(
      await this.liveStreamService.createLiveStream(organisationId, dto, req.user.userId),
    );
  }

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async findAll(@CurrentOrganisation() organisationId: string): Promise<LiveStreamWithHealth[]> {
    const streams = await this.liveStreamService.findAll(organisationId);

    return streams.map((stream) => {
      const result = toResponse(stream);
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
  async findOne(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LiveStreamDetail> {
    const stream = await this.liveStreamService.findOne(organisationId, id);
    const detail: LiveStreamDetail = toResponse(stream);
    const ndiStatus =
      stream.sourceType === LiveStreamSourceType.Ndi
        ? this.ndiStatusService.get(stream.id, stream.agentId)
        : undefined;
    if (ndiStatus) {
      detail.ndiStatus = ndiStatus;
    }
    return detail;
  }

  @Patch(':id')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor)
  async update(
    @CurrentOrganisation() organisationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveStreamDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<LiveStreamWithHealth> {
    return toResponse(
      await this.liveStreamService.updateLiveStream(organisationId, id, dto, req.user.userId),
    );
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
  async servePlaylist(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    // A valid screen API key only proves *some* screen; it says nothing about
    // which tenant owns this stream. Without this check any screen could pull
    // any other organisation's live stream given its UUID.
    const stream = await this.liveStreamService.findOne(req.organisationId, id);

    const hlsDir = this.ffmpegLiveService.getHlsOutputDir(id);
    const filePath = path.resolve(path.join(hlsDir, 'index.m3u8'));

    if (!fs.existsSync(filePath)) {
      // While FFmpeg (pull) or the agent's first upload (NDI) is still on its
      // way, return 503 so hls.js retries instead of giving up on a 404.
      const isNdiStarting =
        stream.sourceType === LiveStreamSourceType.Ndi && stream.status === LiveStreamStatus.Active;
      if (isNdiStarting || this.ffmpegLiveService.isRunning(id)) {
        throw new ServiceUnavailableException('HLS playlist not ready yet');
      }
      throw new NotFoundException('HLS playlist not found');
    }

    // The agent rewrites an NDI playlist every segment. One that has not been
    // touched for a while means the agent stopped uploading; answer 503 so the
    // player retries or falls back instead of looping on stale segments.
    if (
      stream.sourceType === LiveStreamSourceType.Ndi &&
      stream.status === LiveStreamStatus.Active &&
      Date.now() - fs.statSync(filePath).mtimeMs > NDI_PLAYLIST_STALE_MS
    ) {
      throw new ServiceUnavailableException('HLS playlist is stale');
    }

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath);
  }

  @Get(':id/hls/:segment')
  @ScreenAuth()
  async serveSegment(
    @Req() req: ScreenAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segment') segment: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.liveStreamService.findOne(req.organisationId, id);

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
