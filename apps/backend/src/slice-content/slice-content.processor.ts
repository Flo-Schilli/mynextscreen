import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, asc, eq } from 'drizzle-orm';
import { Job } from 'bullmq';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { slicedRenditions, screenGroups, screens, playlists, playlistItems } from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { computeCropParams, buildCropFilter } from './crop-computation.util';
import { getOriginalPath, getTranscodedPath } from '../content/content-storage.util';
import { SliceStatusService } from './slice-status.service';
import { GROUP_SCHEDULE_CHANGED, GroupScheduleChangedEvent } from '../schedule/schedule.event';
import { JobMetricsService } from '../observability/job-metrics.service';
import { SLICE_CONTENT_QUEUE } from './slice-content.constants';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface SliceContentJobData {
  groupId: string;
  scheduleId: string;
  playlistId: string;
  organisationId: string;
}

@Processor('slice-content')
export class SliceContentProcessor extends WorkerHost {
  private readonly logger = new Logger(SliceContentProcessor.name);
  private readonly mediaBasePath: string;
  private readonly ffmpegPath: string;
  private readonly videoCrf: string;
  private readonly videoPreset: string;
  private readonly videoMaxRate: string;
  private readonly videoBufSize: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
    private readonly sliceStatus: SliceStatusService,
    private readonly eventEmitter: EventEmitter2,
    private readonly jobMetrics: JobMetricsService,
  ) {
    super();
    this.mediaBasePath = this.configService.get<string>('MEDIA_BASE_PATH', './media');
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.videoCrf = this.configService.get<string>('FFMPEG_VIDEO_CRF', '18');
    this.videoPreset = this.configService.get<string>('FFMPEG_VIDEO_PRESET', 'slow');
    this.videoMaxRate = this.configService.get<string>('FFMPEG_VIDEO_MAXRATE', '8M');
    this.videoBufSize = this.configService.get<string>('FFMPEG_VIDEO_BUFSIZE', '16M');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.jobMetrics.recordCompleted(SLICE_CONTENT_QUEUE, job);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined): void {
    this.jobMetrics.recordFailed(SLICE_CONTENT_QUEUE, job);
  }

  async process(job: Job<SliceContentJobData>): Promise<void> {
    const { groupId, playlistId, organisationId } = job.data;

    this.logger.log(
      `Processing slice-content job ${job.id} for group ${groupId}, playlist ${playlistId}`,
    );

    // Set true once the group + playlist are confirmed to exist, so a failure
    // mid-slicing writes a `failed` status row with valid FKs. Pre-validation
    // throws (missing group/playlist) must NOT attempt a status write.
    let statusInitialized = false;
    try {
      // Load group with grid info
      const [group] = await this.db
        .select()
        .from(screenGroups)
        .where(and(eq(screenGroups.id, groupId), eq(screenGroups.organisationId, organisationId)))
        .limit(1);
      if (!group || !group.gridColumns || !group.gridRows) {
        throw new Error(`Group ${groupId} not found or missing grid configuration`);
      }
      const gridColumns = group.gridColumns;
      const gridRows = group.gridRows;

      // Load screens in the group
      const groupScreens = await this.db
        .select()
        .from(screens)
        .where(and(eq(screens.groupId, groupId), eq(screens.organisationId, organisationId)));

      // Load playlist with items and content
      const playlist = await this.db.query.playlists.findFirst({
        where: and(eq(playlists.id, playlistId), eq(playlists.organisationId, organisationId)),
        with: { items: { with: { content: true }, orderBy: asc(playlistItems.position) } },
      });

      if (groupScreens.length === 0 || !playlist?.items || playlist.items.length === 0) {
        this.logger.warn(`Nothing to slice for group ${groupId} / playlist ${playlistId}`);
        // Only persist status when the playlist still exists (valid FK); a deleted
        // playlist cascades its slice_jobs row away anyway.
        if (playlist) {
          await this.sliceStatus.markCompleted(organisationId, groupId, playlistId, 0);
          this.emitGroupRePull(groupId, organisationId, playlistId);
        }
        return;
      }

      const totalWork = playlist.items.length * groupScreens.length;
      let completed = 0;
      await this.sliceStatus.markProcessing(organisationId, groupId, playlistId, totalWork);
      statusInitialized = true;

      const reportProgress = async (): Promise<void> => {
        await job.updateProgress(Math.round((completed / totalWork) * 100));
        await this.sliceStatus.updateProgress(
          organisationId,
          groupId,
          playlistId,
          totalWork,
          completed,
        );
      };

      for (const item of playlist.items) {
        const content = item.content;
        if (!content) {
          this.logger.warn(`Content not found for playlist item ${item.id}, skipping`);
          completed += groupScreens.length;
          await reportProgress();
          continue;
        }

        // Determine source file path. Videos slice from the transcoded MP4 (it
        // decodes cleanly). Images slice from the ORIGINAL, NOT the transcoded
        // WebP: FFmpeg's native WebP decoder cannot read back a WebP we produced
        // (especially animated ones), so feeding it the transcoded `.webp` dies
        // with a decode error (`dec:webp ... Task finished with error code`).
        // Same reason thumbnails are generated from the original — see
        // transcoding.processor.ts.
        const sourcePath =
          content.type === ContentType.Video
            ? getTranscodedPath(this.mediaBasePath, organisationId, content.id, 'mp4')
            : getOriginalPath(
                this.mediaBasePath,
                organisationId,
                content.id,
                path.extname(content.originalFilename).replace('.', '') || 'bin',
              );

        // Compute source hash for idempotency
        const sourceHash = await this.computeFileHash(sourcePath);

        // Determine source resolution by probing with FFmpeg
        const resolution = await this.probeResolution(sourcePath);
        if (!resolution) {
          this.logger.warn(`Could not determine resolution for content ${content.id}, skipping`);
          completed += groupScreens.length;
          await reportProgress();
          continue;
        }

        for (const screen of groupScreens) {
          if (screen.gridRow === null || screen.gridColumn === null) {
            this.logger.warn(`Screen ${screen.id} has no grid position, skipping`);
            completed++;
            await reportProgress();
            continue;
          }

          // Check if rendition already exists with same source hash
          const [existing] = await this.db
            .select()
            .from(slicedRenditions)
            .where(
              and(
                eq(slicedRenditions.groupId, groupId),
                eq(slicedRenditions.screenId, screen.id),
                eq(slicedRenditions.contentItemId, content.id),
                eq(slicedRenditions.organisationId, organisationId),
              ),
            )
            .limit(1);

          if (existing && existing.sourceHash === sourceHash) {
            this.logger.log(
              `Rendition for content ${content.id} / screen ${screen.id} already up-to-date, skipping`,
            );
            completed++;
            await reportProgress();
            continue;
          }

          // Compute crop parameters
          const cropParams = computeCropParams(
            resolution.width,
            resolution.height,
            gridColumns,
            gridRows,
            screen.gridColumn,
            screen.gridRow,
          );

          // Determine output path and extension
          const outputExt = content.type === ContentType.Video ? 'mp4' : 'webp';
          // Inside {base}/{orgId} like every other media file: outside it, the
          // slices were invisible to the storage quota and survived deletion of
          // the organisation they belonged to.
          const outputPath = path.join(
            this.mediaBasePath,
            organisationId,
            'slices',
            groupId,
            screen.id,
            `${content.id}.${outputExt}`,
          );

          await fs.mkdir(path.dirname(outputPath), { recursive: true });

          // Run FFmpeg crop
          const cropFilter = buildCropFilter(cropParams);
          this.logger.log(
            `Slicing content ${content.id} for screen ${screen.id} (${completed + 1}/${totalWork})`,
          );
          await this.runFfmpegCrop(sourcePath, outputPath, cropFilter, content.type);

          // Save or update rendition in database
          if (existing) {
            await this.db
              .update(slicedRenditions)
              .set({ filePath: outputPath, sourceHash })
              .where(eq(slicedRenditions.id, existing.id));
          } else {
            await this.db.insert(slicedRenditions).values({
              organisationId,
              groupId,
              screenId: screen.id,
              contentItemId: content.id,
              filePath: outputPath,
              sourceHash,
            });
          }

          completed++;
          await reportProgress();
        }
      }

      this.logger.log(`Slice-content job ${job.id} completed: ${completed} slices processed`);
      await this.sliceStatus.markCompleted(organisationId, groupId, playlistId, totalWork);
      // Renditions are ready — tell split screens to re-pull and swap to the slices.
      this.emitGroupRePull(groupId, organisationId, playlistId);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`Slice-content job ${job.id} failed: ${message}`);
      if (statusInitialized) {
        await this.sliceStatus.markFailed(organisationId, groupId, playlistId, message);
      }
      throw error;
    }
  }

  /**
   * Signal that a split group's renditions changed so connected screens re-pull
   * state ({@link ScreenStateService.assembleState} rewrites URLs to the slices).
   */
  private emitGroupRePull(groupId: string, organisationId: string, playlistId: string): void {
    this.eventEmitter.emit(
      GROUP_SCHEDULE_CHANGED,
      new GroupScheduleChangedEvent(groupId, organisationId, playlistId),
    );
  }

  private runFfmpegCrop(
    inputPath: string,
    outputPath: string,
    cropFilter: string,
    contentType: ContentType,
  ): Promise<void> {
    const args =
      contentType === ContentType.Video
        ? [
            '-i',
            inputPath,
            '-vf',
            cropFilter,
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
            '-c:a',
            'copy',
            '-movflags',
            '+faststart',
            '-y',
            outputPath,
          ]
        : ['-i', inputPath, '-vf', cropFilter, '-y', outputPath];

    return this.runFfmpeg(args);
  }

  private runFfmpeg(args: string[]): Promise<void> {
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
          const lines = stderrOutput.trim().split('\n');
          const tail = lines.slice(-5).join('\n');
          reject(new Error(`FFmpeg exited with code ${code}: ${tail}`));
        }
      });
    });
  }

  private async probeResolution(
    filePath: string,
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const args = [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'csv=s=x:p=0',
        filePath,
      ];

      const ffprobePath = this.ffmpegPath.replace(/ffmpeg$/, 'ffprobe');
      const proc: ChildProcess = spawn(ffprobePath, args, {
        stdio: ['ignore', 'pipe', 'ignore'],
      });

      let stdout = '';

      proc.stdout!.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.on('error', () => {
        resolve(null);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          resolve(null);
          return;
        }
        const parts = stdout.trim().split('x');
        if (parts.length === 2) {
          const width = parseInt(parts[0], 10);
          const height = parseInt(parts[1], 10);
          if (!isNaN(width) && !isNaN(height)) {
            resolve({ width, height });
            return;
          }
        }
        resolve(null);
      });
    });
  }

  private async computeFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }
}
