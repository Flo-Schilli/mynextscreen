import { Test, TestingModule } from '@nestjs/testing';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { AuthenticatedRequest } from '../auth';
import { ScreenSessionService } from './screen-session.service';

describe('ScreenController — bulk endpoints', () => {
  let controller: ScreenController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId1 = '770e8400-e29b-41d4-a716-446655440001';
  const screenId2 = '770e8400-e29b-41d4-a716-446655440002';
  const screenId3 = '770e8400-e29b-41d4-a716-446655440003';
  const groupId = '880e8400-e29b-41d4-a716-446655440000';

  const mockReq = {
    user: { userId, email: 'test@example.com' },
  } as unknown as AuthenticatedRequest;

  let sessionService: Record<string, jest.Mock>;

  beforeEach(async () => {
    service = {
      createScreen: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateScreen: jest.fn(),
      regenerateApiKey: jest.fn(),
      recordHeartbeat: jest.fn(),
      bulkDelete: jest.fn(),
      bulkAssignGroup: jest.fn(),
    };

    const screenStateService = {
      getRenderedState: jest.fn(),
      subscribe: jest.fn(),
    };

    sessionService = {
      createSession: jest.fn(),
      refresh: jest.fn(),
      revokeForScreen: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenController],
      providers: [
        { provide: ScreenService, useValue: service },
        { provide: ScreenStateService, useValue: screenStateService },
        { provide: ScreenSessionService, useValue: sessionService },
      ],
    }).compile();

    controller = module.get<ScreenController>(ScreenController);
  });

  describe('bulkDelete', () => {
    it('should call service.bulkDelete with correct args', async () => {
      service.bulkDelete.mockResolvedValue({ deleted: 2, notFound: [] });

      const result = await controller.bulkDelete(orgId, { ids: [screenId1, screenId2] }, mockReq);

      expect(service.bulkDelete).toHaveBeenCalledWith(orgId, [screenId1, screenId2], userId);
      expect(result).toEqual({ deleted: 2, notFound: [] });
    });

    it('should return notFound IDs for screens that do not exist', async () => {
      service.bulkDelete.mockResolvedValue({
        deleted: 1,
        notFound: [screenId3],
      });

      const result = await controller.bulkDelete(orgId, { ids: [screenId1, screenId3] }, mockReq);

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([screenId3]);
    });
  });

  describe('bulkAssignGroup', () => {
    it('should call service.bulkAssignGroup with a groupId', async () => {
      service.bulkAssignGroup.mockResolvedValue({ updated: 2, notFound: [] });

      const result = await controller.bulkAssignGroup(
        orgId,
        { ids: [screenId1, screenId2], groupId },
        mockReq,
      );

      expect(service.bulkAssignGroup).toHaveBeenCalledWith(
        orgId,
        [screenId1, screenId2],
        groupId,
        userId,
      );
      expect(result).toEqual({ updated: 2, notFound: [] });
    });

    it('should call service.bulkAssignGroup with null groupId to unassign', async () => {
      service.bulkAssignGroup.mockResolvedValue({ updated: 1, notFound: [] });

      const result = await controller.bulkAssignGroup(
        orgId,
        { ids: [screenId1], groupId: null },
        mockReq,
      );

      expect(service.bulkAssignGroup).toHaveBeenCalledWith(orgId, [screenId1], null, userId);
      expect(result.updated).toBe(1);
    });

    it('should return notFound IDs for screens that do not exist', async () => {
      service.bulkAssignGroup.mockResolvedValue({
        updated: 1,
        notFound: [screenId2],
      });

      const result = await controller.bulkAssignGroup(
        orgId,
        { ids: [screenId1, screenId2], groupId },
        mockReq,
      );

      expect(result.notFound).toEqual([screenId2]);
    });
  });
});
