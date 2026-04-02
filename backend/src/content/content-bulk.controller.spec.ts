import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from '../auth';

describe('ContentController — bulk endpoints', () => {
  let controller: ContentController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const contentId1 = '770e8400-e29b-41d4-a716-446655440001';
  const contentId2 = '770e8400-e29b-41d4-a716-446655440002';
  const contentId3 = '770e8400-e29b-41d4-a716-446655440003';
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';

  const mockReq = {
    user: { userId, email: 'test@example.com' },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    service = {
      upload: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateMetadata: jest.fn(),
      delete: jest.fn(),
      reUpload: jest.fn(),
      bulkDelete: jest.fn(),
      bulkTag: jest.fn(),
      bulkUntag: jest.fn(),
      bulkAddToPlaylist: jest.fn(),
    };

    const configServiceMock = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        { provide: ContentService, useValue: service },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
  });

  describe('bulkDelete', () => {
    it('should call service.bulkDelete with correct args', async () => {
      service.bulkDelete.mockResolvedValue({ deleted: 2, notFound: [] });

      const result = await controller.bulkDelete(
        orgId,
        { ids: [contentId1, contentId2] },
        mockReq,
      );

      expect(service.bulkDelete).toHaveBeenCalledWith(
        orgId,
        [contentId1, contentId2],
        userId,
      );
      expect(result).toEqual({ deleted: 2, notFound: [] });
    });

    it('should return notFound IDs', async () => {
      service.bulkDelete.mockResolvedValue({
        deleted: 1,
        notFound: [contentId3],
      });

      const result = await controller.bulkDelete(
        orgId,
        { ids: [contentId1, contentId3] },
        mockReq,
      );

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([contentId3]);
    });
  });

  describe('bulkTag', () => {
    it('should call service.bulkTag with correct args', async () => {
      service.bulkTag.mockResolvedValue({ updated: 2, notFound: [] });

      const result = await controller.bulkTag(
        orgId,
        { ids: [contentId1, contentId2], tags: ['tag-a', 'tag-b'] },
        mockReq,
      );

      expect(service.bulkTag).toHaveBeenCalledWith(
        orgId,
        [contentId1, contentId2],
        ['tag-a', 'tag-b'],
        userId,
      );
      expect(result).toEqual({ updated: 2, notFound: [] });
    });

    it('should return notFound IDs', async () => {
      service.bulkTag.mockResolvedValue({
        updated: 1,
        notFound: [contentId2],
      });

      const result = await controller.bulkTag(
        orgId,
        { ids: [contentId1, contentId2], tags: ['tag'] },
        mockReq,
      );

      expect(result.notFound).toEqual([contentId2]);
    });
  });

  describe('bulkUntag', () => {
    it('should call service.bulkUntag with correct args', async () => {
      service.bulkUntag.mockResolvedValue({ updated: 2, notFound: [] });

      const result = await controller.bulkUntag(
        orgId,
        { ids: [contentId1, contentId2], tags: ['tag-a'] },
        mockReq,
      );

      expect(service.bulkUntag).toHaveBeenCalledWith(
        orgId,
        [contentId1, contentId2],
        ['tag-a'],
        userId,
      );
      expect(result).toEqual({ updated: 2, notFound: [] });
    });
  });

  describe('bulkAddToPlaylist', () => {
    it('should call service.bulkAddToPlaylist with correct args', async () => {
      service.bulkAddToPlaylist.mockResolvedValue({
        added: 2,
        alreadyPresent: 0,
        notFound: [],
      });

      const result = await controller.bulkAddToPlaylist(
        orgId,
        { ids: [contentId1, contentId2], playlistId },
        mockReq,
      );

      expect(service.bulkAddToPlaylist).toHaveBeenCalledWith(
        orgId,
        [contentId1, contentId2],
        playlistId,
        userId,
      );
      expect(result).toEqual({ added: 2, alreadyPresent: 0, notFound: [] });
    });

    it('should return alreadyPresent count and notFound IDs', async () => {
      service.bulkAddToPlaylist.mockResolvedValue({
        added: 1,
        alreadyPresent: 1,
        notFound: [contentId3],
      });

      const result = await controller.bulkAddToPlaylist(
        orgId,
        { ids: [contentId1, contentId2, contentId3], playlistId },
        mockReq,
      );

      expect(result.added).toBe(1);
      expect(result.alreadyPresent).toBe(1);
      expect(result.notFound).toEqual([contentId3]);
    });
  });
});
