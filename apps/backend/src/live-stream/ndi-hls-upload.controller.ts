import {
  BadRequestException,
  Controller,
  Delete,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UnsupportedMediaTypeException,
  Body,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AgentAuth } from '../auth/agent-auth.decorator';
import type { AgentAuthenticatedRequest } from '../auth/agent-auth.guard';
import { LiveStreamService } from './live-stream.service';
import { NdiHlsStorageService } from './ndi-hls-storage.service';

/**
 * A segment a second plus the playlist is already above the global default
 * budget of 120 per minute, so these routes get their own.
 */
const SEGMENT_TYPE = 'video/mp2t';
const PLAYLIST_TYPE = 'application/vnd.apple.mpegurl';

/** The one content type each kind of HLS file may be uploaded with. */
function expectedContentType(filename: string): string {
  return filename.endsWith('.m3u8') ? PLAYLIST_TYPE : SEGMENT_TYPE;
}

const UPLOAD_THROTTLE = { default: { limit: 1200, ttl: 60_000 } };

/**
 * Where a site agent pushes the HLS files of an NDI stream.
 *
 * Lives with the live-stream module because it owns the disk layout; the route
 * stays under `/agents/me` with the other agent endpoints. An agent token is an
 * identity, not an authorisation, so every request is scoped to a stream that
 * belongs to the agent's organisation, is bound to that agent and is active.
 */
@Controller('agents/me/live-streams')
export class NdiHlsUploadController {
  constructor(
    private readonly liveStreams: LiveStreamService,
    private readonly storage: NdiHlsStorageService,
  ) {}

  @Put(':streamId/hls/:filename')
  @AgentAuth()
  @Throttle(UPLOAD_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async upload(
    @Req() req: AgentAuthenticatedRequest,
    @Param('streamId', ParseUUIDPipe) streamId: string,
    @Param('filename') filename: string,
    @Body() body: unknown,
    @Headers('content-type') rawContentType?: string,
  ): Promise<void> {
    await this.liveStreams.findActiveNdiStreamForAgent(req.organisationId, req.agentId, streamId);
    const contentType = (rawContentType ?? '').split(';')[0].trim().toLowerCase();
    if (contentType !== expectedContentType(filename)) {
      throw new UnsupportedMediaTypeException(
        `Expected ${expectedContentType(filename)} for ${filename}`,
      );
    }
    if (!Buffer.isBuffer(body)) {
      throw new UnsupportedMediaTypeException('Expected a video/mp2t or HLS playlist body');
    }
    if (body.length === 0) {
      throw new BadRequestException('Empty upload');
    }
    await this.storage.write(streamId, filename, body);
  }

  @Delete(':streamId/hls/:filename')
  @AgentAuth()
  @Throttle(UPLOAD_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AgentAuthenticatedRequest,
    @Param('streamId', ParseUUIDPipe) streamId: string,
    @Param('filename') filename: string,
  ): Promise<void> {
    await this.liveStreams.findActiveNdiStreamForAgent(req.organisationId, req.agentId, streamId);
    await this.storage.remove(streamId, filename);
  }
}
