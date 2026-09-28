import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ContentService } from './content.service';
import { DRIZZLE } from '../db/database.constants';
import { contents, organisations, type Content, type Organisation } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import { CONTENT_DURATION_RESOLVED } from './content.event';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockFfprobeDuration = jest.fn();
jest.mock('./ffprobe-duration.util', () => ({
  ffprobeDuration: (...args: unknown[]) => mockFfprobeDuration(...args),
}));

/** Real magic bytes — uploads are typed from the content, not from the header. */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const MP4_BYTES = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypisom', 'latin1'),
  Buffer.alloc(8),
]);

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: PNG_BYTES,
    stream: null as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('ContentService', () => {
  let service: ContentService;
  let db: DrizzleDB;
  let storageService: Record<string, jest.Mock>;
  let queue: { add: jest.Mock };
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

    storageService = {
      checkOriginalLimit: jest.fn().mockResolvedValue(undefined),
      reserveOriginalUsage: jest.fn().mockResolvedValue(undefined),
      checkTranscodedLimit: jest.fn().mockResolvedValue(undefined),
      addOriginalUsage: jest.fn().mockResolvedValue(undefined),
      subtractOriginalUsage: jest.fn().mockResolvedValue(undefined),
      addTranscodedUsage: jest.fn().mockResolvedValue(undefined),
      subtractTranscodedUsage: jest.fn().mockResolvedValue(undefined),
    };

    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: DRIZZLE, useValue: db },
        { provide: StorageService, useValue: storageService },
        { provide: getQueueToken('transcoding'), useValue: queue },
        { provide: EventEmitter2, useValue: { emit } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              if (key === 'MEDIA_BASE_PATH') return '/tmp/test-media';
              if (key === 'MAX_FILE_SIZE_BYTES') return 104857600;
              if (key === 'FFMPEG_PATH') return 'ffmpeg';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  async function seedContent(
    organisationId: string,
    overrides: Partial<Content> = {},
  ): Promise<Content> {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Seed',
        tags: [],
        type: ContentType.Image,
        originalFilename: 'seed.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 1024,
        transcodingStatus: TranscodingStatus.Pending,
        ...overrides,
      })
      .returning();
    return content;
  }

  describe('upload', () => {
    it('should upload a file and create a content record', async () => {
      const org = await seedOrg();
      const file = createMockFile();

      const result = await service.upload(org.id, file, { title: 'Test Image' });

      expect(result.id).toBeDefined();
      const [row] = await db.select().from(contents).where(eq(contents.id, result.id));
      expect(row.organisationId).toBe(org.id);
      expect(row.title).toBe('Test Image');
      expect(row.type).toBe(ContentType.Image);
      expect(row.originalFilename).toBe('test.png');
      expect(row.originalMimeType).toBe('image/png');
      expect(Number(row.originalSizeBytes)).toBe(1024);
      expect(row.transcodingStatus).toBe(TranscodingStatus.Pending);
      expect(queue.add).toHaveBeenCalledWith(
        'transcode',
        expect.objectContaining({
          contentId: result.id,
          organisationId: org.id,
          type: ContentType.Image,
        }),
      );
    });

    it('should detect video type from the file content', async () => {
      const org = await seedOrg();
      const file = createMockFile({
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
        buffer: MP4_BYTES,
      });

      const result = await service.upload(org.id, file, { title: 'Test Video' });

      const [row] = await db.select().from(contents).where(eq(contents.id, result.id));
      expect(row.type).toBe(ContentType.Video);
    });

    it('should update org storage counter on upload', async () => {
      const org = await seedOrg();
      const file = createMockFile({ size: 5000 });

      await service.upload(org.id, file, { title: 'Test' });

      expect(storageService.reserveOriginalUsage).toHaveBeenCalledWith(org.id, 5000);
    });

    it('should reject upload when storage limit would be exceeded', async () => {
      const org = await seedOrg();
      storageService.reserveOriginalUsage.mockRejectedValue(
        new BadRequestException('Upload would exceed organisation original storage limit'),
      );
      const file = createMockFile({ size: 1000 });

      await expect(service.upload(org.id, file, { title: 'Too big' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow upload when storage limit is 0 (unlimited)', async () => {
      const org = await seedOrg();
      const file = createMockFile({ size: 50000000 }); // 50 MB, under the per-file limit

      await expect(service.upload(org.id, file, { title: 'Big file' })).resolves.toBeDefined();
    });

    it('should reject unsupported file content', async () => {
      const org = await seedOrg();
      const file = createMockFile({ mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.7') });

      await expect(service.upload(org.id, file, { title: 'PDF' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an SVG even though it claims to be an image', async () => {
      const org = await seedOrg();
      const file = createMockFile({
        originalname: 'logo.svg',
        mimetype: 'image/svg+xml',
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
      });

      await expect(service.upload(org.id, file, { title: 'Logo' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should store the detected type, not the claimed one', async () => {
      const org = await seedOrg();
      // Video bytes uploaded with an image header — the bytes must win, or the
      // stored MIME type becomes whatever the client felt like sending.
      const file = createMockFile({
        originalname: 'sneaky.png',
        mimetype: 'image/png',
        buffer: MP4_BYTES,
      });

      const result = await service.upload(org.id, file, { title: 'Sneaky' });

      const [row] = await db.select().from(contents).where(eq(contents.id, result.id));
      expect(row.originalMimeType).toBe('video/mp4');
      expect(row.type).toBe(ContentType.Video);
    });

    it('should reject files exceeding max file size', async () => {
      const org = await seedOrg();
      const file = createMockFile({ size: 200000000 }); // 200 MB > 100 MB limit

      await expect(service.upload(org.id, file, { title: 'Huge' })).rejects.toThrow(
        PayloadTooLargeException,
      );
    });
  });

  describe('findAll', () => {
    it('should return contents for an organisation', async () => {
      const org = await seedOrg();
      await seedContent(org.id, { title: 'A', tags: ['banner'] });
      await seedContent(org.id, { title: 'B', tags: ['logo'] });

      const results = await service.findAll(org.id);
      expect(results).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const org = await seedOrg();
      await seedContent(org.id, { type: ContentType.Image });
      await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
      });

      const results = await service.findAll(org.id, { type: ContentType.Image });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ContentType.Image);
    });

    it('should filter by tags', async () => {
      const org = await seedOrg();
      const tagged = await seedContent(org.id, { tags: ['banner', 'welcome'] });
      await seedContent(org.id, { tags: ['logo'] });

      const result = await service.findAll(org.id, { tags: ['banner'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(tagged.id);
    });
  });

  describe('findOne', () => {
    it('should return a content item', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id);

      const result = await service.findOne(org.id, content.id);
      expect(result.id).toBe(content.id);
    });

    it('should throw when content not found', async () => {
      const org = await seedOrg();
      await expect(service.findOne(org.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete content and update storage counters', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        originalSizeBytes: 5000,
        transcodedSizeBytes: 3000,
        type: ContentType.Image,
      });

      await service.delete(org.id, content.id);

      const rows = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(rows).toHaveLength(0);
      expect(storageService.subtractOriginalUsage).toHaveBeenCalledWith(org.id, 5000);
      expect(storageService.subtractTranscodedUsage).toHaveBeenCalledWith(org.id, 3000);
    });

    it('should handle delete when no transcoded file exists', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        originalFilename: 'test.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 5000,
        transcodedSizeBytes: null,
        type: ContentType.Video,
      });

      await service.delete(org.id, content.id);

      const rows = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(rows).toHaveLength(0);
      expect(storageService.subtractOriginalUsage).toHaveBeenCalledWith(org.id, 5000);
      expect(storageService.subtractTranscodedUsage).not.toHaveBeenCalled();
    });
  });

  describe('updateMetadata', () => {
    it('should update title and tags', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, { title: 'Old Title', tags: ['old'] });

      const result = await service.updateMetadata(org.id, content.id, {
        title: 'New Title',
        tags: ['new', 'updated'],
      });

      expect(result.title).toBe('New Title');
      expect(result.tags).toEqual(['new', 'updated']);
      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.title).toBe('New Title');
      expect(row.tags).toEqual(['new', 'updated']);
    });
  });

  describe('reUpload', () => {
    it('should replace file and reset transcoding status', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        originalFilename: 'old.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 2000,
        transcodedSizeBytes: 1000,
        type: ContentType.Image,
        transcodingStatus: TranscodingStatus.Completed,
      });

      const file = createMockFile({ originalname: 'new.png', mimetype: 'image/png', size: 3000 });

      const result = await service.reUpload(org.id, content.id, file);

      expect(result.originalFilename).toBe('new.png');
      expect(Number(result.originalSizeBytes)).toBe(3000);
      expect(result.transcodingStatus).toBe(TranscodingStatus.Pending);
      expect(result.transcodedSizeBytes).toBeNull();
      expect(result.transcodingError).toBeNull();
      // sizeDelta = 3000 - 2000 = 1000 (positive) — reserved, not booked twice
      expect(storageService.reserveOriginalUsage).toHaveBeenCalledWith(org.id, 1000);
      expect(storageService.addOriginalUsage).not.toHaveBeenCalled();
      expect(storageService.subtractTranscodedUsage).toHaveBeenCalledWith(org.id, 1000);
      expect(queue.add).toHaveBeenCalledWith(
        'transcode',
        expect.objectContaining({ contentId: content.id }),
      );
    });

    it('should reject re-upload that would exceed storage limit', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        originalFilename: 'old.png',
        originalSizeBytes: 1000,
        transcodedSizeBytes: null,
        type: ContentType.Image,
      });
      storageService.reserveOriginalUsage.mockRejectedValue(
        new BadRequestException('Upload would exceed organisation original storage limit'),
      );

      const file = createMockFile({ size: 5000 }); // delta = 5000-1000 = 4000

      await expect(service.reUpload(org.id, content.id, file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('ensureDuration', () => {
    it('should return null for image content', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Image,
        durationSeconds: null,
      });

      const result = await service.ensureDuration(content);
      expect(result).toBeNull();
      expect(mockFfprobeDuration).not.toHaveBeenCalled();
    });

    it('should return existing duration if already set', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        durationSeconds: 58,
      });

      const result = await service.ensureDuration(content);
      expect(result).toBe(58);
      expect(mockFfprobeDuration).not.toHaveBeenCalled();
    });

    it('should run ffprobe and save duration for video without duration', async () => {
      mockFfprobeDuration.mockResolvedValue(42);
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        durationSeconds: null,
      });

      const result = await service.ensureDuration(content);

      expect(result).toBe(42);
      expect(mockFfprobeDuration).toHaveBeenCalledWith(
        expect.stringContaining(`${content.id}.mp4`),
        'ffprobe',
      );
      const [row] = await db.select().from(contents).where(eq(contents.id, content.id));
      expect(row.durationSeconds).toBe(42);
    });

    it('should emit content.duration_resolved event on successful backfill', async () => {
      mockFfprobeDuration.mockResolvedValue(42);
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        durationSeconds: null,
      });

      await service.ensureDuration(content);

      expect(emit).toHaveBeenCalledWith(
        CONTENT_DURATION_RESOLVED,
        expect.objectContaining({ contentId: content.id, durationSeconds: 42 }),
      );
    });

    it('should not emit event when duration already set', async () => {
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        durationSeconds: 58,
      });

      await service.ensureDuration(content);

      expect(emit).not.toHaveBeenCalledWith(CONTENT_DURATION_RESOLVED, expect.anything());
    });

    it('should not emit event when ffprobe fails', async () => {
      mockFfprobeDuration.mockRejectedValue(new Error('ffprobe not found'));
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        durationSeconds: null,
      });

      await service.ensureDuration(content);

      expect(emit).not.toHaveBeenCalledWith(CONTENT_DURATION_RESOLVED, expect.anything());
    });

    it('should return null when ffprobe fails', async () => {
      mockFfprobeDuration.mockRejectedValue(new Error('ffprobe not found'));
      const org = await seedOrg();
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        durationSeconds: null,
      });

      const result = await service.ensureDuration(content);

      expect(result).toBeNull();
    });
  });
});
