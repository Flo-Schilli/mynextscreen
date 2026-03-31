import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ScreenAuthenticatedRequest } from '../auth';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOrgId = '550e8400-e29b-41d4-a716-446655440099';
  const contentId = '660e8400-e29b-41d4-a716-446655440000';

  const mockResponse = () => {
    const res = {
      setHeader: jest.fn(),
      sendFile: jest.fn(),
    };
    return res as unknown as import('express').Response;
  };

  const mockRequest = (requestOrgId: string) =>
    ({
      organisationId: requestOrgId,
      screenId: '770e8400-e29b-41d4-a716-446655440000',
    }) as unknown as ScreenAuthenticatedRequest;

  beforeEach(async () => {
    mediaService = {
      getTranscodedFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mediaService }],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  describe('serveMedia', () => {
    it('should serve the transcoded file with correct headers', async () => {
      mediaService.getTranscodedFile.mockResolvedValue({
        filePath: `/data/media/${orgId}/transcoded/${contentId}.mp4`,
        contentType: 'video/mp4',
      });

      const res = mockResponse();
      const req = mockRequest(orgId);

      await controller.serveMedia(req, orgId, contentId, res);

      expect(mediaService.getTranscodedFile).toHaveBeenCalledWith(
        orgId,
        contentId,
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=86400, immutable',
      );
      expect(res.sendFile).toHaveBeenCalledWith(
        `/data/media/${orgId}/transcoded/${contentId}.mp4`,
        { root: '/' },
      );
    });

    it('should throw ForbiddenException when screen belongs to a different organisation', async () => {
      const res = mockResponse();
      const req = mockRequest(otherOrgId);

      await expect(
        controller.serveMedia(req, orgId, contentId, res),
      ).rejects.toThrow(ForbiddenException);

      expect(mediaService.getTranscodedFile).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException when content does not exist', async () => {
      mediaService.getTranscodedFile.mockRejectedValue(
        new NotFoundException('Content not found or transcoding not complete'),
      );

      const res = mockResponse();
      const req = mockRequest(orgId);

      await expect(
        controller.serveMedia(req, orgId, contentId, res),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set correct content type for image files', async () => {
      mediaService.getTranscodedFile.mockResolvedValue({
        filePath: `/data/media/${orgId}/transcoded/${contentId}.webp`,
        contentType: 'image/webp',
      });

      const res = mockResponse();
      const req = mockRequest(orgId);

      await controller.serveMedia(req, orgId, contentId, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    });
  });
});
