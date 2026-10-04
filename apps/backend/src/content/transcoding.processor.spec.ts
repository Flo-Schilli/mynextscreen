import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Job } from 'bullmq';
import {
  TranscodingProcessor,
  TranscodeJobData,
  ThumbnailJobData,
  THUMBNAIL_JOB,
} from './transcoding.processor';
import { DRIZZLE } from '../db/database.constants';
import { contents, organisations, type Content, type Organisation } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import { JobMetricsService } from '../observability/job-metrics.service';
import { TRANSCODING_COMPLETED, TRANSCODING_FAILED } from './transcoding.event';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

// Mock child_process
const mockOn = jest.fn();
const mockStderrOn = jest.fn();
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

// Mock fs/promises (preserve real module for the Drizzle migrator in the harness)
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  mkdir: jest.fn().mockResolvedValue(undefined),
  // Transcoded files report 5000 bytes; the small thumbnail reports 100.
  stat: jest.fn((p: string) =>
    Promise.resolve({ size: String(p).includes('_thumb') ? 100 : 5000 }),
  ),
  unlink: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
}));

// Mock ffprobe-duration utility
const mockFfprobeDuration = jest.fn();
jest.mock('./ffprobe-duration.util', () => ({
  ffprobeDuration: (...args: unknown[]) => mockFfprobeDuration(...args),
}));

/**
 * Build a per-spawn fake child process with its own handler registry, so the
 * transcode spawn and the follow-up thumbnail spawn each resolve independently
 * (the production code spawns FFmpeg twice per video/image transcode).
 *
 * `shouldFail` lets a predicate fail only specific spawns (e.g. the thumbnail
 * pass, identified by its `-frames:v` arg) while letting the transcode succeed.
 */
function makeProc(args: string[], shouldFail: (args: string[]) => boolean) {
  const handlers: Record<string, (arg: unknown) => void> = {};
  const stderrHandlers: Record<string, (chunk: Buffer) => void> = {};
  const proc = {
    stderr: {
      on: (event: string, cb: (chunk: Buffer) => void) => {
        stderrHandlers[event] = cb;
        mockStderrOn(event, cb);
      },
    },
    on: (event: string, cb: (arg: unknown) => void) => {
      handlers[event] = cb;
      mockOn(event, cb);
      return proc;
    },
    stdin: null,
    stdout: null,
  };
  const fail = shouldFail(args);
  setTimeout(() => {
    if (fail) {
      stderrHandlers.data?.(Buffer.from('Error: something went wrong\n'));
      handlers.close?.(1);
      return;
    }
    stderrHandlers.data?.(
      Buffer.from('  Duration: 00:01:00.00, start: 0.000000, bitrate: 1234 kb/s\n'),
    );
    stderrHandlers.data?.(
      Buffer.from(
        'frame=  900 fps= 30 q=28.0 size=    1024kB time=00:00:30.00 bitrate= 279.6kbits/s\n',
      ),
    );
    handlers.close?.(0);
  }, 10);
  return proc;
}

const NEVER_FAIL = (): boolean => false;

function setupSpawnSuccess(): void {
  mockSpawn.mockImplementation((_path: string, args: string[]) => makeProc(args, NEVER_FAIL));
}

function setupSpawnFailure(exitCode: number): void {
  mockSpawn.mockImplementation((_path: string, args: string[]) =>
    makeProc(args, () => exitCode !== 0),
  );
}

/** Transcode succeeds but the thumbnail FFmpeg pass fails (best-effort path). */
function setupSpawnThumbnailFailure(): void {
  mockSpawn.mockImplementation((_path: string, args: string[]) =>
    makeProc(args, (a) => a.includes('-frames:v')),
  );
}

