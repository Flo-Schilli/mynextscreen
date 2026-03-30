import { Test, TestingModule } from '@nestjs/testing';
import { ScreenGroupController } from './screen-group.controller';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroup } from './screen-group.entity';
import { ScreenGroupMode } from './screen-group-mode.enum';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';

describe('ScreenGroupController', () => {
  let controller: ScreenGroupController;
  let service: Record<string, jest.Mock>;

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

      const result = await controller.create(orgId, dto);

      expect(service.createGroup).toHaveBeenCalledWith(orgId, dto);
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

      const result = await controller.update(orgId, groupId, dto);

      expect(service.updateGroup).toHaveBeenCalledWith(orgId, groupId, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call removeGroup with organisationId and id', async () => {
      service.removeGroup.mockResolvedValue(undefined);

      await controller.remove(orgId, groupId);

      expect(service.removeGroup).toHaveBeenCalledWith(orgId, groupId);
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

      const result = await controller.assignScreen(orgId, groupId, screenId, dto);

      expect(service.assignScreen).toHaveBeenCalledWith(orgId, groupId, screenId, dto);
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

      const result = await controller.removeScreen(orgId, groupId, screenId);

      expect(service.removeScreen).toHaveBeenCalledWith(orgId, groupId, screenId);
      expect(result).toEqual(mockScreen);
    });
  });
});
