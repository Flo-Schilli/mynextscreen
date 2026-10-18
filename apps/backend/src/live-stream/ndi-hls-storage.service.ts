import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES, resolveNdiHlsMaxUploadBytes } from './ndi-hls-limits';

export { DEFAULT_NDI_HLS_MAX_UPLOAD_BYTES };

/** Playlist or numbered segment, nothing else. Mirrors what the agent produces. */
export const HLS_FILENAME_PATTERN = /^(index\.m3u8|[A-Za-z0-9_-]+\.ts)$/;

const STREAM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Owns the on-disk HLS layout for NDI streams, whose files arrive by upload
 * from a site agent instead of being written by a local FFmpeg.
 *
 * Every path that touches disk goes through {@link resolveTarget}: the file
 * name comes from a URL an agent controls, so it is allow-listed, reduced to a
 * basename and checked to still sit inside the stream's own directory.
 */
@Injectable()
export class NdiHlsStorageService {
  private readonly logger = new Logger(NdiHlsStorageService.name);

  constructor(
    private readonly ffmpegLiveService: FfmpegLiveService,
    private readonly config: ConfigService,
  ) {}

  get maxUploadBytes(): number {
    return resolveNdiHlsMaxUploadBytes(this.config);
  }

  /** Writes a file atomically: temp file in the same directory, then rename. */
  async write(streamId: string, filename: string, body: Buffer): Promise<void> {
    if (body.length > this.maxUploadBytes) {
      throw new PayloadTooLargeException(
        `Upload exceeds the limit of ${this.maxUploadBytes} bytes`,
      );
    }
    const target = this.resolveTarget(streamId, filename);
    const dir = path.dirname(target);
    const temp = path.join(dir, `.${randomUUID()}.tmp`);

    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(temp, body);
      await fs.rename(temp, target);
    } catch (error) {
      await fs.rm(temp, { force: true });
      throw error;
    }
  }

  /** Removes one file; a file that is already gone is not an error. */
  async remove(streamId: string, filename: string): Promise<void> {
    await fs.rm(this.resolveTarget(streamId, filename), { force: true });
  }

  /** Removes the whole stream directory, e.g. on deactivation. Best effort. */
  async removeStreamDir(streamId: string): Promise<void> {
    try {
      await fs.rm(this.ffmpegLiveService.getHlsOutputDir(streamId), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[stream:${streamId}] Could not remove HLS directory: ${reason}`);
    }
  }

  private resolveTarget(streamId: string, filename: string): string {
    if (!STREAM_ID_PATTERN.test(streamId)) {
      throw new BadRequestException('Invalid stream id');
    }
    if (!HLS_FILENAME_PATTERN.test(filename) || path.basename(filename) !== filename) {
      throw new BadRequestException('Invalid HLS filename');
    }
    const dir = path.resolve(this.ffmpegLiveService.getHlsOutputDir(streamId));
    const target = path.resolve(dir, filename);
    if (!target.startsWith(dir + path.sep)) {
      throw new BadRequestException('Invalid HLS filename');
    }
    return target;
  }
}
