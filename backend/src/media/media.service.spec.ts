import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { MediaService } from './media.service';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readdirMock = fs.promises.readdir as any as jest.Mock;

describe('MediaService', () => {
  let service: MediaService;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const contentId = '660e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('/data/media'),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getTranscodedFile', () => {
    it('should return file path and content type for an MP4 file', async () => {
      readdirMock.mockResolvedValue([`${contentId}.mp4`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(
        `/data/media/${orgId}/transcoded/${contentId}.mp4`,
      );
      expect(result.contentType).toBe('video/mp4');
    });

    it('should return file path and content type for a WebP image', async () => {
      readdirMock.mockResolvedValue([`${contentId}.webp`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(
        `/data/media/${orgId}/transcoded/${contentId}.webp`,
      );
      expect(result.contentType).toBe('image/webp');
    });

    it('should return file path and content type for a JPEG image', async () => {
      readdirMock.mockResolvedValue([`${contentId}.jpg`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.filePath).toBe(
        `/data/media/${orgId}/transcoded/${contentId}.jpg`,
      );
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should throw NotFoundException when directory does not exist', async () => {
      readdirMock.mockRejectedValue(new Error('ENOENT'));

      await expect(service.getTranscodedFile(orgId, contentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when file is not found', async () => {
      readdirMock.mockResolvedValue(['other-file.mp4']);

      await expect(service.getTranscodedFile(orgId, contentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return application/octet-stream for unknown extensions', async () => {
      readdirMock.mockResolvedValue([`${contentId}.mkv`]);

      const result = await service.getTranscodedFile(orgId, contentId);

      expect(result.contentType).toBe('application/octet-stream');
    });
  });
});
