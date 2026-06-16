import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { contents } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import { getOriginalPath, getTranscodedPath, getThumbnailPath } from './content-storage.util';
import { parseDuration, parseProgressTime, calculateProgress } from './ffmpeg-progress.util';
import { ffprobeDuration } from './ffprobe-duration.util';
import {
  TRANSCODING_COMPLETED,
  TRANSCODING_FAILED,
  TRANSCODING_PROGRESS,
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
  TranscodingProgressEvent,
} from './transcoding.event';

export interface TranscodeJobData {
  contentId: string;
  organisationId: string;
  originalPath: string;
  mimeType: string;
  type: ContentType;
}

/** Payload for the lightweight `thumbnail` job (backfill of existing content). */
export interface ThumbnailJobData {
  contentId: string;
  organisationId: string;
}

/** BullMQ job name for (re)generating a thumbnail without a full transcode. */
export const THUMBNAIL_JOB = 'thumbnail';

/** Longest edge of a generated thumbnail, in pixels. Never upscales. */
const THUMBNAIL_MAX_WIDTH = 480;

@Processor('transcoding')
export class TranscodingProcessor extends WorkerHost {
  private readonly logger = new Logger(TranscodingProcessor.name);
  private readonly mediaBasePath: string;
  private readonly ffmpegPath: string;
  private readonly videoCrf: string;
  private readonly videoPreset: string;
  private readonly videoMaxRate: string;
  private readonly videoBufSize: string;
  private readonly stripAudio: boolean;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {
    super();
    this.mediaBasePath = this.configService.get<string>('MEDIA_BASE_PATH', './media');
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.videoCrf = this.configService.get<string>('FFMPEG_VIDEO_CRF', '18');
    this.videoPreset = this.configService.get<string>('FFMPEG_VIDEO_PRESET', 'slow');
    this.videoMaxRate = this.configService.get<string>('FFMPEG_VIDEO_MAXRATE', '8M');
    this.videoBufSize = this.configService.get<string>('FFMPEG_VIDEO_BUFSIZE', '16M');
    this.stripAudio =
      this.configService.get<string>('FFMPEG_VIDEO_STRIP_AUDIO', 'false') === 'true';
  }

  async process(job: Job<TranscodeJobData | ThumbnailJobData>): Promise<void> {
    if (job.name === THUMBNAIL_JOB) {
      return this.processThumbnailJob(job as Job<ThumbnailJobData>);
    }
    return this.processTranscode(job as Job<TranscodeJobData>);
  }

