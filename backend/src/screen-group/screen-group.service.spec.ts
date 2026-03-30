import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroup } from './screen-group.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { Screen } from '../screen/screen.entity';
import { Organisation } from '../organisation/organisation.entity';

describe('ScreenGroupService', () => {
  let service: ScreenGroupService;
  let repository: Record<string, jest.Mock>;
  let screenRepository: Record<string, jest.Mock>;

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
    };

    service = new ScreenGroupService(
      repository as unknown as Repository<ScreenGroup>,
      screenRepository as unknown as Repository<Screen>,
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
});
