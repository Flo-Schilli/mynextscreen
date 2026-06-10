import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { getTranscodedPath } from '../content/content-storage.util';

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
  ) {
    super();
    this.mediaBasePath = this.configService.get<string>('MEDIA_BASE_PATH', './media');
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.videoCrf = this.configService.get<string>('FFMPEG_VIDEO_CRF', '18');
    this.videoPreset = this.configService.get<string>('FFMPEG_VIDEO_PRESET', 'slow');
    this.videoMaxRate = this.configService.get<string>('FFMPEG_VIDEO_MAXRATE', '8M');
    this.videoBufSize = this.configService.get<string>('FFMPEG_VIDEO_BUFSIZE', '16M');
  }

  async process(job: Job<SliceContentJobData>): Promise<void> {
    const { groupId, playlistId, organisationId } = job.data;

    this.logger.log(
      `Processing slice-content job ${job.id} for group ${groupId}, playlist ${playlistId}`,
    );

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
    if (groupScreens.length === 0) {
      this.logger.warn(`No screens in group ${groupId}, skipping slicing`);
      return;
    }

    // Load playlist with items and content
    const playlist = await this.db.query.playlists.findFirst({
      where: and(eq(playlists.id, playlistId), eq(playlists.organisationId, organisationId)),
      with: { items: { with: { content: true }, orderBy: asc(playlistItems.position) } },
    });
    if (!playlist || !playlist.items || playlist.items.length === 0) {
      this.logger.warn(`Playlist ${playlistId} not found or empty, skipping slicing`);
      return;
    }

    const totalWork = playlist.items.length * groupScreens.length;
    let completed = 0;

    for (const item of playlist.items) {
      const content = item.content;
      if (!content) {
        this.logger.warn(`Content not found for playlist item ${item.id}, skipping`);
        completed += groupScreens.length;
        await job.updateProgress(Math.round((completed / totalWork) * 100));
        continue;
      }

      // Determine source file path (use transcoded version)
      const sourceExt = content.type === ContentType.Video ? 'mp4' : 'webp';
      const sourcePath = getTranscodedPath(
        this.mediaBasePath,
        organisationId,
        content.id,
        sourceExt,
      );

      // Compute source hash for idempotency
      const sourceHash = await this.computeFileHash(sourcePath);

      // Determine source resolution by probing with FFmpeg
      const resolution = await this.probeResolution(sourcePath);
      if (!resolution) {
        this.logger.warn(`Could not determine resolution for content ${content.id}, skipping`);
        completed += groupScreens.length;
        await job.updateProgress(Math.round((completed / totalWork) * 100));
        continue;
      }

      for (const screen of groupScreens) {
        if (screen.gridRow === null || screen.gridColumn === null) {
          this.logger.warn(`Screen ${screen.id} has no grid position, skipping`);
          completed++;
          await job.updateProgress(Math.round((completed / totalWork) * 100));
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
          await job.updateProgress(Math.round((completed / totalWork) * 100));
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
        const outputPath = path.join(
          this.mediaBasePath,
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
        await job.updateProgress(Math.round((completed / totalWork) * 100));
      }
    }

    this.logger.log(`Slice-content job ${job.id} completed: ${completed} slices processed`);
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
