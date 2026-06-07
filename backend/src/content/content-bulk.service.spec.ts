import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ContentService } from './content.service';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { Playlist } from '../playlist/playlist.entity';
import { PlaylistItem } from '../playlist/playlist-item.entity';
import { StorageService } from '../organisation/storage.service';
import {
  AUDIT_CONTENT_BULK_DELETED,
  AUDIT_CONTENT_BULK_TAGGED,
  AUDIT_CONTENT_BULK_UNTAGGED,
  AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
} from '../audit-log/audit.events';

describe('ContentService — bulk operations', () => {
  let service: ContentService;
  let contentRepository: Record<string, jest.Mock>;
  let playlistRepository: Record<string, jest.Mock>;
  let playlistItemRepository: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };
  let configService: Record<string, jest.Mock>;
  let transcodingQueue: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOrgId = '550e8400-e29b-41d4-a716-446655440099';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const contentId1 = '770e8400-e29b-41d4-a716-446655440001';
  const contentId2 = '770e8400-e29b-41d4-a716-446655440002';
  const contentId3 = '770e8400-e29b-41d4-a716-446655440003';
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';

  const makeContent = (id: string, orgIdOverride?: string, tags: string[] = []): Content =>
    ({
      id,
      organisationId: orgIdOverride ?? orgId,
      title: `Content ${id.slice(-1)}`,
      description: null,
      tags,
      type: ContentType.Image,
      originalFilename: `file-${id.slice(-1)}.png`,
      originalMimeType: 'image/png',
      originalSizeBytes: 1024,
      transcodedSizeBytes: null,
      transcodingStatus: TranscodingStatus.Completed,
      transcodingError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as Content;

  beforeEach(() => {
    contentRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    playlistRepository = {
      findOne: jest.fn(),
    };

    playlistItemRepository = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'new-item-id', ...data })),
    };

    storageService = {
      subtractOriginalUsage: jest.fn().mockResolvedValue(undefined),
      subtractTranscodedUsage: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = { emit: jest.fn() };

    configService = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    };

    transcodingQueue = {
      add: jest.fn(),
    };

    service = new ContentService(
      contentRepository as unknown as Repository<Content>,
      playlistRepository as unknown as Repository<Playlist>,
      playlistItemRepository as unknown as Repository<PlaylistItem>,
      transcodingQueue as unknown as Queue,
      configService as unknown as ConfigService,
      storageService as unknown as StorageService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('bulkDelete', () => {
    it('should delete all found content and return count', async () => {
      const contents = [makeContent(contentId1), makeContent(contentId2)];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.remove.mockResolvedValue(contents);

      const result = await service.bulkDelete(orgId, [contentId1, contentId2], userId);

      expect(contentRepository.remove).toHaveBeenCalledWith(contents);
      expect(result.deleted).toBe(2);
      expect(result.notFound).toEqual([]);
    });

    it('should return notFound IDs for content that does not exist', async () => {
      const contents = [makeContent(contentId1)];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.findOne.mockResolvedValue(null);
      contentRepository.remove.mockResolvedValue(contents);

      const result = await service.bulkDelete(orgId, [contentId1, contentId2], userId);

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([contentId2]);
    });

    it('should throw BadRequestException when IDs belong to another org', async () => {
      contentRepository.find.mockResolvedValue([makeContent(contentId1)]);
      contentRepository.findOne.mockResolvedValue(makeContent(contentId2, otherOrgId));

      await expect(service.bulkDelete(orgId, [contentId1, contentId2], userId)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.bulkDelete(orgId, [contentId1, contentId2], userId);
      } catch (err: unknown) {
        expect((err as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({ foreignIds: [contentId2] }),
        );
      }
    });

    it('should emit one audit event per deleted content', async () => {
      const contents = [makeContent(contentId1), makeContent(contentId2)];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.remove.mockResolvedValue(contents);

      await service.bulkDelete(orgId, [contentId1, contentId2], userId);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_DELETED,
        expect.objectContaining({
          contentId: contentId1,
          organisationId: orgId,
          userId,
          details: expect.objectContaining({ bulkOperationSize: 2 }),
        }),
      );
    });

    it('should subtract storage usage for each deleted content', async () => {
      const content = makeContent(contentId1);
      content.transcodedSizeBytes = 512;
      contentRepository.find.mockResolvedValue([content]);
      contentRepository.remove.mockResolvedValue([content]);

      await service.bulkDelete(orgId, [contentId1], userId);

      expect(storageService.subtractOriginalUsage).toHaveBeenCalledWith(orgId, 1024);
      expect(storageService.subtractTranscodedUsage).toHaveBeenCalledWith(orgId, 512);
    });

    it('should handle empty found set gracefully', async () => {
      contentRepository.find.mockResolvedValue([]);
      contentRepository.findOne.mockResolvedValue(null);

      const result = await service.bulkDelete(orgId, [contentId1], userId);

      expect(result.deleted).toBe(0);
      expect(result.notFound).toEqual([contentId1]);
      expect(contentRepository.remove).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('bulkTag', () => {
    it('should add tags to all found content items', async () => {
      const contents = [
        makeContent(contentId1, orgId, ['existing']),
        makeContent(contentId2, orgId, []),
      ];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.save.mockResolvedValue(contents);

      const result = await service.bulkTag(orgId, [contentId1, contentId2], ['new-tag'], userId);

      expect(result.updated).toBe(2);
      expect(contents[0].tags).toContain('existing');
      expect(contents[0].tags).toContain('new-tag');
      expect(contents[1].tags).toContain('new-tag');
    });

    it('should not duplicate existing tags', async () => {
      const content = makeContent(contentId1, orgId, ['tag-a']);
      contentRepository.find.mockResolvedValue([content]);
      contentRepository.save.mockResolvedValue([content]);

      await service.bulkTag(orgId, [contentId1], ['tag-a', 'tag-b'], userId);

      expect(content.tags).toEqual(['tag-a', 'tag-b']);
    });

    it('should return notFound IDs', async () => {
      contentRepository.find.mockResolvedValue([makeContent(contentId1)]);
      contentRepository.findOne.mockResolvedValue(null);
      contentRepository.save.mockResolvedValue([]);

      const result = await service.bulkTag(orgId, [contentId1, contentId2], ['tag'], userId);

      expect(result.updated).toBe(1);
      expect(result.notFound).toEqual([contentId2]);
    });

    it('should throw BadRequestException on foreign IDs', async () => {
      contentRepository.find.mockResolvedValue([]);
      contentRepository.findOne.mockResolvedValue(makeContent(contentId1, otherOrgId));

      await expect(service.bulkTag(orgId, [contentId1], ['tag'], userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should emit one audit event per tagged content', async () => {
      const contents = [makeContent(contentId1), makeContent(contentId2)];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.save.mockResolvedValue(contents);

      await service.bulkTag(orgId, [contentId1, contentId2], ['tag-a'], userId);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_TAGGED,
        expect.objectContaining({
          contentId: contentId1,
          details: { bulkOperationSize: 2, tags: ['tag-a'] },
        }),
      );
    });
  });

  describe('bulkUntag', () => {
    it('should remove specified tags from all found content items', async () => {
      const contents = [
        makeContent(contentId1, orgId, ['keep', 'remove-me']),
        makeContent(contentId2, orgId, ['remove-me', 'also-keep']),
      ];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.save.mockResolvedValue(contents);

      const result = await service.bulkUntag(
        orgId,
        [contentId1, contentId2],
        ['remove-me'],
        userId,
      );

      expect(result.updated).toBe(2);
      expect(contents[0].tags).toEqual(['keep']);
      expect(contents[1].tags).toEqual(['also-keep']);
    });

    it('should handle content with none of the specified tags', async () => {
      const content = makeContent(contentId1, orgId, ['unrelated']);
      contentRepository.find.mockResolvedValue([content]);
      contentRepository.save.mockResolvedValue([content]);

      const result = await service.bulkUntag(orgId, [contentId1], ['nonexistent'], userId);

      expect(result.updated).toBe(1);
      expect(content.tags).toEqual(['unrelated']);
    });

    it('should emit one audit event per untagged content', async () => {
      const contents = [makeContent(contentId1, orgId, ['tag-a'])];
      contentRepository.find.mockResolvedValue(contents);
      contentRepository.save.mockResolvedValue(contents);

      await service.bulkUntag(orgId, [contentId1], ['tag-a'], userId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_UNTAGGED,
        expect.objectContaining({
          contentId: contentId1,
          details: { bulkOperationSize: 1, tags: ['tag-a'] },
        }),
      );
    });
  });

  describe('bulkAddToPlaylist', () => {
    it('should add content items to the playlist', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      const contents = [makeContent(contentId1), makeContent(contentId2)];
      contentRepository.find.mockResolvedValue(contents);
      playlistItemRepository.find.mockResolvedValue([]);

      const result = await service.bulkAddToPlaylist(
        orgId,
        [contentId1, contentId2],
        playlistId,
        userId,
      );

      expect(result.added).toBe(2);
      expect(result.alreadyPresent).toBe(0);
      expect(result.notFound).toEqual([]);
      expect(playlistItemRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate items already in the playlist', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      const contents = [makeContent(contentId1), makeContent(contentId2)];
      contentRepository.find.mockResolvedValue(contents);
      playlistItemRepository.find.mockResolvedValue([
        { id: 'existing-item', playlistId, contentId: contentId1, position: 0 },
      ]);

      const result = await service.bulkAddToPlaylist(
        orgId,
        [contentId1, contentId2],
        playlistId,
        userId,
      );

      expect(result.added).toBe(1);
      expect(result.alreadyPresent).toBe(1);
      expect(playlistItemRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate within the same batch', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      const content = makeContent(contentId1);
      contentRepository.find.mockResolvedValue([content]);
      playlistItemRepository.find.mockResolvedValue([]);

      // Pass same ID twice
      const result = await service.bulkAddToPlaylist(
        orgId,
        [contentId1, contentId1],
        playlistId,
        userId,
      );

      // Second occurrence treated as already present after the first is added
      expect(result.added).toBe(1);
      expect(result.alreadyPresent).toBe(1);
    });

    it('should throw BadRequestException for non-existent playlist', async () => {
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(
        service.bulkAddToPlaylist(orgId, [contentId1], playlistId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return notFound for missing content IDs', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      contentRepository.find.mockResolvedValue([makeContent(contentId1)]);
      contentRepository.findOne.mockResolvedValue(null);
      playlistItemRepository.find.mockResolvedValue([]);

      const result = await service.bulkAddToPlaylist(
        orgId,
        [contentId1, contentId2],
        playlistId,
        userId,
      );

      expect(result.added).toBe(1);
      expect(result.notFound).toEqual([contentId2]);
    });

    it('should throw BadRequestException on foreign content IDs', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      contentRepository.find.mockResolvedValue([]);
      contentRepository.findOne.mockResolvedValue(makeContent(contentId1, otherOrgId));

      await expect(
        service.bulkAddToPlaylist(orgId, [contentId1], playlistId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit one audit event per added content', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      contentRepository.find.mockResolvedValue([makeContent(contentId1)]);
      playlistItemRepository.find.mockResolvedValue([]);

      await service.bulkAddToPlaylist(orgId, [contentId1], playlistId, userId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
        expect.objectContaining({
          contentId: contentId1,
          details: { bulkOperationSize: 1, playlistId },
        }),
      );
    });

    it('should append items after existing max position', async () => {
      playlistRepository.findOne.mockResolvedValue({
        id: playlistId,
        organisationId: orgId,
      });
      contentRepository.find.mockResolvedValue([makeContent(contentId1)]);
      playlistItemRepository.find.mockResolvedValue([
        {
          id: 'existing',
          playlistId,
          contentId: contentId3,
          position: 5,
        },
      ]);

      await service.bulkAddToPlaylist(orgId, [contentId1], playlistId, userId);

      expect(playlistItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 6 }),
      );
    });
  });
});
