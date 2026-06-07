import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroup } from './screen-group.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { Screen } from '../screen/screen.entity';
import { Organisation } from '../organisation/organisation.entity';

describe('ScreenGroupService', () => {
  let service: ScreenGroupService;
  let repository: Record<string, jest.Mock>;
  let screenRepository: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const groupId = '660e8400-e29b-41d4-a716-446655440000';

  const mockGroup: ScreenGroup = {
    id: groupId,
    organisationId: orgId,
    name: 'Video Wall',
    mode: ScreenGroupMode.Split,
    gridColumns: 2,
    gridRows: 2,
    screens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
  };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    screenRepository = {
      count: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    service = new ScreenGroupService(
      repository as unknown as Repository<ScreenGroup>,
      screenRepository as unknown as Repository<Screen>,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('createGroup', () => {
    it('should create a split-mode group with grid dimensions', async () => {
      const dto = {
        name: 'Video Wall',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 2,
      };
      repository.create.mockReturnValue(mockGroup);
      repository.save.mockResolvedValue(mockGroup);

      const result = await service.createGroup(orgId, dto);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Video Wall',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 2,
        organisationId: orgId,
      });
      expect(result).toEqual(mockGroup);
    });

    it('should create a mirror-mode group without grid dimensions', async () => {
      const mirrorGroup = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      };
      const dto = {
        name: 'Mirror Group',
        mode: ScreenGroupMode.Mirror,
      };
      repository.create.mockReturnValue(mirrorGroup);
      repository.save.mockResolvedValue(mirrorGroup);

      const result = await service.createGroup(orgId, dto);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Mirror Group',
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
        organisationId: orgId,
      });
      expect(result).toEqual(mirrorGroup);
    });

    it('should throw BadRequestException when split mode lacks gridColumns', async () => {
      const dto = {
        name: 'Bad Wall',
        mode: ScreenGroupMode.Split,
        gridRows: 2,
      };

      await expect(service.createGroup(orgId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when split mode lacks gridRows', async () => {
      const dto = {
        name: 'Bad Wall',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
      };

      await expect(service.createGroup(orgId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should null out grid dimensions for mirror mode even if provided', async () => {
      const mirrorGroup = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      };
      const dto = {
        name: 'Mirror',
        mode: ScreenGroupMode.Mirror,
        gridColumns: 2,
        gridRows: 2,
      };
      repository.create.mockReturnValue(mirrorGroup);
      repository.save.mockResolvedValue(mirrorGroup);

      await service.createGroup(orgId, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gridColumns: null,
          gridRows: null,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all groups for the organisation', async () => {
      repository.find.mockResolvedValue([mockGroup]);

      const result = await service.findAll(orgId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { organisationId: orgId },
        relations: ['screens'],
      });
      expect(result).toEqual([mockGroup]);
    });

    it('should return empty array when no groups exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll(orgId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a group by id scoped to organisation', async () => {
      repository.findOne.mockResolvedValue(mockGroup);

      const result = await service.findOne(orgId, groupId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId, id: groupId },
        relations: ['screens'],
      });
      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException when group not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(orgId, groupId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateGroup', () => {
    it('should update the group name', async () => {
      const existing = { ...mockGroup };
      const updated = { ...mockGroup, name: 'New Name' };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockResolvedValue(updated);

      const result = await service.updateGroup(orgId, groupId, {
        name: 'New Name',
      });

      expect(result).toEqual(updated);
    });

    it('should switch from split to mirror and clear grid dimensions', async () => {
      const existing = { ...mockGroup };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation(async (e) => e);

      const result = await service.updateGroup(orgId, groupId, {
        mode: ScreenGroupMode.Mirror,
      });

      expect(result.mode).toBe(ScreenGroupMode.Mirror);
      expect(result.gridColumns).toBeNull();
      expect(result.gridRows).toBeNull();
    });

    it('should switch from mirror to split with grid dimensions', async () => {
      const existing = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation(async (e) => e);

      const result = await service.updateGroup(orgId, groupId, {
        mode: ScreenGroupMode.Split,
        gridColumns: 3,
        gridRows: 2,
      });

      expect(result.mode).toBe(ScreenGroupMode.Split);
      expect(result.gridColumns).toBe(3);
      expect(result.gridRows).toBe(2);
    });

    it('should throw BadRequestException when switching to split without grid', async () => {
      const existing = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      };
      repository.findOne.mockResolvedValue(existing);

      await expect(
        service.updateGroup(orgId, groupId, {
          mode: ScreenGroupMode.Split,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when group not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateGroup(orgId, groupId, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeGroup', () => {
    it('should remove a group with no member screens', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.count.mockResolvedValue(0);
      repository.remove.mockResolvedValue(undefined);

      await service.removeGroup(orgId, groupId);

      expect(repository.remove).toHaveBeenCalledWith(mockGroup);
    });

    it('should throw ConflictException when group has member screens', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.count.mockResolvedValue(3);

      await expect(service.removeGroup(orgId, groupId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should include screen count in conflict message', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.count.mockResolvedValue(2);

      await expect(service.removeGroup(orgId, groupId)).rejects.toThrow(
        /2 assigned screen\(s\)/,
      );
    });

    it('should throw NotFoundException when group not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.removeGroup(orgId, groupId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignScreen', () => {
    const screenId = '770e8400-e29b-41d4-a716-446655440000';
    const mockScreen: Screen = {
      id: screenId,
      organisationId: orgId,
      name: 'Lobby Display',
      resolution: '1920x1080',
      location: 'Lobby',
      apiKeyHash: 'hash',
      lastHeartbeat: null,
      isOnline: false,
      groupId: null,
      group: null,
      gridRow: null,
      gridColumn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organisation: {} as Organisation,
    };

    it('should assign a screen to a mirror-mode group', async () => {
      const mirrorGroup = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      };
      repository.findOne.mockResolvedValue(mirrorGroup);
      screenRepository.findOne.mockResolvedValue({ ...mockScreen });
      screenRepository.save.mockImplementation(async (s: Screen) => s);

      const result = await service.assignScreen(orgId, groupId, screenId, {});

      expect(result.groupId).toBe(groupId);
      expect(result.gridRow).toBeNull();
      expect(result.gridColumn).toBeNull();
    });

    it('should assign a screen to a split-mode group with grid position', async () => {
      repository.findOne.mockResolvedValue({ ...mockGroup });
      screenRepository.findOne
        .mockResolvedValueOnce({ ...mockScreen }) // findOne for the screen
        .mockResolvedValueOnce(null); // findOne for cell occupancy check
      screenRepository.save.mockImplementation(async (s: Screen) => s);

      const result = await service.assignScreen(orgId, groupId, screenId, {
        gridRow: 0,
        gridColumn: 1,
      });

      expect(result.groupId).toBe(groupId);
      expect(result.gridRow).toBe(0);
      expect(result.gridColumn).toBe(1);
    });

    it('should throw NotFoundException when screen not found', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignScreen(orgId, groupId, screenId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when screen belongs to another group', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.findOne.mockResolvedValue({
        ...mockScreen,
        groupId: 'other-group-id',
      });

      await expect(
        service.assignScreen(orgId, groupId, screenId, {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when split-mode group lacks grid position', async () => {
      repository.findOne.mockResolvedValue({ ...mockGroup });
      screenRepository.findOne.mockResolvedValue({ ...mockScreen });

      await expect(
        service.assignScreen(orgId, groupId, screenId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when grid cell is already occupied', async () => {
      repository.findOne.mockResolvedValue({ ...mockGroup });
      const existingScreen = { ...mockScreen };
      const occupyingScreen = {
        ...mockScreen,
        id: 'other-screen-id',
        name: 'Other Screen',
      };
      screenRepository.findOne
        .mockResolvedValueOnce(existingScreen)
        .mockResolvedValueOnce(occupyingScreen);

      await expect(
        service.assignScreen(orgId, groupId, screenId, {
          gridRow: 0,
          gridColumn: 0,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow re-assigning a screen to the same group (idempotent)', async () => {
      repository.findOne.mockResolvedValue({ ...mockGroup });
      screenRepository.findOne
        .mockResolvedValueOnce({ ...mockScreen, groupId }) // screen already in this group
        .mockResolvedValueOnce(null); // no cell conflict
      screenRepository.save.mockImplementation(async (s: Screen) => s);

      const result = await service.assignScreen(orgId, groupId, screenId, {
        gridRow: 1,
        gridColumn: 0,
      });

      expect(result.groupId).toBe(groupId);
      expect(result.gridRow).toBe(1);
    });

    it('should throw NotFoundException when group not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.assignScreen(orgId, groupId, screenId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeScreen', () => {
    const screenId = '770e8400-e29b-41d4-a716-446655440000';
    const mockScreen: Screen = {
      id: screenId,
      organisationId: orgId,
      name: 'Lobby Display',
      resolution: '1920x1080',
      location: 'Lobby',
      apiKeyHash: 'hash',
      lastHeartbeat: null,
      isOnline: false,
      groupId: groupId,
      group: null,
      gridRow: 0,
      gridColumn: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      organisation: {} as Organisation,
    };

    it('should remove a screen from the group and clear grid position', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.findOne.mockResolvedValue({ ...mockScreen });
      screenRepository.save.mockImplementation(async (s: Screen) => s);

      const result = await service.removeScreen(orgId, groupId, screenId);

      expect(result.groupId).toBeNull();
      expect(result.gridRow).toBeNull();
      expect(result.gridColumn).toBeNull();
    });

    it('should throw NotFoundException when screen not in group', async () => {
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeScreen(orgId, groupId, screenId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when group not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.removeScreen(orgId, groupId, screenId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject cross-org removal (screen in different org)', async () => {
      const otherOrgId = '990e8400-e29b-41d4-a716-446655440000';
      repository.findOne.mockResolvedValue(null); // findOne scoped to otherOrgId won't find the group

      await expect(
        service.removeScreen(otherOrgId, groupId, screenId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignScreen — cross-org rejection', () => {
    const screenId = '770e8400-e29b-41d4-a716-446655440000';

    it('should reject assignment when screen belongs to different organisation', async () => {
      const otherOrgId = '990e8400-e29b-41d4-a716-446655440000';
      // Group won't be found when scoped to the wrong org
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.assignScreen(otherOrgId, groupId, screenId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('audit events', () => {
    it('should emit audit event on group creation', async () => {
      const dto = {
        name: 'Audit Test',
        mode: ScreenGroupMode.Mirror,
      };
      const mirrorGroup = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
        name: 'Audit Test',
      };
      repository.create.mockReturnValue(mirrorGroup);
      repository.save.mockResolvedValue(mirrorGroup);

      await service.createGroup(orgId, dto, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'audit.group.created',
        expect.objectContaining({
          groupId: groupId,
          organisationId: orgId,
          userId: 'user-1',
        }),
      );
    });

    it('should emit mode_changed event when mode changes', async () => {
      const existing = { ...mockGroup, mode: ScreenGroupMode.Split };
      repository.findOne.mockResolvedValue(existing);
      repository.save.mockImplementation(async (e) => e);

      await service.updateGroup(
        orgId,
        groupId,
        {
          mode: ScreenGroupMode.Mirror,
        },
        'user-1',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'audit.group.mode_changed',
        expect.objectContaining({
          groupId: groupId,
          details: expect.objectContaining({
            previousMode: ScreenGroupMode.Split,
            newMode: ScreenGroupMode.Mirror,
          }),
        }),
      );
    });

    it('should emit audit event on group deletion', async () => {
      repository.findOne.mockResolvedValue({ ...mockGroup });
      screenRepository.count.mockResolvedValue(0);
      repository.remove.mockResolvedValue(undefined);

      await service.removeGroup(orgId, groupId, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'audit.group.deleted',
        expect.objectContaining({
          groupId: groupId,
          organisationId: orgId,
        }),
      );
    });

    it('should emit audit event on screen assignment', async () => {
      const screenId = '770e8400-e29b-41d4-a716-446655440000';
      const mirrorGroup = {
        ...mockGroup,
        mode: ScreenGroupMode.Mirror,
        gridColumns: null,
        gridRows: null,
      };
      repository.findOne.mockResolvedValue(mirrorGroup);
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: orgId,
        name: 'Lobby',
        groupId: null,
        gridRow: null,
        gridColumn: null,
      });
      screenRepository.save.mockImplementation(async (s: Screen) => s);

      await service.assignScreen(orgId, groupId, screenId, {}, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'audit.group.screen_added',
        expect.objectContaining({
          groupId: groupId,
          details: expect.objectContaining({ screenId }),
        }),
      );
    });

    it('should emit audit event on screen removal', async () => {
      const screenId = '770e8400-e29b-41d4-a716-446655440000';
      repository.findOne.mockResolvedValue(mockGroup);
      screenRepository.findOne.mockResolvedValue({
        id: screenId,
        organisationId: orgId,
        name: 'Lobby',
        groupId: groupId,
        gridRow: 0,
        gridColumn: 0,
      });
      screenRepository.save.mockImplementation(async (s: Screen) => s);

      await service.removeScreen(orgId, groupId, screenId, 'user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'audit.group.screen_removed',
        expect.objectContaining({
          groupId: groupId,
          details: expect.objectContaining({ screenId }),
        }),
      );
    });
  });
});
