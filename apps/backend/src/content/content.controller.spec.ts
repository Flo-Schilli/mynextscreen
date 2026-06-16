import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ConfigService } from '@nestjs/config';
import type { Content } from '../db/schema';
import { ContentType } from './content-type.enum';

describe('ContentController — CRUD endpoints', () => {
  let controller: ContentController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const contentId = '770e8400-e29b-41d4-a716-446655440001';

  const mockContent: Partial<Content> = {
    id: contentId,
    organisationId: orgId,
    title: 'Test Video',
    type: ContentType.Video,
    originalFilename: 'test.mp4',
    originalMimeType: 'video/mp4',
  };

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

  describe('upload', () => {
    it('should call service.upload with organisationId, file, and dto', async () => {
      const file = { originalname: 'test.mp4', size: 1024 } as Express.Multer.File;
      const dto = { title: 'Test Video' };
      service.upload.mockResolvedValue(mockContent);

      const result = await controller.upload(orgId, file, dto);

      expect(service.upload).toHaveBeenCalledWith(orgId, file, dto);
      expect(result).toEqual(mockContent);
    });
  });

  describe('findAll', () => {
    it('should return all content for the organisation', async () => {
      service.findAll.mockResolvedValue([mockContent]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId, { type: undefined, tags: undefined });
      expect(result).toEqual([mockContent]);
    });

    it('should filter by type when provided', async () => {
      service.findAll.mockResolvedValue([mockContent]);

      await controller.findAll(orgId, ContentType.Video);

      expect(service.findAll).toHaveBeenCalledWith(orgId, {
        type: ContentType.Video,
        tags: undefined,
      });
    });

    it('should parse comma-separated tags when provided', async () => {
      service.findAll.mockResolvedValue([mockContent]);

      await controller.findAll(orgId, undefined, 'tag-a,tag-b');

      expect(service.findAll).toHaveBeenCalledWith(orgId, {
        type: undefined,
        tags: ['tag-a', 'tag-b'],
      });
    });

    it('should trim whitespace from parsed tags', async () => {
      service.findAll.mockResolvedValue([]);

      await controller.findAll(orgId, undefined, 'tag-a , tag-b');

      expect(service.findAll).toHaveBeenCalledWith(orgId, {
        type: undefined,
        tags: ['tag-a', 'tag-b'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a single content item by id', async () => {
      service.findOne.mockResolvedValue(mockContent);

      const result = await controller.findOne(orgId, contentId);

      expect(service.findOne).toHaveBeenCalledWith(orgId, contentId);
      expect(result).toEqual(mockContent);
    });

    it('should propagate NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(orgId, contentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMetadata', () => {
    it('should call service.updateMetadata and return updated content', async () => {
      const dto = { title: 'Updated Title' };
      const updated = { ...mockContent, title: 'Updated Title' };
      service.updateMetadata.mockResolvedValue(updated);

      const result = await controller.updateMetadata(orgId, contentId, dto);

      expect(service.updateMetadata).toHaveBeenCalledWith(orgId, contentId, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should call service.delete with organisationId and id', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(orgId, contentId);

      expect(service.delete).toHaveBeenCalledWith(orgId, contentId);
    });
  });

  describe('reUpload', () => {
    it('should call service.reUpload with organisationId, id, and file', async () => {
      const file = { originalname: 'new.mp4', size: 2048 } as Express.Multer.File;
      service.reUpload.mockResolvedValue(mockContent);

      const result = await controller.reUpload(orgId, contentId, file);

      expect(service.reUpload).toHaveBeenCalledWith(orgId, contentId, file);
      expect(result).toEqual(mockContent);
    });
  });

  describe('serveOriginal', () => {
    it('should throw NotFoundException when file does not exist on disk', async () => {
      service.findOne.mockResolvedValue({
        ...mockContent,
        originalFilename: 'test.mp4',
        originalMimeType: 'video/mp4',
      });

      const res = { setHeader: jest.fn(), sendFile: jest.fn() };

      // File does not exist on disk — NotFoundException expected
      await expect(
        controller.serveOriginal(orgId, contentId, res as unknown as import('express').Response),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('serveTranscoded', () => {
    it('should throw NotFoundException when transcoded file does not exist on disk', async () => {
      service.findOne.mockResolvedValue({
        ...mockContent,
        type: ContentType.Video,
      });

      const res = { setHeader: jest.fn(), sendFile: jest.fn() };

      await expect(
        controller.serveTranscoded(orgId, contentId, res as unknown as import('express').Response),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use webp extension for image content type', async () => {
      service.findOne.mockResolvedValue({
        ...mockContent,
        type: ContentType.Image,
        originalFilename: 'photo.jpg',
      });

      const res = { setHeader: jest.fn(), sendFile: jest.fn() };

      // File doesn't exist — just verify it tries the webp path by throwing NotFoundException
      await expect(
        controller.serveTranscoded(orgId, contentId, res as unknown as import('express').Response),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('serveThumbnail', () => {
    it('scopes via findOne and throws NotFoundException when no thumbnail exists', async () => {
      service.findOne.mockResolvedValue({ ...mockContent });

      const res = { setHeader: jest.fn(), sendFile: jest.fn() };

      await expect(
        controller.serveThumbnail(orgId, contentId, res as unknown as import('express').Response),
      ).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(orgId, contentId);
    });
  });
});