describe('TranscodingProcessor', () => {
  let processor: TranscodingProcessor;
  let db: DrizzleDB;
  let storageService: Record<string, jest.Mock>;
  let emit: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();
    mockFfprobeDuration.mockResolvedValue(60);

    storageService = {
      checkTranscodedLimit: jest.fn().mockResolvedValue(undefined),
      addTranscodedUsage: jest.fn().mockResolvedValue(undefined),
    };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscodingProcessor,
        { provide: DRIZZLE, useValue: db },
        { provide: StorageService, useValue: storageService },
        { provide: EventEmitter2, useValue: { emit } },
        {
          provide: JobMetricsService,
          useValue: { recordCompleted: jest.fn(), recordFailed: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              if (key === 'MEDIA_BASE_PATH') return '/tmp/test-media';
              if (key === 'FFMPEG_PATH') return 'ffmpeg';
              if (key === 'FFMPEG_VIDEO_CRF') return '18';
              if (key === 'FFMPEG_VIDEO_PRESET') return 'slow';
              if (key === 'FFMPEG_VIDEO_MAXRATE') return '8M';
              if (key === 'FFMPEG_VIDEO_BUFSIZE') return '16M';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    processor = module.get<TranscodingProcessor>(TranscodingProcessor);
  });

  async function seedOrg(): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    return org;
  }

  async function seedContent(
    organisationId: string,
    type: ContentType = ContentType.Video,
  ): Promise<Content> {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Seed',
        tags: [],
        type,
        originalFilename: type === ContentType.Video ? 'v.mp4' : 'i.png',
        originalMimeType: type === ContentType.Video ? 'video/mp4' : 'image/png',
        originalSizeBytes: 1000,
        transcodingStatus: TranscodingStatus.Pending,
      })
      .returning();
    return content;
  }

  function createJob(
    contentId: string,
    organisationId: string,
    overrides: Partial<TranscodeJobData> = {},
  ): Job<TranscodeJobData> {
    return {
      id: 'job-1',
      data: {
        contentId,
        organisationId,
        originalPath: `/tmp/media/${organisationId}/originals/${contentId}.mp4`,
        mimeType: 'video/mp4',
        type: ContentType.Video,
        ...overrides,
      },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<TranscodeJobData>;
  }

  describe('process — video transcoding', () => {
    it('should set status to completed with size and duration on success', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();

      await processor.process(createJob(content.id, org.id));

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.transcodingStatus).toBe(TranscodingStatus.Completed);
      expect(Number(row.transcodedSizeBytes)).toBe(5000);
      expect(Number(row.thumbnailSizeBytes)).toBe(100);
      expect(row.durationSeconds).toBe(60);
      expect(row.transcodingError).toBeNull();
    });

    it('should update org storage counter on success (transcoded + thumbnail)', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();

      await processor.process(createJob(content.id, org.id));

      // 5000 (transcoded) + 100 (thumbnail) = 5100
      expect(storageService.checkTranscodedLimit).toHaveBeenCalledWith(org.id, 5100);
      expect(storageService.addTranscodedUsage).toHaveBeenCalledWith(org.id, 5100);
    });

    it('should generate a thumbnail with the thumbnail filter for videos', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();

      await processor.process(createJob(content.id, org.id));

      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-vf', expect.stringContaining('thumbnail'), '-frames:v', '1']),
        expect.any(Object),
      );
    });

    it('should still complete (thumbnail null) when thumbnail generation fails', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnThumbnailFailure();

      await processor.process(createJob(content.id, org.id));

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.transcodingStatus).toBe(TranscodingStatus.Completed);
      expect(Number(row.transcodedSizeBytes)).toBe(5000);
      expect(row.thumbnailSizeBytes).toBeNull();
      // Only the transcoded bytes are billed when no thumbnail was produced.
      expect(storageService.addTranscodedUsage).toHaveBeenCalledWith(org.id, 5000);
    });

    it('should emit TRANSCODING_COMPLETED event on success', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();

      await processor.process(createJob(content.id, org.id));

      expect(emit).toHaveBeenCalledWith(
        TRANSCODING_COMPLETED,
        expect.objectContaining({
          contentId: content.id,
          organisationId: org.id,
          transcodedSizeBytes: 5000,
        }),
      );
    });

    it('should report progress via job.updateProgress', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();
      const job = createJob(content.id, org.id);

      await processor.process(job);

      expect(job.updateProgress).toHaveBeenCalledWith(50);
    });

    it('should spawn ffmpeg with correct video args', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();
      const job = createJob(content.id, org.id);

      await processor.process(job);

      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining([
          '-i',
          job.data.originalPath,
          '-c:v',
          'libx264',
          '-crf',
          '18',
          '-preset',
          'slow',
          '-maxrate',
          '8M',
          '-bufsize',
          '16M',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          '-y',
        ]),
        expect.any(Object),
      );
    });

    it('should call ffprobe on the transcoded file for videos', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();

      await processor.process(createJob(content.id, org.id));

      expect(mockFfprobeDuration).toHaveBeenCalledWith(
        expect.stringContaining(`${content.id}.mp4`),
        'ffprobe',
      );
    });

    it('should save durationSeconds as null when ffprobe fails for video', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();
      mockFfprobeDuration.mockRejectedValue(new Error('ffprobe failed'));

      await processor.process(createJob(content.id, org.id));

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.transcodingStatus).toBe(TranscodingStatus.Completed);
      expect(Number(row.transcodedSizeBytes)).toBe(5000);
      expect(row.durationSeconds).toBeNull();
    });
  });

  describe('process — image transcoding', () => {
    it('should spawn ffmpeg for image (webp output)', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, ContentType.Image);
      setupSpawnSuccess();
      const originalPath = `/tmp/media/${org.id}/originals/${content.id}.png`;

      await processor.process(
        createJob(content.id, org.id, {
          type: ContentType.Image,
          mimeType: 'image/png',
          originalPath,
        }),
      );

      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining(['-i', originalPath, '-y']),
        expect.any(Object),
      );
      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.transcodingStatus).toBe(TranscodingStatus.Completed);
      expect(row.durationSeconds).toBeNull();
    });

    it('should not call ffprobe for images', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, ContentType.Image);
      setupSpawnSuccess();

      await processor.process(
        createJob(content.id, org.id, {
          type: ContentType.Image,
          mimeType: 'image/png',
          originalPath: `/tmp/media/${org.id}/originals/${content.id}.png`,
        }),
      );

      expect(mockFfprobeDuration).not.toHaveBeenCalled();
    });
  });

  describe('process — failure handling', () => {
    it('should set status to failed and emit event on FFmpeg error', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnFailure(1);

      await expect(processor.process(createJob(content.id, org.id))).rejects.toThrow(
        'FFmpeg exited with code 1',
      );

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.transcodingStatus).toBe(TranscodingStatus.Failed);
      expect(row.transcodingError).toContain('FFmpeg exited with code 1');

      expect(emit).toHaveBeenCalledWith(
        TRANSCODING_FAILED,
        expect.objectContaining({
          contentId: content.id,
          organisationId: org.id,
          error: expect.stringContaining('FFmpeg exited with code 1'),
        }),
      );
    });

    it('should not update org storage on failure', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnFailure(1);

      await expect(processor.process(createJob(content.id, org.id))).rejects.toThrow();

      expect(storageService.addTranscodedUsage).not.toHaveBeenCalled();
    });
  });

  describe('process — transcoded storage limit exceeded', () => {
    it('should mark as failed and not save transcoded file when limit exceeded', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);
      setupSpawnSuccess();
      storageService.checkTranscodedLimit.mockRejectedValue(
        new BadRequestException(
          'Transcoded file would exceed organisation transcoded storage limit',
        ),
      );

      await processor.process(createJob(content.id, org.id));

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.transcodingStatus).toBe(TranscodingStatus.Failed);
      expect(row.transcodingError).toBe(
        'Transcoded file would exceed organisation transcoded storage limit',
      );

      expect(emit).toHaveBeenCalledWith(
        TRANSCODING_FAILED,
        expect.objectContaining({
          contentId: content.id,
          organisationId: org.id,
          error: 'Transcoded file would exceed organisation transcoded storage limit',
        }),
      );

      expect(storageService.addTranscodedUsage).not.toHaveBeenCalled();
    });
  });

  describe('process — thumbnail backfill job', () => {
    function createThumbnailJob(contentId: string, organisationId: string): Job<ThumbnailJobData> {
      return {
        id: 'thumb-job-1',
        name: THUMBNAIL_JOB,
        data: { contentId, organisationId },
        updateProgress: jest.fn().mockResolvedValue(undefined),
      } as unknown as Job<ThumbnailJobData>;
    }

    async function seedCompleted(
      organisationId: string,
      overrides: Partial<typeof contents.$inferInsert> = {},
    ): Promise<Content> {
      const content = await seedContent(organisationId);
      const [row] = await db
        .update(contents)
        .set({
          transcodingStatus: TranscodingStatus.Completed,
          transcodedSizeBytes: 5000,
          thumbnailSizeBytes: null,
          ...overrides,
        })
        .where(eq(contents.id, content.id))
        .returning();
      return row;
    }

    it('generates and records a thumbnail for completed content without one', async () => {
      const org = await seedOrg();
      const content = await seedCompleted(org.id);
      setupSpawnSuccess();

      await processor.process(createThumbnailJob(content.id, org.id));

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(Number(row.thumbnailSizeBytes)).toBe(100);
      expect(storageService.addTranscodedUsage).toHaveBeenCalledWith(org.id, 100);
    });

    it('is a no-op when the content already has a thumbnail', async () => {
      const org = await seedOrg();
      const content = await seedCompleted(org.id, { thumbnailSizeBytes: 77 });
      setupSpawnSuccess();

      await processor.process(createThumbnailJob(content.id, org.id));

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(storageService.addTranscodedUsage).not.toHaveBeenCalled();
      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(Number(row.thumbnailSizeBytes)).toBe(77);
    });

    it('is a no-op when the content is not yet completed', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id); // status pending
      setupSpawnSuccess();

      await processor.process(createThumbnailJob(content.id, org.id));

      expect(mockSpawn).not.toHaveBeenCalled();
      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.thumbnailSizeBytes).toBeNull();
    });

    it('is a no-op when the transcoded file is missing', async () => {
      const org = await seedOrg();
      const content = await seedCompleted(org.id);
      setupSpawnSuccess();
      const fsPromises = jest.requireMock('fs/promises') as { access: jest.Mock };
      fsPromises.access.mockRejectedValueOnce(new Error('ENOENT'));

      await processor.process(createThumbnailJob(content.id, org.id));

      expect(mockSpawn).not.toHaveBeenCalled();
      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.thumbnailSizeBytes).toBeNull();
    });

    it('skips recording when the thumbnail would exceed the storage limit', async () => {
      const org = await seedOrg();
      const content = await seedCompleted(org.id);
      setupSpawnSuccess();
      storageService.checkTranscodedLimit.mockRejectedValueOnce(new BadRequestException('limit'));

      await processor.process(createThumbnailJob(content.id, org.id));

      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.thumbnailSizeBytes).toBeNull();
      expect(storageService.addTranscodedUsage).not.toHaveBeenCalled();
    });
  });
});
