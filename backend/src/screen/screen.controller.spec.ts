import { Test, TestingModule } from '@nestjs/testing';
import { ScreenController } from './screen.controller';
import { ScreenService } from './screen.service';
import { ScreenStateService } from './screen-state.service';
import { Screen } from './screen.entity';
import { Organisation } from '../organisation/organisation.entity';
import { ScreenAuthenticatedRequest } from '../auth';

describe('ScreenController', () => {
  let controller: ScreenController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';

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
    organisation: {} as Organisation,
    groupId: null,
    group: null,
    gridRow: null,
    gridColumn: null,
  };

  beforeEach(async () => {
    service = {
      createScreen: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateScreen: jest.fn(),
      regenerateApiKey: jest.fn(),
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
    it('should create a screen and return it with the API key', async () => {
      const dto = {
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
      };
      service.createScreen.mockResolvedValue({
        screen: mockScreen,
        apiKey: 'plaintext-key',
      });

      const result = await controller.create(orgId, dto);

      expect(service.createScreen).toHaveBeenCalledWith(orgId, dto);
      expect(result.screen).toEqual(mockScreen);
      expect(result.apiKey).toBe('plaintext-key');
    });
  });

  describe('findAll', () => {
    it('should return all screens for the organisation', async () => {
      service.findAll.mockResolvedValue([mockScreen]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([mockScreen]);
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

  describe('regenerateKey', () => {
    it('should regenerate the API key and return it', async () => {
      service.regenerateApiKey.mockResolvedValue({
        screen: mockScreen,
        apiKey: 'new-plaintext-key',
      });

      const result = await controller.regenerateKey(orgId, screenId);

      expect(service.regenerateApiKey).toHaveBeenCalledWith(orgId, screenId);
      expect(result.apiKey).toBe('new-plaintext-key');
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
