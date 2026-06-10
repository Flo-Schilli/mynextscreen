import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { MediaService } from './media.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screenGroups, screens, contents, slicedRenditions } from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('MediaService', () => {
  let service: MediaService;
  let db: DrizzleDB;
  let readdirSpy: jest.SpyInstance;
  let accessSpy: jest.SpyInstance;

  const contentId = '660e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();

    readdirSpy = jest
      .spyOn(fs.promises, 'readdir')
      .mockResolvedValue([] as unknown as Awaited<ReturnType<typeof fs.promises.readdir>>);
    accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('/data/media') },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    readdirSpy.mockRestore();
    accessSpy.mockRestore();
  });

  /** Seed an org/group/screen/content chain so a sliced rendition can be inserted. */
  async function seedRendition(filePath: string): Promise<{
    orgId: string;
    groupId: string;
    screenId: string;
    contentItemId: string;
  }> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    const [group] = await db
      .insert(screenGroups)
      .values({ organisationId: org.id, name: 'G', gridColumns: 2, gridRows: 2 })
      .returning();
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: org.id,
        name: 'S',
        resolution: '1920x1080',
        location: 'L',
        apiKeyHash: 'h',
        groupId: group.id,
      })
      .returning();
    const [content] = await db
      .insert(contents)
      .values({
        organisationId: org.id,
        title: 'C',
        tags: [],
        type: ContentType.Video,
        originalFilename: 'v.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 1,
        transcodingStatus: TranscodingStatus.Completed,
      })
      .returning();
    await db.insert(slicedRenditions).values({
      organisationId: org.id,
      groupId: group.id,
      screenId: screen.id,
      contentItemId: content.id,
      filePath,
      sourceHash: 'hash',
    });
    return { orgId: org.id, groupId: group.id, screenId: screen.id, contentItemId: content.id };
  }

  describe('getTranscodedFile', () => {
    const orgId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return file path and content type for an MP4 file', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.mp4`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(`/data/media/${orgId}/transcoded/${contentId}.mp4`);
      expect(result.contentType).toBe('video/mp4');
    });

    it('should return file path and content type for a WebP image', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.webp`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(`/data/media/${orgId}/transcoded/${contentId}.webp`);
      expect(result.contentType).toBe('image/webp');
    });

    it('should return file path and content type for a JPEG image', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.jpg`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(`/data/media/${orgId}/transcoded/${contentId}.jpg`);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should throw NotFoundException when directory does not exist', async () => {
      readdirSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getTranscodedFile(orgId, contentId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file is not found', async () => {
      readdirSpy.mockResolvedValue(['other-file.mp4']);

      await expect(service.getTranscodedFile(orgId, contentId)).rejects.toThrow(NotFoundException);
    });

    it('should return application/octet-stream for unknown extensions', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.mkv`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.contentType).toBe('application/octet-stream');
    });
  });

  describe('getSlicedFile', () => {
    it('should return file path and content type for a sliced MP4', async () => {
      const filePath = `/data/media/slices/g/s/${contentId}.mp4`;
      const { groupId, screenId, contentItemId } = await seedRendition(filePath);
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getSlicedFile(groupId, screenId, contentItemId);

      expect(result.filePath).toBe(filePath);
      expect(result.contentType).toBe('video/mp4');
    });

    it('should return file path and content type for a sliced WebP', async () => {
      const filePath = `/data/media/slices/g/s/${contentId}.webp`;
      const { groupId, screenId, contentItemId } = await seedRendition(filePath);
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getSlicedFile(groupId, screenId, contentItemId);

      expect(result.filePath).toBe(filePath);
      expect(result.contentType).toBe('image/webp');
    });

    it('should throw NotFoundException when rendition record does not exist', async () => {
      await expect(
        service.getSlicedFile(
          '880e8400-e29b-41d4-a716-446655440000',
          '770e8400-e29b-41d4-a716-446655440000',
          contentId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file does not exist on disk', async () => {
      const filePath = `/data/media/slices/g/s/${contentId}.mp4`;
      const { groupId, screenId, contentItemId } = await seedRendition(filePath);
      accessSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getSlicedFile(groupId, screenId, contentItemId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return application/octet-stream for unknown extensions', async () => {
      const filePath = `/data/media/slices/g/s/${contentId}.mkv`;
      const { groupId, screenId, contentItemId } = await seedRendition(filePath);
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getSlicedFile(groupId, screenId, contentItemId);

      expect(result.contentType).toBe('application/octet-stream');
    });
  });
});
