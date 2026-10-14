import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
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
import { contents, type Content } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import {
  getOriginalPath,
  getStagingPath,
  getTranscodedPath,
  getThumbnailPath,
} from './content-storage.util';
import { JobMetricsService } from '../observability/job-metrics.service';
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

const TRANSCODED_LIMIT_ERROR = 'Transcoded file would exceed organisation transcoded storage limit';

interface RenditionFiles {
  livePath: string;
  stagingPath: string;
  liveThumbnailPath: string;
  stagingThumbnailPath: string;
}

interface StagedRendition {
  transcodedSizeBytes: number;
  thumbnailSizeBytes: number | null;
  durationSeconds: number | null;
  /** Transcoded file plus thumbnail, the amount billed to the transcoded quota. */
  totalBytes: number;
}

/** Bytes a content's current rendition occupies in the transcoded quota. */
const renditionBytes = (content: Content): number =>
  Number(content.transcodedSizeBytes ?? 0) + Number(content.thumbnailSizeBytes ?? 0);

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
    private readonly jobMetrics: JobMetricsService,
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

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.jobMetrics.recordCompleted('transcoding', job);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined): void {
    this.jobMetrics.recordFailed('transcoding', job);
  }

  /**
   * Transcodes into staging files next to the live ones and swaps them in only
   * once everything succeeded. Until then the previous rendition (if any) stays
   * servable, so a screen that loads a replaced item mid-transcode still gets
   * the old file instead of a 404. A failure leaves the previous file live.
   */
  private async processTranscode(job: Job<TranscodeJobData>): Promise<void> {
    const { contentId, organisationId } = job.data;

    this.logger.log(`Processing transcoding job ${job.id} for content ${contentId}`);

    // Update status to processing
    await this.updateStatus(contentId, TranscodingStatus.Processing);

    const files = this.renditionFiles(job);
    try {
      await fs.mkdir(path.dirname(files.livePath), { recursive: true });
      const rendition = await this.renderStaged(job, files);

      const previous = await this.findContent(contentId);
      if (!previous) {
        // Deleted while transcoding: nothing to swap into.
        await this.discardStaged(files);
        this.logger.log(`Content ${contentId} was deleted during transcoding; discarded result`);
        return;
      }

      // The previous rendition is replaced right below, so only the growth has
      // to fit the quota; old and new coexist only for the duration of the job.
      const sizeDelta = rendition.totalBytes - renditionBytes(previous);
      if (sizeDelta > 0 && !(await this.fitsTranscodedLimit(organisationId, sizeDelta))) {
        await this.discardStaged(files);
        await this.markFailed(job, TRANSCODED_LIMIT_ERROR);
        this.logger.warn(`Transcoding for content ${contentId} exceeded transcoded storage limit`);
        return;
      }

      await this.promoteStaged(files, rendition, previous);
      await this.db
        .update(contents)
        .set({
          type: job.data.type,
          transcodedSizeBytes: rendition.transcodedSizeBytes,
          thumbnailSizeBytes: rendition.thumbnailSizeBytes,
          durationSeconds: rendition.durationSeconds,
          transcodingStatus: TranscodingStatus.Completed,
          transcodingError: null,
        })
        .where(eq(contents.id, contentId));
      await this.bookTranscodedDelta(organisationId, sizeDelta);

      this.eventEmitter.emit(
        TRANSCODING_COMPLETED,
        new TranscodingCompletedEvent(contentId, organisationId, rendition.transcodedSizeBytes),
      );
      this.logger.log(
        `Transcoding completed for content ${contentId} (${rendition.transcodedSizeBytes} bytes)`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Transcoding failed for content ${contentId}: ${errorMessage}`);
      await this.discardStaged(files);
      await this.markFailed(job, errorMessage);
      throw error;
    }
  }

  /** Live and staging paths of the rendition and thumbnail a job produces. */
  private renditionFiles(job: Job<TranscodeJobData>): RenditionFiles {
    const { contentId, organisationId, type } = job.data;
    // Unique per job, so two re-uploads in quick succession never share a file.
    const token = String(job.id ?? Date.now());
    const targetExt = type === ContentType.Video ? 'mp4' : 'webp';
    const livePath = getTranscodedPath(this.mediaBasePath, organisationId, contentId, targetExt);
    const liveThumbnailPath = getThumbnailPath(this.mediaBasePath, organisationId, contentId);
    return {
      livePath,
      stagingPath: getStagingPath(livePath, token),
      liveThumbnailPath,
      stagingThumbnailPath: getStagingPath(liveThumbnailPath, token),
    };
  }

  /** Transcodes, thumbnails and probes into the staging files. */
  private async renderStaged(
    job: Job<TranscodeJobData>,
    files: RenditionFiles,
  ): Promise<StagedRendition> {
    const { contentId, originalPath, type } = job.data;
    if (type === ContentType.Video) {
      await this.transcodeVideo(job, originalPath, files.stagingPath);
    } else {
      await this.transcodeImage(job, originalPath, files.stagingPath);
    }
    const transcodedSizeBytes = (await fs.stat(files.stagingPath)).size;

    // Generate the thumbnail (best-effort). Videos use the transcoded MP4 so the
    // `thumbnail` filter can pick a representative frame; images use the ORIGINAL,
    // because FFmpeg's native WebP decoder cannot read back an animated WebP we
    // may have just produced from an animated source.
    const thumbnailSizeBytes = await this.generateThumbnailSafe(
      type,
      type === ContentType.Video ? files.stagingPath : originalPath,
      files.stagingThumbnailPath,
      contentId,
    );

    const durationSeconds =
      type === ContentType.Video ? await this.probeDuration(files.stagingPath, contentId) : null;
    return {
      transcodedSizeBytes,
      thumbnailSizeBytes,
      durationSeconds,
      totalBytes: transcodedSizeBytes + (thumbnailSizeBytes ?? 0),
    };
  }

  /**
   * Makes the staged files live. `rename` within one directory is atomic, so a
   * request sees either the old or the new file, never a half-written one, and
   * a download already streaming the old file keeps its handle.
   */
  private async promoteStaged(
    files: RenditionFiles,
    rendition: StagedRendition,
    previous: Content,
  ): Promise<void> {
    await fs.rename(files.stagingPath, files.livePath);
    if (rendition.thumbnailSizeBytes != null) {
      await fs.rename(files.stagingThumbnailPath, files.liveThumbnailPath);
    } else {
      // No new thumbnail: drop the old one, the frontend falls back to the file.
      await this.unlinkSafe(files.liveThumbnailPath);
    }
    // A re-upload that changed the type (image ↔ video) leaves the other extension behind.
    const previousExt = previous.type === ContentType.Video ? 'mp4' : 'webp';
    const previousPath = getTranscodedPath(
      this.mediaBasePath,
      previous.organisationId,
      previous.id,
      previousExt,
    );
    if (previousPath !== files.livePath) {
      await this.unlinkSafe(previousPath);
    }
  }

  private async discardStaged(files: RenditionFiles): Promise<void> {
    await this.unlinkSafe(files.stagingPath);
    await this.unlinkSafe(files.stagingThumbnailPath);
  }

  /**
   * Marks the job's content failed. Sizes, type and duration stay untouched:
   * they still describe the previous rendition, which remains live. The new
   * original stays stored, so the error refers to the file the user uploaded.
   */
  private async markFailed(job: Job<TranscodeJobData>, errorMessage: string): Promise<void> {
    const { contentId, organisationId } = job.data;
    const updated = await this.db
      .update(contents)
      .set({ transcodingStatus: TranscodingStatus.Failed, transcodingError: errorMessage })
      .where(eq(contents.id, contentId))
      .returning({ id: contents.id });
    // Content deleted mid-transcode: nobody is left to notify.
    if (updated.length === 0) return;
    this.eventEmitter.emit(
      TRANSCODING_FAILED,
      new TranscodingFailedEvent(contentId, organisationId, errorMessage),
    );
  }

  private async fitsTranscodedLimit(organisationId: string, bytes: number): Promise<boolean> {
    try {
      await this.storageService.checkTranscodedLimit(organisationId, bytes);
      return true;
    } catch {
      return false;
    }
  }

  private async bookTranscodedDelta(organisationId: string, sizeDelta: number): Promise<void> {
    if (sizeDelta > 0) {
      await this.storageService.addTranscodedUsage(organisationId, sizeDelta);
    } else if (sizeDelta < 0) {
      await this.storageService.subtractTranscodedUsage(organisationId, -sizeDelta);
    }
  }

  private async probeDuration(filePath: string, contentId: string): Promise<number | null> {
    try {
      const ffprobePath = this.ffmpegPath.replace(/ffmpeg/, 'ffprobe');
      return await ffprobeDuration(filePath, ffprobePath);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to extract duration for content ${contentId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async findContent(contentId: string): Promise<Content | undefined> {
    const [content] = await this.db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);
    return content;
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
