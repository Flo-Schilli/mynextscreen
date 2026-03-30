import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScreenService } from './screen.service';
import { Screen } from './screen.entity';
import { Organisation } from '../organisation/organisation.entity';
import { SCREEN_STATUS_CHANGED } from './screen-status.event';
import * as apiKeyUtil from './api-key.util';

jest.mock('./api-key.util');

const mockedApiKeyUtil = apiKeyUtil as jest.Mocked<typeof apiKeyUtil>;

describe('ScreenService', () => {
  let service: ScreenService;
  let repository: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };

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
  };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    eventEmitter = { emit: jest.fn() };

    service = new ScreenService(
      repository as unknown as import('typeorm').Repository<Screen>,
      eventEmitter as unknown as EventEmitter2,
    );

    mockedApiKeyUtil.generateApiKey.mockReturnValue('test-api-key-plaintext');
    mockedApiKeyUtil.hashApiKey.mockResolvedValue('$2b$10$hashedvalue');
  });

  describe('createScreen', () => {
    it('should create a screen with a generated API key', async () => {
      const dto = {
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
      };
      repository.create.mockReturnValue(mockScreen);
      repository.save.mockResolvedValue(mockScreen);

      const result = await service.createScreen(orgId, dto);

      expect(mockedApiKeyUtil.generateApiKey).toHaveBeenCalled();
      expect(mockedApiKeyUtil.hashApiKey).toHaveBeenCalledWith(
        'test-api-key-plaintext',
      );
      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        resolution: dto.resolution,
        location: dto.location,
        apiKeyHash: '$2b$10$hashedvalue',
        organisationId: orgId,
      });
      expect(result.screen).toEqual(mockScreen);
      expect(result.apiKey).toBe('test-api-key-plaintext');
    });
  });

  describe('findAll', () => {
    it('should return all screens for the organisation', async () => {
      repository.find.mockResolvedValue([mockScreen]);

      const result = await service.findAll(orgId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { organisationId: orgId },
      });
      expect(result).toEqual([mockScreen]);
    });

    it('should return empty array when no screens exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll(orgId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a screen by id scoped to organisation', async () => {
      repository.findOne.mockResolvedValue(mockScreen);

      const result = await service.findOne(orgId, screenId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId, id: screenId },
      });
      expect(result).toEqual(mockScreen);
    });

    it('should throw NotFoundException when screen not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(orgId, screenId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateScreen', () => {
    it('should update screen fields', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { ...mockScreen, name: 'Updated Name' };
      repository.findOne.mockResolvedValue({ ...mockScreen });
      repository.save.mockResolvedValue(updated);

      const result = await service.updateScreen(orgId, screenId, dto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { organisationId: orgId, id: screenId },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when screen not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateScreen(orgId, screenId, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateApiKey', () => {
    it('should generate a new API key and hash it', async () => {
      repository.findOne.mockResolvedValue({ ...mockScreen });
      repository.save.mockResolvedValue({
        ...mockScreen,
        apiKeyHash: '$2b$10$hashedvalue',
      });

      const result = await service.regenerateApiKey(orgId, screenId);

      expect(mockedApiKeyUtil.generateApiKey).toHaveBeenCalled();
      expect(mockedApiKeyUtil.hashApiKey).toHaveBeenCalledWith(
        'test-api-key-plaintext',
      );
      expect(result.apiKey).toBe('test-api-key-plaintext');
      expect(result.screen).toBeDefined();
    });

    it('should throw NotFoundException when screen not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.regenerateApiKey(orgId, screenId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordHeartbeat', () => {
    it('should update lastHeartbeat and set isOnline to true', async () => {
      const screen = { ...mockScreen, isOnline: false };
      repository.findOne.mockResolvedValue(screen);
      repository.save.mockImplementation(async (s) => s);

      const result = await service.recordHeartbeat(orgId, screenId);

      expect(result.lastHeartbeat).toBeInstanceOf(Date);
      expect(result.isOnline).toBe(true);
    });

    it('should emit status change event when screen was offline', async () => {
      const screen = { ...mockScreen, isOnline: false };
      repository.findOne.mockResolvedValue(screen);
      repository.save.mockImplementation(async (s) => s);

      await service.recordHeartbeat(orgId, screenId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SCREEN_STATUS_CHANGED,
        expect.objectContaining({
          screenId,
          organisationId: orgId,
          isOnline: true,
        }),
      );
    });

    it('should not emit status change event when screen was already online', async () => {
      const screen = { ...mockScreen, isOnline: true };
      repository.findOne.mockResolvedValue(screen);
      repository.save.mockImplementation(async (s) => s);

      await service.recordHeartbeat(orgId, screenId);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when screen not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.recordHeartbeat(orgId, screenId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('detectOfflineScreens', () => {
    it('should mark online screens as offline when heartbeat is stale', async () => {
      const staleScreens = [
        {
          ...mockScreen,
          isOnline: true,
          lastHeartbeat: new Date(Date.now() - 300_000),
        },
      ];
      repository.find.mockResolvedValue(staleScreens);
      repository.update.mockResolvedValue({ affected: 1 });

      const result = await service.detectOfflineScreens(120_000);

      expect(repository.find).toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith([screenId], {
        isOnline: false,
      });
      expect(result).toEqual(staleScreens);
    });

    it('should return empty array when no screens are stale', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.detectOfflineScreens(120_000);

      expect(result).toEqual([]);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
