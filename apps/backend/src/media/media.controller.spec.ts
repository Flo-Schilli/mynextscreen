import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screenGroups, screens } from '../db/schema';
import type { ScreenAuthenticatedRequest } from '../auth';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('MediaController', () => {
  let controller: MediaController;
  let db: DrizzleDB;
  let mediaService: Record<string, jest.Mock>;

  const contentId = '660e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  const mockResponse = () =>
    ({ setHeader: jest.fn(), sendFile: jest.fn() }) as unknown as import('express').Response;

  const mockRequest = (organisationId: string, screenId: string) =>
    ({ organisationId, screenId }) as unknown as ScreenAuthenticatedRequest;

  beforeEach(async () => {
    await truncateAll();
    mediaService = {
      getTranscodedFile: jest.fn(),
      getSlicedFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: mediaService },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  /** Seed an org + group + screen; returns their ids. */
  async function seedScreen(opts: { groupId?: string | null } = {}): Promise<{
    orgId: string;
    groupId: string;
    screenId: string;
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
        groupId: opts.groupId === undefined ? group.id : opts.groupId,
      })
      .returning();
    return { orgId: org.id, groupId: group.id, screenId: screen.id };
  }

  describe('serveMedia', () => {
    it('should serve the transcoded file with correct headers', async () => {
      const orgId = '550e8400-e29b-41d4-a716-446655440000';
      mediaService.getTranscodedFile.mockResolvedValue({
        filePath: `/data/media/${orgId}/transcoded/${contentId}.mp4`,
        contentType: 'video/mp4',
      });
      const res = mockResponse();

      await controller.serveMedia(mockRequest(orgId, 's'), orgId, contentId, res);

      expect(mediaService.getTranscodedFile).toHaveBeenCalledWith(orgId, contentId);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(res.sendFile).toHaveBeenCalledWith(
        `/data/media/${orgId}/transcoded/${contentId}.mp4`,
        { root: '/' },
      );
    });

    it('should throw ForbiddenException when screen belongs to a different organisation', async () => {
      const orgId = '550e8400-e29b-41d4-a716-446655440000';
      const otherOrgId = '550e8400-e29b-41d4-a716-446655440099';
      const res = mockResponse();

      await expect(
        controller.serveMedia(mockRequest(otherOrgId, 's'), orgId, contentId, res),
      ).rejects.toThrow(ForbiddenException);
      expect(mediaService.getTranscodedFile).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundException when content does not exist', async () => {
      const orgId = '550e8400-e29b-41d4-a716-446655440000';
      mediaService.getTranscodedFile.mockRejectedValue(
        new NotFoundException('Content not found or transcoding not complete'),
      );
      const res = mockResponse();

      await expect(
        controller.serveMedia(mockRequest(orgId, 's'), orgId, contentId, res),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set correct content type for image files', async () => {
      const orgId = '550e8400-e29b-41d4-a716-446655440000';
      mediaService.getTranscodedFile.mockResolvedValue({
        filePath: `/data/media/${orgId}/transcoded/${contentId}.webp`,
        contentType: 'image/webp',
      });
      const res = mockResponse();

      await controller.serveMedia(mockRequest(orgId, 's'), orgId, contentId, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    });
  });

  describe('serveSlicedMedia', () => {
    it('should serve the sliced file with correct headers', async () => {
      const { orgId, groupId, screenId } = await seedScreen();
      mediaService.getSlicedFile.mockResolvedValue({
        filePath: `/data/media/slices/${groupId}/${screenId}/${contentId}.mp4`,
        contentType: 'video/mp4',
      });
      const res = mockResponse();

      await controller.serveSlicedMedia(
        mockRequest(orgId, screenId),
        groupId,
        screenId,
        contentId,
        res,
      );

      expect(mediaService.getSlicedFile).toHaveBeenCalledWith(groupId, screenId, contentId);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'video/mp4');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
      expect(res.sendFile).toHaveBeenCalledWith(
        `/data/media/slices/${groupId}/${screenId}/${contentId}.mp4`,
        { root: '/' },
      );
    });

    it('should throw ForbiddenException when authenticated screen does not match param', async () => {
      const { orgId, groupId, screenId } = await seedScreen();
      const otherScreenId = '770e8400-e29b-41d4-a716-446655440099';
      const res = mockResponse();

      await expect(
        controller.serveSlicedMedia(
          mockRequest(orgId, otherScreenId),
          groupId,
          screenId,
          contentId,
          res,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mediaService.getSlicedFile).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when screen does not exist', async () => {
      const orgId = '550e8400-e29b-41d4-a716-446655440000';
      const groupId = '880e8400-e29b-41d4-a716-446655440000';
      const screenId = '770e8400-e29b-41d4-a716-446655440000';
      const res = mockResponse();

      await expect(
        controller.serveSlicedMedia(
          mockRequest(orgId, screenId),
          groupId,
          screenId,
          contentId,
          res,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when screen belongs to different organisation', async () => {
      const { groupId, screenId } = await seedScreen();
      const otherOrgId = '550e8400-e29b-41d4-a716-446655440099';
      const res = mockResponse();

      await expect(
        controller.serveSlicedMedia(
          mockRequest(otherOrgId, screenId),
          groupId,
          screenId,
          contentId,
          res,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when screen belongs to different group', async () => {
      const { orgId, screenId } = await seedScreen();
      const otherGroupId = '880e8400-e29b-41d4-a716-446655440099';
      const res = mockResponse();

      await expect(
        controller.serveSlicedMedia(
          mockRequest(orgId, screenId),
          otherGroupId,
          screenId,
          contentId,
          res,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException when sliced rendition does not exist', async () => {
      const { orgId, groupId, screenId } = await seedScreen();
      mediaService.getSlicedFile.mockRejectedValue(
        new NotFoundException('Sliced rendition not found'),
      );
      const res = mockResponse();

      await expect(
        controller.serveSlicedMedia(
          mockRequest(orgId, screenId),
          groupId,
          screenId,
          contentId,
          res,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set correct content type for image files', async () => {
      const { orgId, groupId, screenId } = await seedScreen();
      mediaService.getSlicedFile.mockResolvedValue({
        filePath: `/data/media/slices/${groupId}/${screenId}/${contentId}.webp`,
        contentType: 'image/webp',
      });
      const res = mockResponse();

      await controller.serveSlicedMedia(
        mockRequest(orgId, screenId),
        groupId,
        screenId,
        contentId,
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    });
  });
});