  private async processTranscode(job: Job<TranscodeJobData>): Promise<void> {
    const { contentId, organisationId, originalPath, type } = job.data;

    this.logger.log(`Processing transcoding job ${job.id} for content ${contentId}`);

    // Update status to processing
    await this.updateStatus(contentId, TranscodingStatus.Processing);

    try {
      const targetExt = type === ContentType.Video ? 'mp4' : 'webp';
      const outputPath = getTranscodedPath(
        this.mediaBasePath,
        organisationId,
        contentId,
        targetExt,
      );
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      if (type === ContentType.Video) {
        await this.transcodeVideo(job, originalPath, outputPath);
      } else {
        await this.transcodeImage(job, originalPath, outputPath);
      }

      // Get transcoded file size
      const stat = await fs.stat(outputPath);
      const transcodedSizeBytes = stat.size;

      // Generate the thumbnail (best-effort). Videos use the transcoded MP4 so the
      // `thumbnail` filter can pick a representative frame; images use the ORIGINAL,
      // because FFmpeg's native WebP decoder cannot read back an animated WebP we
      // may have just produced from an animated source.
      const thumbnailPath = getThumbnailPath(this.mediaBasePath, organisationId, contentId);
      const thumbnailSource = type === ContentType.Video ? outputPath : originalPath;
      const thumbnailSizeBytes = await this.generateThumbnailSafe(
        type,
        thumbnailSource,
        thumbnailPath,
        contentId,
      );
      const addedBytes = transcodedSizeBytes + (thumbnailSizeBytes ?? 0);

      // Check transcoded storage limit before saving (transcoded + thumbnail)
      try {
        await this.storageService.checkTranscodedLimit(organisationId, addedBytes);
      } catch {
        // Limit exceeded: remove the transcoded file + thumbnail and mark as failed
        await this.unlinkSafe(outputPath);
        await this.unlinkSafe(thumbnailPath);
        const limitError = 'Transcoded file would exceed organisation transcoded storage limit';
        await this.db
          .update(contents)
          .set({
            transcodingStatus: TranscodingStatus.Failed,
            transcodingError: limitError,
          })
          .where(eq(contents.id, contentId));
        this.eventEmitter.emit(
          TRANSCODING_FAILED,
          new TranscodingFailedEvent(contentId, organisationId, limitError),
        );
        this.logger.warn(`Transcoding for content ${contentId} exceeded transcoded storage limit`);
        return;
      }

      // Extract video duration via ffprobe
      let durationSeconds: number | null = null;
      if (type === ContentType.Video) {
        try {
          const ffprobePath = this.ffmpegPath.replace(/ffmpeg/, 'ffprobe');
          durationSeconds = await ffprobeDuration(outputPath, ffprobePath);
        } catch (err: unknown) {
          this.logger.warn(
            `Failed to extract duration for content ${contentId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // Update content record
      await this.db
        .update(contents)
        .set({
          transcodedSizeBytes,
          thumbnailSizeBytes,
          durationSeconds,
          transcodingStatus: TranscodingStatus.Completed,
          transcodingError: null,
        })
        .where(eq(contents.id, contentId));

      // Update org storage counter (transcoded file + thumbnail)
      await this.storageService.addTranscodedUsage(organisationId, addedBytes);

      this.eventEmitter.emit(
        TRANSCODING_COMPLETED,
        new TranscodingCompletedEvent(contentId, organisationId, transcodedSizeBytes),
      );

      this.logger.log(
        `Transcoding completed for content ${contentId} (${transcodedSizeBytes} bytes)`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Transcoding failed for content ${contentId}: ${errorMessage}`);

      await this.db
        .update(contents)
        .set({
          transcodingStatus: TranscodingStatus.Failed,
          transcodingError: errorMessage,
        })
        .where(eq(contents.id, contentId));

      this.eventEmitter.emit(
        TRANSCODING_FAILED,
        new TranscodingFailedEvent(contentId, organisationId, errorMessage),
      );

      throw error;
    }
  }

  private transcodeVideo(
    job: Job<TranscodeJobData>,
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    const args = [
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-crf',
      this.videoCrf,
      '-preset',
      this.videoPreset,
      '-maxrate',
      this.videoMaxRate,
      '-bufsize',
      this.videoBufSize,
      '-pix_fmt',
      'yuv420p',
      ...(this.stripAudio ? ['-an'] : ['-c:a', 'aac']),
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ];

    return this.runFfmpeg(job, args);
  }

  private transcodeImage(
    job: Job<TranscodeJobData>,
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    const args = ['-i', inputPath, '-y', outputPath];

    return this.runFfmpeg(job, args);
  }

  /**
   * Regenerate a thumbnail for already-transcoded content (backfill / repair).
   * No-op if the content is missing, not yet completed, or already has a
   * thumbnail. Best-effort: a generation failure leaves `thumbnailSizeBytes`
   * null so the frontend keeps falling back to the transcoded URL.
   */
  private async processThumbnailJob(job: Job<ThumbnailJobData>): Promise<void> {
    const { contentId, organisationId } = job.data;

    const [content] = await this.db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    if (
      !content ||
      content.organisationId !== organisationId ||
      content.thumbnailSizeBytes != null ||
      content.transcodingStatus !== TranscodingStatus.Completed
    ) {
      return;
    }

    // Videos derive the thumbnail from the transcoded MP4 (good representative
    // frame); images use the ORIGINAL, since FFmpeg's native WebP decoder cannot
    // read back an animated WebP produced from an animated source.
    let thumbnailSource: string;
    if (content.type === ContentType.Video) {
      thumbnailSource = getTranscodedPath(this.mediaBasePath, organisationId, contentId, 'mp4');
    } else {
      const originalExt = path.extname(content.originalFilename).replace('.', '') || 'bin';
      thumbnailSource = getOriginalPath(this.mediaBasePath, organisationId, contentId, originalExt);
    }
    try {
      await fs.access(thumbnailSource);
    } catch {
      this.logger.warn(`Cannot backfill thumbnail for ${contentId}: source file missing`);
      return;
    }

    const thumbnailPath = getThumbnailPath(this.mediaBasePath, organisationId, contentId);
    const thumbnailSizeBytes = await this.generateThumbnailSafe(
      content.type,
      thumbnailSource,
      thumbnailPath,
      contentId,
    );
    if (thumbnailSizeBytes == null) {
      return;
    }

    try {
      await this.storageService.checkTranscodedLimit(organisationId, thumbnailSizeBytes);
    } catch {
      await this.unlinkSafe(thumbnailPath);
      this.logger.warn(`Thumbnail backfill for ${contentId} skipped: storage limit reached`);
      return;
    }

    await this.db.update(contents).set({ thumbnailSizeBytes }).where(eq(contents.id, contentId));
    await this.storageService.addTranscodedUsage(organisationId, thumbnailSizeBytes);
    this.logger.log(`Backfilled thumbnail for content ${contentId} (${thumbnailSizeBytes} bytes)`);
  }

  /**
   * Generate a small WebP thumbnail from a transcoded media file. Returns the
   * thumbnail size in bytes, or null on failure (logged, non-fatal). For videos
   * the `thumbnail` filter picks a representative frame (avoids black frames);
   * images are simply downscaled. Never upscales below the source width.
   */
  private async generateThumbnailSafe(
    type: ContentType,
    inputPath: string,
    outputPath: string,
    contentId: string,
  ): Promise<number | null> {
    // Comma inside min() must be escaped — ffmpeg parses commas as filter separators.
    const scale = `scale='min(${THUMBNAIL_MAX_WIDTH}\\,iw)':-2`;
    const filter = type === ContentType.Video ? `thumbnail,${scale}` : scale;
    const args = ['-i', inputPath, '-vf', filter, '-frames:v', '1', '-y', outputPath];

    try {
      await this.runFfmpegQuiet(args);
      const stat = await fs.stat(outputPath);
      return stat.size;
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to generate thumbnail for content ${contentId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      await this.unlinkSafe(outputPath);
      return null;
    }
  }

  private runFfmpeg(job: Job<TranscodeJobData>, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc: ChildProcess = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let totalDuration: number | null = null;
      let stderrOutput = '';

      proc.stderr!.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderrOutput += chunk;

        if (totalDuration === null) {
          totalDuration = parseDuration(chunk);
        }

        const currentTime = parseProgressTime(chunk);
        const progress = calculateProgress(currentTime, totalDuration);
        if (progress !== null) {
          job.updateProgress(progress).catch(() => {
            /* best-effort progress reporting */
          });
          this.eventEmitter.emit(
            TRANSCODING_PROGRESS,
            new TranscodingProgressEvent(job.data.contentId, job.data.organisationId, progress),
          );
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Extract last few lines of stderr for error context
          const lines = stderrOutput.trim().split('\n');
          const tail = lines.slice(-5).join('\n');
          reject(new Error(`FFmpeg exited with code ${code}: ${tail}`));
        }
      });
    });
  }

  /** Run FFmpeg without progress reporting; resolve on success, reject on error. */
  private runFfmpegQuiet(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc: ChildProcess = spawn(this.ffmpegPath, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderrOutput = '';
      proc.stderr!.on('data', (data: Buffer) => {
        stderrOutput += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const tail = stderrOutput.trim().split('\n').slice(-5).join('\n');
          reject(new Error(`FFmpeg exited with code ${code}: ${tail}`));
        }
      });
    });
  }

  private async updateStatus(contentId: string, status: TranscodingStatus): Promise<void> {
    await this.db
      .update(contents)
      .set({ transcodingStatus: status })
      .where(eq(contents.id, contentId));
  }

  private async unlinkSafe(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
