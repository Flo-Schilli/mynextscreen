import { Test, TestingModule } from '@nestjs/testing';
import { ScreenGroupController } from './screen-group.controller';
import { ScreenGroupService } from './screen-group.service';
import type { ScreenGroup, Screen } from '../db/schema';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';

describe('ScreenGroupController', () => {
  let controller: ScreenGroupController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const groupId = '660e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const mockReq = {
    user: { userId, email: 'test@test.com' },
  } as AuthenticatedRequest;

  const mockGroup: ScreenGroup = {
    id: groupId,
    organisationId: orgId,
    name: 'Video Wall',
    mode: ScreenGroupMode.Split,
    gridColumns: 2,
    gridRows: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      createGroup: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateGroup: jest.fn(),
      removeGroup: jest.fn(),
      assignScreen: jest.fn(),
      removeScreen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenGroupController],
      providers: [{ provide: ScreenGroupService, useValue: service }],
    }).compile();

    controller = module.get<ScreenGroupController>(ScreenGroupController);
  });

  describe('create', () => {
    it('should call createGroup with organisationId and dto', async () => {
      const dto = {
        name: 'Video Wall',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 2,
      };
      service.createGroup.mockResolvedValue(mockGroup);

      const result = await controller.create(orgId, dto, mockReq);

      expect(service.createGroup).toHaveBeenCalledWith(orgId, dto, userId);
      expect(result).toEqual(mockGroup);
    });
  });

  describe('findAll', () => {
    it('should return all groups for the organisation', async () => {
      service.findAll.mockResolvedValue([mockGroup]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([mockGroup]);
    });
  });

  describe('findOne', () => {
    it('should return a single group by id', async () => {
      service.findOne.mockResolvedValue(mockGroup);

      const result = await controller.findOne(orgId, groupId);

      expect(service.findOne).toHaveBeenCalledWith(orgId, groupId);
      expect(result).toEqual(mockGroup);
    });
  });

  describe('update', () => {
    it('should call updateGroup with organisationId, id, and dto', async () => {
      const dto = { name: 'Updated Wall' };
      const updated = { ...mockGroup, name: 'Updated Wall' };
      service.updateGroup.mockResolvedValue(updated);

      const result = await controller.update(orgId, groupId, dto, mockReq);

      expect(service.updateGroup).toHaveBeenCalledWith(orgId, groupId, dto, userId);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call removeGroup with organisationId and id', async () => {
      service.removeGroup.mockResolvedValue(undefined);

      await controller.remove(orgId, groupId, mockReq);

      expect(service.removeGroup).toHaveBeenCalledWith(orgId, groupId, userId);
    });
  });

  describe('assignScreen', () => {
    const screenId = '770e8400-e29b-41d4-a716-446655440000';
    const mockScreen = {
      id: screenId,
      organisationId: orgId,
      groupId,
      gridRow: 0,
      gridColumn: 1,
    } as Screen;

    it('should call assignScreen with all parameters', async () => {
      const dto = { gridRow: 0, gridColumn: 1 };
      service.assignScreen.mockResolvedValue(mockScreen);

      const result = await controller.assignScreen(orgId, groupId, screenId, dto, mockReq);

      expect(service.assignScreen).toHaveBeenCalledWith(orgId, groupId, screenId, dto, userId);
      expect(result).toEqual(mockScreen);
    });
  });

  describe('removeScreen', () => {
    const screenId = '770e8400-e29b-41d4-a716-446655440000';
    const mockScreen = {
      id: screenId,
      organisationId: orgId,
      groupId: null,
      gridRow: null,
      gridColumn: null,
    } as unknown as Screen;

    it('should call removeScreen with organisationId, groupId, and screenId', async () => {
      service.removeScreen.mockResolvedValue(mockScreen);

      const result = await controller.removeScreen(orgId, groupId, screenId, mockReq);

      expect(service.removeScreen).toHaveBeenCalledWith(orgId, groupId, screenId, userId);
      expect(result).toEqual(mockScreen);
    });
  });
});
