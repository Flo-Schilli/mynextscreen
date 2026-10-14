import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ContentService } from './content.service';
import { TranscodingProcessor, type TranscodeJobData } from './transcoding.processor';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { getThumbnailPath, getTranscodedPath } from './content-storage.util';
import { MediaService } from '../media/media.service';
import { StorageService } from '../organisation/storage.service';
import { JobMetricsService } from '../observability/job-metrics.service';
import { DRIZZLE } from '../db/database.constants';
import { contents, organisations, type Content } from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';

/**
 * Re-upload end to end on a real filesystem: ContentService stores the new
 * original, TranscodingProcessor renders it and MediaService answers the
 * screens' `/api/media` lookups in between. Only FFmpeg is faked; the
 * transcode pass stays open until the test finishes it.
 */

interface PendingFfmpeg {
  outputPath: string;
  finish: (exitCode: number) => Promise<void>;
}

const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));
jest.mock('./ffprobe-duration.util', () => ({
  ffprobeDuration: jest.fn().mockResolvedValue(12),
}));

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const OLD_RENDITION = 'old rendition';
const NEW_RENDITION = 'new rendition, fully written';

function fakeProcess(): EventEmitter & { stderr: EventEmitter } {
  return Object.assign(new EventEmitter(), { stderr: new EventEmitter() });
}

describe('Re-upload while screens keep loading the item', () => {
  let db: DrizzleDB;
  let mediaBase: string;
  let contentService: ContentService;
  let processor: TranscodingProcessor;
  let mediaService: MediaService;
  let queue: { add: jest.Mock };
  let pending: PendingFfmpeg[];

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    mediaBase = await fs.mkdtemp(path.join(os.tmpdir(), 'mns-replace-'));
    pending = [];
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    // The transcode pass writes half a file and waits; the thumbnail pass finishes at once.
    mockSpawn.mockImplementation((_bin: string, args: string[]) => {
      const proc = fakeProcess();
      const outputPath = args.at(-1)!;
      if (args.includes('-frames:v')) {
        void fs.writeFile(outputPath, 'thumb').then(() => proc.emit('close', 0));
        return proc;
      }
      void fs.writeFile(outputPath, NEW_RENDITION.slice(0, 5));
      pending.push({
        outputPath,
        finish: async (exitCode) => {
          if (exitCode === 0) await fs.writeFile(outputPath, NEW_RENDITION);
          proc.emit('close', exitCode);
        },
      });
      return proc;
    });

    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'MEDIA_BASE_PATH' ? mediaBase : fallback,
      ),
    };
    const storage = {
      reserveOriginalUsage: jest.fn(),
      subtractOriginalUsage: jest.fn(),
      checkTranscodedLimit: jest.fn(),
      addTranscodedUsage: jest.fn(),
      subtractTranscodedUsage: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        TranscodingProcessor,
        MediaService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: config },
        { provide: StorageService, useValue: storage },
        { provide: getQueueToken('transcoding'), useValue: queue },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: JobMetricsService, useValue: {} },
      ],
    }).compile();

    contentService = module.get(ContentService);
    processor = module.get(TranscodingProcessor);
    mediaService = module.get(MediaService);
  });

  afterEach(async () => {
    await fs.rm(mediaBase, { recursive: true, force: true });
  });

  /** An image that was transcoded before: its WebP and thumbnail are live. */
  async function seedLiveImage(): Promise<Content> {
    const [org] = await db
      .insert(organisations)
      .values({ name: 'Venue', timeZone: 'UTC' })
      .returning();
    const [content] = await db
      .insert(contents)
      .values({
        organisationId: org.id,
        title: 'Poster',
        type: ContentType.Image,
        originalFilename: 'poster.png',
        originalMimeType: 'image/png',
        originalSizeBytes: PNG_BYTES.length,
        transcodedSizeBytes: OLD_RENDITION.length,
        transcodingStatus: TranscodingStatus.Completed,
      })
      .returning();
    const livePath = getTranscodedPath(mediaBase, org.id, content.id, 'webp');
    await fs.mkdir(path.dirname(livePath), { recursive: true });
    await fs.writeFile(livePath, OLD_RENDITION);
    await fs.writeFile(getThumbnailPath(mediaBase, org.id, content.id), 'old thumb');
    return content;
  }

  /**
   * Re-uploads and starts the queued transcode job; FFmpeg stays open. The
   * running job comes back wrapped, an async function would otherwise await it.
   */
  async function reUploadAndStartTranscode(content: Content): Promise<{ run: Promise<void> }> {
    await contentService.reUpload(content.organisationId, content.id, {
      fieldname: 'file',
      originalname: 'poster-v2.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: PNG_BYTES.length,
      buffer: PNG_BYTES,
    } as Express.Multer.File);
    const [[, data]] = queue.add.mock.calls as [[string, TranscodeJobData]];
    const run = processor.process({
      id: '7',
      name: 'transcode',
      data,
      updateProgress: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<TranscodeJobData>);
    await waitFor(() => pending.length === 1);
    return { run };
  }

  async function served(content: Content): Promise<string> {
    const { filePath } = await mediaService.getTranscodedFile(content.organisationId, content.id);
    return fs.readFile(filePath, 'utf8');
  }

  async function transcodedDir(content: Content): Promise<string[]> {
    return fs.readdir(path.join(mediaBase, content.organisationId, 'transcoded'));
  }

  it('serves the previous file during the transcode and the new one after it', async () => {
    const content = await seedLiveImage();
    const { run } = await reUploadAndStartTranscode(content);

    expect(await served(content)).toBe(OLD_RENDITION);
    expect(path.basename(pending[0].outputPath)).toBe(`${content.id}.next-7.webp`);

    await pending[0].finish(0);
    await run;

    expect(await served(content)).toBe(NEW_RENDITION);
    expect((await transcodedDir(content)).sort()).toEqual(
      [`${content.id}.webp`, `${content.id}_thumb.webp`].sort(),
    );
    const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
    expect(row.transcodingStatus).toBe(TranscodingStatus.Completed);
    expect(Number(row.transcodedSizeBytes)).toBe(NEW_RENDITION.length);
  });

  it('keeps serving the previous file when the transcode fails', async () => {
    const content = await seedLiveImage();
    const { run } = await reUploadAndStartTranscode(content);

    await pending[0].finish(1);
    await expect(run).rejects.toThrow('FFmpeg exited with code 1');

    expect(await served(content)).toBe(OLD_RENDITION);
    expect((await transcodedDir(content)).sort()).toEqual(
      [`${content.id}.webp`, `${content.id}_thumb.webp`].sort(),
    );
    const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
    expect(row.transcodingStatus).toBe(TranscodingStatus.Failed);
    expect(Number(row.transcodedSizeBytes)).toBe(OLD_RENDITION.length);
  });

  it('removes staged files when the content is deleted mid-transcode', async () => {
    const content = await seedLiveImage();
    const { run } = await reUploadAndStartTranscode(content);

    await contentService.delete(content.organisationId, content.id);
    await pending[0].finish(0);
    await run;

    expect(await transcodedDir(content)).toEqual([]);
  });
});

async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
