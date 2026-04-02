import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Screen } from '../screen/screen.entity';
import { ScreenAuthenticatedRequest } from '../auth';

describe('MediaController', () => {
  let controller: MediaController;
  let mediaService: Record<string, jest.Mock>;
  let screenRepository: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOrgId = '550e8400-e29b-41d4-a716-446655440099';
  const contentId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  const groupId = '880e8400-e29b-41d4-a716-446655440000';

  const mockResponse = () => {
    const res = {
      setHeader: jest.fn(),
      sendFile: jest.fn(),
    };
    return res as unknown as import('express').Response;
  };

  const mockRequest = (requestOrgId: string, requestScreenId = screenId) =>
    ({
      organisationId: requestOrgId,
      screenId: requestScreenId,
    }) as unknown as ScreenAuthenticatedRequest;

  beforeEach(async () => {
    mediaService = {
      getTranscodedFile: jest.fn(),
      getSlicedFile: jest.fn(),
    };

    screenRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: mediaService },
        { provide: getRepositoryToken(Screen), useValue: screenRepository },
      ],
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

  describe('serveSlicedMedia', () => {
    it('should serve the sliced file with correct headers', async () => {
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: orgId,
        groupId,
      });
      mediaService.getSlicedFile.mockResolvedValue({
        filePath: `/data/media/slices/${groupId}/${screenId}/${contentId}.mp4`,
        contentType: 'video/mp4',
      });

      const res = mockResponse();
      const req = mockRequest(orgId);

      await controller.serveSlicedMedia(req, groupId, screenId, contentId, res);

      expect(mediaService.getSlicedFile).toHaveBeenCalledWith(
        groupId,
        screenId,
        contentId,
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=86400, immutable',
      );
      expect(res.sendFile).toHaveBeenCalledWith(
        `/data/media/slices/${groupId}/${screenId}/${contentId}.mp4`,
        { root: '/' },
      );
    });

    it('should throw ForbiddenException when authenticated screen does not match param', async () => {
      const otherScreenId = '770e8400-e29b-41d4-a716-446655440099';
      const res = mockResponse();
      const req = mockRequest(orgId, otherScreenId);

      await expect(
        controller.serveSlicedMedia(req, groupId, screenId, contentId, res),
      ).rejects.toThrow(ForbiddenException);

      expect(screenRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      screenRepository.findOne.mockResolvedValue(null);

      const res = mockResponse();
      const req = mockRequest(orgId);

      await expect(
        controller.serveSlicedMedia(req, groupId, screenId, contentId, res),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when screen belongs to different organisation', async () => {
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: otherOrgId,
        groupId,
      });

      const res = mockResponse();
      const req = mockRequest(orgId);

      await expect(
        controller.serveSlicedMedia(req, groupId, screenId, contentId, res),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when screen belongs to different group', async () => {
      const otherGroupId = '880e8400-e29b-41d4-a716-446655440099';
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: orgId,
        groupId: otherGroupId,
      });

      const res = mockResponse();
      const req = mockRequest(orgId);

      await expect(
        controller.serveSlicedMedia(req, groupId, screenId, contentId, res),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException when sliced rendition does not exist', async () => {
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: orgId,
        groupId,
      });
      mediaService.getSlicedFile.mockRejectedValue(
        new NotFoundException('Sliced rendition not found'),
      );

      const res = mockResponse();
      const req = mockRequest(orgId);

      await expect(
        controller.serveSlicedMedia(req, groupId, screenId, contentId, res),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set correct content type for image files', async () => {
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: orgId,
        groupId,
      });
      mediaService.getSlicedFile.mockResolvedValue({
        filePath: `/data/media/slices/${groupId}/${screenId}/${contentId}.webp`,
        contentType: 'image/webp',
      });

      const res = mockResponse();
      const req = mockRequest(orgId);

      await controller.serveSlicedMedia(req, groupId, screenId, contentId, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    });
  });
});
