import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import { getTranscodedPath } from './content-storage.util';
import {
  parseDuration,
  parseProgressTime,
  calculateProgress,
} from './ffmpeg-progress.util';
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
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {
    super();
    this.mediaBasePath = this.configService.get<string>(
      'MEDIA_BASE_PATH',
      './media',
    );
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.videoCrf = this.configService.get<string>('FFMPEG_VIDEO_CRF', '18');
    this.videoPreset = this.configService.get<string>(
      'FFMPEG_VIDEO_PRESET',
      'slow',
    );
    this.videoMaxRate = this.configService.get<string>(
      'FFMPEG_VIDEO_MAXRATE',
      '8M',
    );
    this.videoBufSize = this.configService.get<string>(
      'FFMPEG_VIDEO_BUFSIZE',
      '16M',
    );
    this.stripAudio =
      this.configService.get<string>('FFMPEG_VIDEO_STRIP_AUDIO', 'false') ===
      'true';
  }

  async process(job: Job<TranscodeJobData>): Promise<void> {
    const { contentId, organisationId, originalPath, type } = job.data;

    this.logger.log(
      `Processing transcoding job ${job.id} for content ${contentId}`,
    );

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

      // Check transcoded storage limit before saving
      try {
        await this.storageService.checkTranscodedLimit(
          organisationId,
          transcodedSizeBytes,
        );
      } catch {
        // Limit exceeded: remove the transcoded file and mark as failed
        await this.unlinkSafe(outputPath);
        const limitError =
          'Transcoded file would exceed organisation transcoded storage limit';
        await this.contentRepository.update(contentId, {
          transcodingStatus: TranscodingStatus.Failed,
          transcodingError: limitError,
        });
        this.eventEmitter.emit(
          TRANSCODING_FAILED,
          new TranscodingFailedEvent(contentId, organisationId, limitError),
        );
        this.logger.warn(
          `Transcoding for content ${contentId} exceeded transcoded storage limit`,
        );
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
      await this.contentRepository.update(contentId, {
        transcodedSizeBytes,
        durationSeconds,
        transcodingStatus: TranscodingStatus.Completed,
        transcodingError: null,
      });

      // Update org storage counter
      await this.storageService.addTranscodedUsage(
        organisationId,
        transcodedSizeBytes,
      );

      this.eventEmitter.emit(
        TRANSCODING_COMPLETED,
        new TranscodingCompletedEvent(
          contentId,
          organisationId,
          transcodedSizeBytes,
        ),
      );

      this.logger.log(
        `Transcoding completed for content ${contentId} (${transcodedSizeBytes} bytes)`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Transcoding failed for content ${contentId}: ${errorMessage}`,
      );

      await this.contentRepository.update(contentId, {
        transcodingStatus: TranscodingStatus.Failed,
        transcodingError: errorMessage,
      });

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
            new TranscodingProgressEvent(
              job.data.contentId,
              job.data.organisationId,
              progress,
            ),
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

  private async updateStatus(
    contentId: string,
    status: TranscodingStatus,
  ): Promise<void> {
    await this.contentRepository.update(contentId, {
      transcodingStatus: status,
    });
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
