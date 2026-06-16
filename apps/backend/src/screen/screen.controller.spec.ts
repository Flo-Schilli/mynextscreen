import { Test, TestingModule } from '@nestjs/testing';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import type { Screen } from '../db/schema';
import { ScreenAuthenticatedRequest, AuthenticatedRequest } from '../auth';

describe('ScreenController', () => {
  let controller: ScreenController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const userReq = { user: { userId } } as unknown as AuthenticatedRequest;

  const mockScreen: Screen = {
    id: screenId,
    organisationId: orgId,
    name: 'Main Stage',
    resolution: '1920x1080',
    location: 'Stage Left',
    apiKeyHash: '$2b$10$hashedvalue',
    lastHeartbeat: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    groupId: null,
    gridRow: null,
    gridColumn: null,
  };

  beforeEach(async () => {
    service = {
      createScreen: jest.fn(),
      findAll: jest.fn(),
      findAllWithPlaylist: jest.fn(),
      findOne: jest.fn(),
      updateScreen: jest.fn(),
      repairScreen: jest.fn(),
      recordHeartbeat: jest.fn(),
    };

    const screenStateService = {
      getRenderedState: jest.fn(),
      subscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScreenController],
      providers: [
        { provide: ScreenService, useValue: service },
        { provide: ScreenStateService, useValue: screenStateService },
      ],
    }).compile();

    controller = module.get<ScreenController>(ScreenController);
  });

  describe('create', () => {
    it('should create a screen and return the screen only (no API key)', async () => {
      const dto = {
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
        pairingCode: '123456',
      };
      service.createScreen.mockResolvedValue(mockScreen);

      const result = await controller.create(orgId, dto, userReq);

      expect(service.createScreen).toHaveBeenCalledWith(orgId, dto, userId);
      expect(result).toEqual(mockScreen);
      expect((result as unknown as Record<string, unknown>).apiKey).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all screens enriched with the current playlist name', async () => {
      const enriched = { ...mockScreen, currentPlaylistName: 'Morning Loop' };
      service.findAllWithPlaylist.mockResolvedValue([enriched]);

      const result = await controller.findAll(orgId);

      expect(service.findAllWithPlaylist).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([enriched]);
    });
  });

  describe('findOne', () => {
    it('should return a single screen', async () => {
      service.findOne.mockResolvedValue(mockScreen);

      const result = await controller.findOne(orgId, screenId);

      expect(service.findOne).toHaveBeenCalledWith(orgId, screenId);
      expect(result).toEqual(mockScreen);
    });
  });

  describe('update', () => {
    it('should update screen fields', async () => {
      const dto = { name: 'Updated' };
      const updated = { ...mockScreen, name: 'Updated' };
      service.updateScreen.mockResolvedValue(updated);

      const result = await controller.update(orgId, screenId, dto);

      expect(service.updateScreen).toHaveBeenCalledWith(orgId, screenId, dto);
      expect(result.name).toBe('Updated');
    });
  });

  describe('repair', () => {
    it('should re-pair the screen and return the screen only', async () => {
      service.repairScreen.mockResolvedValue(mockScreen);

      const result = await controller.repair(orgId, screenId, { pairingCode: '123456' }, userReq);

      expect(service.repairScreen).toHaveBeenCalledWith(orgId, screenId, '123456', userId);
      expect(result).toEqual(mockScreen);
      expect((result as unknown as Record<string, unknown>).apiKey).toBeUndefined();
    });
  });

  describe('heartbeat', () => {
    it('should record a heartbeat for the screen', async () => {
      const onlineScreen = {
        ...mockScreen,
        isOnline: true,
        lastHeartbeat: new Date(),
      };
      service.recordHeartbeat.mockResolvedValue(onlineScreen);

      const req = {
        screenId,
        organisationId: orgId,
      } as unknown as ScreenAuthenticatedRequest;

      const result = await controller.heartbeat(req, screenId);

      expect(service.recordHeartbeat).toHaveBeenCalledWith(orgId, screenId);
      expect(result.isOnline).toBe(true);
      expect(result.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
});
