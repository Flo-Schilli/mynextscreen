import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import { MediaService } from './media.service';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';

describe('MediaService', () => {
  let service: MediaService;
  let slicedRenditionRepository: Record<string, jest.Mock>;
  let readdirSpy: jest.SpyInstance;
  let accessSpy: jest.SpyInstance;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const contentId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  const groupId = '880e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    slicedRenditionRepository = {
      findOne: jest.fn(),
    };

    readdirSpy = jest
      .spyOn(fs.promises, 'readdir')
      .mockResolvedValue(
        [] as unknown as Awaited<ReturnType<typeof fs.promises.readdir>>,
      );
    accessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('/data/media'),
          },
        },
        {
          provide: getRepositoryToken(SlicedRendition),
          useValue: slicedRenditionRepository,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    readdirSpy.mockRestore();
    accessSpy.mockRestore();
  });

  describe('getTranscodedFile', () => {
    it('should return file path and content type for an MP4 file', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.mp4`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(
        `/data/media/${orgId}/transcoded/${contentId}.mp4`,
      );
      expect(result.contentType).toBe('video/mp4');
    });

    it('should return file path and content type for a WebP image', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.webp`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(
        `/data/media/${orgId}/transcoded/${contentId}.webp`,
      );
      expect(result.contentType).toBe('image/webp');
    });

    it('should return file path and content type for a JPEG image', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.jpg`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(
        `/data/media/${orgId}/transcoded/${contentId}.jpg`,
      );
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should throw NotFoundException when directory does not exist', async () => {
      readdirSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getTranscodedFile(orgId, contentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when file is not found', async () => {
      readdirSpy.mockResolvedValue(['other-file.mp4']);

      await expect(service.getTranscodedFile(orgId, contentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return application/octet-stream for unknown extensions', async () => {
      readdirSpy.mockResolvedValue([`${contentId}.mkv`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.contentType).toBe('application/octet-stream');
    });
  });

  describe('getSlicedFile', () => {
    it('should return file path and content type for a sliced MP4', async () => {
      const filePath = `/data/media/slices/${groupId}/${screenId}/${contentId}.mp4`;
      slicedRenditionRepository.findOne.mockResolvedValue({ filePath });
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getSlicedFile(groupId, screenId, contentId);

      expect(result.filePath).toBe(filePath);
      expect(result.contentType).toBe('video/mp4');
      expect(slicedRenditionRepository.findOne).toHaveBeenCalledWith({
        where: { groupId, screenId, contentItemId: contentId },
      });
    });

    it('should return file path and content type for a sliced WebP', async () => {
      const filePath = `/data/media/slices/${groupId}/${screenId}/${contentId}.webp`;
      slicedRenditionRepository.findOne.mockResolvedValue({ filePath });
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getSlicedFile(groupId, screenId, contentId);

      expect(result.filePath).toBe(filePath);
      expect(result.contentType).toBe('image/webp');
    });

    it('should throw NotFoundException when rendition record does not exist', async () => {
      slicedRenditionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSlicedFile(groupId, screenId, contentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file does not exist on disk', async () => {
      const filePath = `/data/media/slices/${groupId}/${screenId}/${contentId}.mp4`;
      slicedRenditionRepository.findOne.mockResolvedValue({ filePath });
      accessSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(
        service.getSlicedFile(groupId, screenId, contentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return application/octet-stream for unknown extensions', async () => {
      const filePath = `/data/media/slices/${groupId}/${screenId}/${contentId}.mkv`;
      slicedRenditionRepository.findOne.mockResolvedValue({ filePath });
      accessSpy.mockResolvedValue(undefined);

      const result = await service.getSlicedFile(groupId, screenId, contentId);

      expect(result.contentType).toBe('application/octet-stream');
    });
  });
});
