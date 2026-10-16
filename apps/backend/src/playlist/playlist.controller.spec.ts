import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistController } from './playlist.controller';
import { Reflector } from '@nestjs/core';
import { PlaylistService } from './playlist.service';
import { PlaylistRuleService } from './playlist-rule.service';
import { PlaylistKind } from './playlist-kind.enum';
import { PlaylistRuleDto } from './dto/playlist-rule.dto';
import { ROLES_KEY } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import type { Playlist, PlaylistItem } from '../db/schema';
import { AuthenticatedRequest } from '../auth';
import { TransitionType } from './transition-type.enum';

describe('PlaylistController', () => {
  let controller: PlaylistController;
  let service: Record<string, jest.Mock>;
  let ruleService: Record<string, jest.Mock>;

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
      addItems: jest.fn(),
      updateAllItems: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      reorderItems: jest.fn(),
      getTotalDuration: jest.fn(),
    };

    ruleService = {
      createDynamic: jest.fn(),
      updateRule: jest.fn(),
      preview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistController],
      providers: [
        { provide: PlaylistService, useValue: service },
        { provide: PlaylistRuleService, useValue: ruleService },
      ],
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

  describe('dynamic playlists', () => {
    const rule = Object.assign(new PlaylistRuleDto(), {
      sourceIds: [itemId],
      format: '1920x1080' as const,
    });

    it('routes the creation of a dynamic playlist to the rule service', async () => {
      const dto = { name: 'Metal', kind: PlaylistKind.Dynamic, rule };
      ruleService.createDynamic.mockResolvedValue(mockPlaylist);

      const result = await controller.create(orgId, dto);

      expect(ruleService.createDynamic).toHaveBeenCalledWith(orgId, dto);
      expect(service.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockPlaylist);
    });

    it('updates the rule with the acting user', async () => {
      ruleService.updateRule.mockResolvedValue(mockPlaylist);

      await controller.updateRule(orgId, playlistId, rule, mockReq);

      expect(ruleService.updateRule).toHaveBeenCalledWith(orgId, playlistId, rule, userId);
    });

    it('previews a rule in the current organisation', async () => {
      const preview = { items: [], totalDurationSeconds: 0 };
      ruleService.preview.mockResolvedValue(preview);

      await expect(controller.previewRule(orgId, rule)).resolves.toBe(preview);
      expect(ruleService.preview).toHaveBeenCalledWith(orgId, rule);
    });

    // RolesGuard default-denies an undeclared route; only a test catches a missing decorator.
    it.each(['create', 'updateRule', 'previewRule'] as const)(
      'limits %s to admins and editors',
      (method) => {
        expect(new Reflector().get(ROLES_KEY, PlaylistController.prototype[method])).toEqual([
          OrganisationRole.OrgAdmin,
          OrganisationRole.Editor,
        ]);
      },
    );
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

  describe('addItems', () => {
    it('should call service.addItems with the ordered items', async () => {
      const items = [{ contentId: 'content-2' }, { contentId: 'content-1', durationSeconds: 5 }];
      service.addItems.mockResolvedValue([mockItem, mockItem]);

      const result = await controller.addItems(orgId, playlistId, { items });

      expect(service.addItems).toHaveBeenCalledWith(playlistId, orgId, items);
      expect(result).toEqual([mockItem, mockItem]);
    });
  });

  describe('updateAllItems', () => {
    it('should call service.updateAllItems with organisationId, playlistId, and dto', async () => {
      const dto = { transition: TransitionType.Cut };
      service.updateAllItems.mockResolvedValue({ updated: 3 });

      const result = await controller.updateAllItems(orgId, playlistId, dto);

      expect(service.updateAllItems).toHaveBeenCalledWith(playlistId, orgId, dto);
      expect(result).toEqual({ updated: 3 });
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
