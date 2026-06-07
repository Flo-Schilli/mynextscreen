import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';
import { AuthenticatedRequest } from '../auth';

describe('PlaylistController — bulk endpoints', () => {
  let controller: PlaylistController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const playlistId1 = '770e8400-e29b-41d4-a716-446655440001';
  const playlistId2 = '770e8400-e29b-41d4-a716-446655440002';
  const playlistId3 = '770e8400-e29b-41d4-a716-446655440003';
  const screenId = '880e8400-e29b-41d4-a716-446655440000';

  const mockReq = {
    user: { userId, email: 'test@example.com' },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      reorderItems: jest.fn(),
      getTotalDuration: jest.fn(),
      bulkDelete: jest.fn(),
      bulkAssignScreen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistController],
      providers: [{ provide: PlaylistService, useValue: service }],
    }).compile();

    controller = module.get<PlaylistController>(PlaylistController);
  });

  describe('bulkDelete', () => {
    it('should call service.bulkDelete with correct args', async () => {
      service.bulkDelete.mockResolvedValue({ deleted: 2, notFound: [] });

      const result = await controller.bulkDelete(
        orgId,
        { ids: [playlistId1, playlistId2] },
        mockReq,
      );

      expect(service.bulkDelete).toHaveBeenCalledWith(orgId, [playlistId1, playlistId2], userId);
      expect(result).toEqual({ deleted: 2, notFound: [] });
    });

    it('should return notFound IDs for playlists that do not exist', async () => {
      service.bulkDelete.mockResolvedValue({
        deleted: 1,
        notFound: [playlistId3],
      });

      const result = await controller.bulkDelete(
        orgId,
        { ids: [playlistId1, playlistId3] },
        mockReq,
      );

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([playlistId3]);
    });
  });

  describe('bulkAssignScreen', () => {
    it('should call service.bulkAssignScreen with correct args', async () => {
      service.bulkAssignScreen.mockResolvedValue({
        assigned: 2,
        notFound: [],
      });

      const result = await controller.bulkAssignScreen(
        orgId,
        { ids: [playlistId1, playlistId2], screenId },
        mockReq,
      );

      expect(service.bulkAssignScreen).toHaveBeenCalledWith(
        orgId,
        [playlistId1, playlistId2],
        screenId,
        userId,
      );
      expect(result).toEqual({ assigned: 2, notFound: [] });
    });

    it('should return notFound IDs for playlists that do not exist', async () => {
      service.bulkAssignScreen.mockResolvedValue({
        assigned: 1,
        notFound: [playlistId3],
      });

      const result = await controller.bulkAssignScreen(
        orgId,
        { ids: [playlistId1, playlistId3], screenId },
        mockReq,
      );

      expect(result.assigned).toBe(1);
      expect(result.notFound).toEqual([playlistId3]);
    });

    it('should propagate service errors for invalid screen', async () => {
      service.bulkAssignScreen.mockRejectedValue(new Error('Screen not found'));

      await expect(
        controller.bulkAssignScreen(orgId, { ids: [playlistId1], screenId }, mockReq),
      ).rejects.toThrow('Screen not found');
    });
  });
});
