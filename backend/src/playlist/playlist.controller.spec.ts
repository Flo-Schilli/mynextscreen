import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistController } from './playlist.controller';
import { PlaylistService } from './playlist.service';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';
import { AuthenticatedRequest } from '../auth';
import { TransitionType } from './transition-type.enum';

describe('PlaylistController', () => {
  let controller: PlaylistController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const playlistId = '660e8400-e29b-41d4-a716-446655440000';
  const itemId = '770e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';

  const mockReq = {
    user: { userId, email: 'test@test.com' },
  } as AuthenticatedRequest;

  const mockPlaylist: Partial<Playlist> = {
    id: playlistId,
    organisationId: orgId,
    name: 'Test Playlist',
    items: [],
  };

  const mockItem: Partial<PlaylistItem> = {
    id: itemId,
    playlistId,
    durationSeconds: 10,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkDelete: jest.fn(),
      bulkAssignScreen: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      reorderItems: jest.fn(),
      getTotalDuration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistController],
      providers: [{ provide: PlaylistService, useValue: service }],
    }).compile();

    controller = module.get<PlaylistController>(PlaylistController);
  });

  describe('create', () => {
    it('should call service.create with organisationId and dto', async () => {
      const dto = { name: 'My Playlist' };
      service.create.mockResolvedValue(mockPlaylist);

      const result = await controller.create(orgId, dto);

      expect(service.create).toHaveBeenCalledWith(orgId, dto);
      expect(result).toEqual(mockPlaylist);
    });
  });

  describe('findAll', () => {
    it('should return playlists for the organisation', async () => {
      service.findAll.mockResolvedValue([mockPlaylist]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([mockPlaylist]);
    });
  });

  describe('findOne', () => {
    it('should return a single playlist by id', async () => {
      service.findOne.mockResolvedValue(mockPlaylist);

      const result = await controller.findOne(orgId, playlistId);

      expect(service.findOne).toHaveBeenCalledWith(playlistId, orgId);
      expect(result).toEqual(mockPlaylist);
    });
  });

  describe('update', () => {
    it('should call service.update with organisationId, id, and dto', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { ...mockPlaylist, name: 'Updated Name' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(orgId, playlistId, dto);

      expect(service.update).toHaveBeenCalledWith(playlistId, orgId, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should call service.delete with organisationId and id', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(orgId, playlistId);

      expect(service.delete).toHaveBeenCalledWith(playlistId, orgId);
    });
  });

  describe('bulkDelete', () => {
    it('should call service.bulkDelete with ids and userId', async () => {
      const dto = { ids: [playlistId] };
      const response = { deleted: 1, notFound: [] };
      service.bulkDelete.mockResolvedValue(response);

      const result = await controller.bulkDelete(orgId, dto, mockReq);

      expect(service.bulkDelete).toHaveBeenCalledWith(orgId, dto.ids, userId);
      expect(result).toEqual(response);
    });
  });

  describe('bulkAssignScreen', () => {
    it('should call service.bulkAssignScreen with all parameters', async () => {
      const screenId = '990e8400-e29b-41d4-a716-446655440000';
      const dto = { ids: [playlistId], screenId };
      const response = { assigned: 1, notFound: [] };
      service.bulkAssignScreen.mockResolvedValue(response);

      const result = await controller.bulkAssignScreen(orgId, dto, mockReq);

      expect(service.bulkAssignScreen).toHaveBeenCalledWith(orgId, dto.ids, screenId, userId);
      expect(result).toEqual(response);
    });
  });

  describe('addItem', () => {
    it('should call service.addItem with organisationId, playlistId, and dto', async () => {
      const dto = { contentId: 'content-1', durationSeconds: 15 };
      service.addItem.mockResolvedValue(mockItem);

      const result = await controller.addItem(orgId, playlistId, dto);

      expect(service.addItem).toHaveBeenCalledWith(playlistId, orgId, dto);
      expect(result).toEqual(mockItem);
    });
  });

  describe('updateItem', () => {
    it('should call service.updateItem with all parameters', async () => {
      const dto = { transition: TransitionType.Fade, transitionDurationMs: 500 };
      const updated = { ...mockItem, ...dto };
      service.updateItem.mockResolvedValue(updated);

      const result = await controller.updateItem(orgId, playlistId, itemId, dto);

      expect(service.updateItem).toHaveBeenCalledWith(playlistId, itemId, orgId, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('removeItem', () => {
    it('should call service.removeItem with organisationId, playlistId, and itemId', async () => {
      service.removeItem.mockResolvedValue(undefined);

      await controller.removeItem(orgId, playlistId, itemId);

      expect(service.removeItem).toHaveBeenCalledWith(playlistId, itemId, orgId);
    });
  });

  describe('reorderItems', () => {
    it('should call service.reorderItems with ordered itemIds', async () => {
      const dto = { itemIds: [itemId, 'other-item-id'] };
      service.reorderItems.mockResolvedValue([mockItem]);

      const result = await controller.reorderItems(orgId, playlistId, dto);

      expect(service.reorderItems).toHaveBeenCalledWith(playlistId, orgId, dto.itemIds);
      expect(result).toEqual([mockItem]);
    });
  });

  describe('getTotalDuration', () => {
    it('should return totalDurationSeconds wrapped in an object', async () => {
      service.getTotalDuration.mockResolvedValue(55);

      const result = await controller.getTotalDuration(orgId, playlistId);

      expect(service.getTotalDuration).toHaveBeenCalledWith(playlistId, orgId);
      expect(result).toEqual({ totalDurationSeconds: 55 });
    });
  });
});
