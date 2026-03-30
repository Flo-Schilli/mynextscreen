import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { ContentService } from './content.service';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

function createMockFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('fake-content'),
    stream: null as unknown as Express.Multer.File['stream'],
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('ContentService', () => {
  let service: ContentService;
  let contentRepo: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;
  let queue: Record<string, jest.Mock>;

  beforeEach(async () => {
    contentRepo = {
      create: jest.fn((data) => ({ id: 'content-1', ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    storageService = {
      checkOriginalLimit: jest.fn().mockResolvedValue(undefined),
      checkTranscodedLimit: jest.fn().mockResolvedValue(undefined),
      addOriginalUsage: jest.fn().mockResolvedValue(undefined),
      subtractOriginalUsage: jest.fn().mockResolvedValue(undefined),
      addTranscodedUsage: jest.fn().mockResolvedValue(undefined),
      subtractTranscodedUsage: jest.fn().mockResolvedValue(undefined),
      getStorageInfo: jest.fn().mockResolvedValue({
        originalUsedBytes: 0,
        originalLimitBytes: 10485760,
        transcodedUsedBytes: 0,
        transcodedLimitBytes: 10485760,
      }),
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: getRepositoryToken(Content), useValue: contentRepo },
        { provide: StorageService, useValue: storageService },
        { provide: getQueueToken('transcoding'), useValue: queue },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              if (key === 'MEDIA_BASE_PATH') return '/tmp/test-media';
              if (key === 'MAX_FILE_SIZE_BYTES') return 104857600;
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  describe('upload', () => {
    it('should upload a file and create content record', async () => {
      const file = createMockFile();
      const dto = { title: 'Test Image' };

      await service.upload('org-1', file, dto);

      expect(contentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId: 'org-1',
          title: 'Test Image',
          type: ContentType.Image,
          originalFilename: 'test.png',
          originalMimeType: 'image/png',
          originalSizeBytes: 1024,
          transcodingStatus: TranscodingStatus.Pending,
        }),
      );
      expect(contentRepo.save).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalledWith(
        'transcode',
        expect.objectContaining({
          contentId: 'content-1',
          organisationId: 'org-1',
          type: ContentType.Image,
        }),
      );
    });

    it('should detect video type from mimetype', async () => {
      const file = createMockFile({
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
      });
      const dto = { title: 'Test Video' };

      await service.upload('org-1', file, dto);

      expect(contentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: ContentType.Video }),
      );
    });

    it('should update org storage counter on upload', async () => {
      const file = createMockFile({ size: 5000 });
      const dto = { title: 'Test' };

      await service.upload('org-1', file, dto);

      expect(storageService.addOriginalUsage).toHaveBeenCalledWith(
        'org-1',
        5000,
      );
    });

    it('should reject upload when storage limit would be exceeded', async () => {
      storageService.checkOriginalLimit.mockRejectedValue(
        new BadRequestException(
          'Upload would exceed organisation original storage limit',
        ),
      );

      const file = createMockFile({ size: 1000 });
      const dto = { title: 'Too big' };

      await expect(service.upload('org-1', file, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow upload when storage limit is 0 (unlimited)', async () => {
      storageService.checkOriginalLimit.mockResolvedValue(undefined);

      const file = createMockFile({ size: 50000000 }); // 50 MB, under the per-file limit
      const dto = { title: 'Big file' };

      await expect(service.upload('org-1', file, dto)).resolves.toBeDefined();
    });

    it('should reject unsupported MIME types', async () => {
      const file = createMockFile({ mimetype: 'application/pdf' });
      const dto = { title: 'PDF' };

      await expect(service.upload('org-1', file, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject files exceeding max file size', async () => {
      const file = createMockFile({ size: 200000000 }); // 200 MB > 100 MB limit
      const dto = { title: 'Huge' };

      await expect(service.upload('org-1', file, dto)).rejects.toThrow(
        PayloadTooLargeException,
      );
    });
  });

  describe('findAll', () => {
    it('should return contents for an organisation', async () => {
      const mockContents = [
        { id: '1', organisationId: 'org-1', tags: ['banner'] },
        { id: '2', organisationId: 'org-1', tags: ['logo'] },
      ];
      contentRepo.find.mockResolvedValue(mockContents);

      const results = await service.findAll('org-1');
      expect(results).toEqual(mockContents);
      expect(contentRepo.find).toHaveBeenCalledWith({
        where: { organisationId: 'org-1' },
      });
    });

    it('should filter by type', async () => {
      contentRepo.find.mockResolvedValue([]);

      await service.findAll('org-1', { type: ContentType.Image });
      expect(contentRepo.find).toHaveBeenCalledWith({
        where: { organisationId: 'org-1', type: ContentType.Image },
      });
    });

    it('should filter by tags', async () => {
      contentRepo.find.mockResolvedValue([
        { id: '1', tags: ['banner', 'welcome'] },
        { id: '2', tags: ['logo'] },
      ]);

      const result = await service.findAll('org-1', { tags: ['banner'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('findOne', () => {
    it('should return a content item', async () => {
      const mockContent = { id: 'c1', organisationId: 'org-1' };
      contentRepo.findOne.mockResolvedValue(mockContent);

      const result = await service.findOne('org-1', 'c1');
      expect(result).toEqual(mockContent);
    });

    it('should throw when content not found', async () => {
      contentRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('org-1', 'missing')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete content and update storage counters', async () => {
      const mockContent = {
        id: 'c1',
        organisationId: 'org-1',
        originalFilename: 'test.png',
        originalSizeBytes: 5000,
        transcodedSizeBytes: 3000,
        type: ContentType.Image,
      } as Content;
      contentRepo.findOne.mockResolvedValue(mockContent);

      await service.delete('org-1', 'c1');

      expect(contentRepo.remove).toHaveBeenCalledWith(mockContent);
      expect(storageService.subtractOriginalUsage).toHaveBeenCalledWith(
        'org-1',
        5000,
      );
      expect(storageService.subtractTranscodedUsage).toHaveBeenCalledWith(
        'org-1',
        3000,
      );
    });

    it('should handle delete when no transcoded file exists', async () => {
      const mockContent = {
        id: 'c1',
        organisationId: 'org-1',
        originalFilename: 'test.mp4',
        originalSizeBytes: 5000,
        transcodedSizeBytes: null,
        type: ContentType.Video,
      } as Content;
      contentRepo.findOne.mockResolvedValue(mockContent);

      await service.delete('org-1', 'c1');

      expect(contentRepo.remove).toHaveBeenCalled();
      expect(storageService.subtractOriginalUsage).toHaveBeenCalledWith(
        'org-1',
        5000,
      );
      expect(storageService.subtractTranscodedUsage).not.toHaveBeenCalled();
    });
  });

  describe('updateMetadata', () => {
    it('should update title and tags', async () => {
      const mockContent = {
        id: 'c1',
        organisationId: 'org-1',
        title: 'Old Title',
        tags: ['old'],
      } as Content;
      contentRepo.findOne.mockResolvedValue(mockContent);

      await service.updateMetadata('org-1', 'c1', {
        title: 'New Title',
        tags: ['new', 'updated'],
      });

      expect(contentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Title',
          tags: ['new', 'updated'],
        }),
      );
    });
  });

  describe('reUpload', () => {
    it('should replace file and reset transcoding status', async () => {
      const mockContent = {
        id: 'c1',
        organisationId: 'org-1',
        originalFilename: 'old.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 2000,
        transcodedSizeBytes: 1000,
        type: ContentType.Image,
        transcodingStatus: TranscodingStatus.Completed,
      } as Content;
      contentRepo.findOne.mockResolvedValue(mockContent);

      const file = createMockFile({
        originalname: 'new.png',
        mimetype: 'image/png',
        size: 3000,
      });

      await service.reUpload('org-1', 'c1', file);

      expect(contentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilename: 'new.png',
          originalSizeBytes: 3000,
          transcodingStatus: TranscodingStatus.Pending,
          transcodedSizeBytes: null,
          transcodingError: null,
        }),
      );
      // sizeDelta = 3000 - 2000 = 1000 (positive), so checkOriginalLimit + addOriginalUsage
      expect(storageService.checkOriginalLimit).toHaveBeenCalledWith(
        'org-1',
        1000,
      );
      expect(storageService.addOriginalUsage).toHaveBeenCalledWith(
        'org-1',
        1000,
      );
      expect(storageService.subtractTranscodedUsage).toHaveBeenCalledWith(
        'org-1',
        1000,
      );
      expect(queue.add).toHaveBeenCalledWith(
        'transcode',
        expect.objectContaining({ contentId: 'c1' }),
      );
    });

    it('should reject re-upload that would exceed storage limit', async () => {
      const mockContent = {
        id: 'c1',
        organisationId: 'org-1',
        originalFilename: 'old.png',
        originalSizeBytes: 1000,
        transcodedSizeBytes: null,
        type: ContentType.Image,
      } as Content;
      contentRepo.findOne.mockResolvedValue(mockContent);
      storageService.checkOriginalLimit.mockRejectedValue(
        new BadRequestException(
          'Upload would exceed organisation original storage limit',
        ),
      );

      const file = createMockFile({ size: 5000 }); // delta = 5000-1000 = 4000

      await expect(service.reUpload('org-1', 'c1', file)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
