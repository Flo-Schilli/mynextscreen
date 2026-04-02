import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScreenService } from './screen.service';
import { Screen } from './screen.entity';
import { Organisation } from '../organisation/organisation.entity';
import {
  AUDIT_SCREEN_BULK_DELETED,
  AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
} from '../audit-log/audit.events';
import * as apiKeyUtil from './api-key.util';

jest.mock('./api-key.util');

const mockedApiKeyUtil = apiKeyUtil as jest.Mocked<typeof apiKeyUtil>;

describe('ScreenService — bulk operations', () => {
  let service: ScreenService;
  let repository: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOrgId = '550e8400-e29b-41d4-a716-446655440099';
  const userId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId1 = '770e8400-e29b-41d4-a716-446655440001';
  const screenId2 = '770e8400-e29b-41d4-a716-446655440002';
  const screenId3 = '770e8400-e29b-41d4-a716-446655440003';
  const groupId = '880e8400-e29b-41d4-a716-446655440000';

  const makeScreen = (id: string, orgIdOverride?: string): Screen => ({
    id,
    organisationId: orgIdOverride ?? orgId,
    name: `Screen ${id.slice(-1)}`,
    resolution: '1920x1080',
    location: 'Test',
    apiKeyHash: '$2b$10$hash',
    lastHeartbeat: null,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
    groupId: null,
    group: null,
    gridRow: null,
    gridColumn: null,
  });

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

    mockedApiKeyUtil.generateApiKey.mockReturnValue('test-key');
    mockedApiKeyUtil.hashApiKey.mockResolvedValue('$2b$10$hash');
  });

  describe('bulkDelete', () => {
    it('should delete all found screens and return count', async () => {
      const screens = [makeScreen(screenId1), makeScreen(screenId2)];
      repository.find.mockResolvedValue(screens);
      repository.remove.mockResolvedValue(screens);

      const result = await service.bulkDelete(
        orgId,
        [screenId1, screenId2],
        userId,
      );

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          id: expect.objectContaining({
            _type: 'in',
            _value: [screenId1, screenId2],
          }),
          organisationId: orgId,
        },
      });
      expect(repository.remove).toHaveBeenCalledWith(screens);
      expect(result.deleted).toBe(2);
      expect(result.notFound).toEqual([]);
    });

    it('should return notFound IDs for screens that do not exist anywhere', async () => {
      const screens = [makeScreen(screenId1)];
      repository.find.mockResolvedValue(screens);
      repository.findOne.mockResolvedValue(null); // screenId2 not found anywhere
      repository.remove.mockResolvedValue(screens);

      const result = await service.bulkDelete(
        orgId,
        [screenId1, screenId2],
        userId,
      );

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([screenId2]);
    });

    it('should throw BadRequestException when IDs belong to another org', async () => {
      repository.find.mockResolvedValue([makeScreen(screenId1)]);
      // screenId2 exists but in another org
      repository.findOne.mockResolvedValue(makeScreen(screenId2, otherOrgId));

      await expect(
        service.bulkDelete(orgId, [screenId1, screenId2], userId),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.bulkDelete(orgId, [screenId1, screenId2], userId);
      } catch (err: unknown) {
        expect((err as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({ foreignIds: [screenId2] }),
        );
      }
    });

    it('should emit one audit event per deleted screen', async () => {
      const screens = [makeScreen(screenId1), makeScreen(screenId2)];
      repository.find.mockResolvedValue(screens);
      repository.remove.mockResolvedValue(screens);

      await service.bulkDelete(orgId, [screenId1, screenId2], userId);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_BULK_DELETED,
        expect.objectContaining({
          screenId: screenId1,
          organisationId: orgId,
          userId,
          details: { bulkOperationSize: 2 },
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_BULK_DELETED,
        expect.objectContaining({
          screenId: screenId2,
          organisationId: orgId,
          userId,
          details: { bulkOperationSize: 2 },
        }),
      );
    });

    it('should handle empty found set gracefully', async () => {
      repository.find.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      const result = await service.bulkDelete(orgId, [screenId1], userId);

      expect(result.deleted).toBe(0);
      expect(result.notFound).toEqual([screenId1]);
      expect(repository.remove).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('bulkAssignGroup', () => {
    it('should assign all found screens to the group', async () => {
      const screens = [makeScreen(screenId1), makeScreen(screenId2)];
      repository.find.mockResolvedValue(screens);
      repository.update.mockResolvedValue({ affected: 2 });

      const result = await service.bulkAssignGroup(
        orgId,
        [screenId1, screenId2],
        groupId,
        userId,
      );

      expect(repository.update).toHaveBeenCalledWith([screenId1, screenId2], {
        groupId,
      });
      expect(result.updated).toBe(2);
      expect(result.notFound).toEqual([]);
    });

    it('should set groupId to null to unassign screens', async () => {
      const screens = [makeScreen(screenId1)];
      repository.find.mockResolvedValue(screens);
      repository.update.mockResolvedValue({ affected: 1 });

      const result = await service.bulkAssignGroup(
        orgId,
        [screenId1],
        null,
        userId,
      );

      expect(repository.update).toHaveBeenCalledWith([screenId1], {
        groupId: null,
      });
      expect(result.updated).toBe(1);
    });

    it('should return notFound IDs for screens that do not exist', async () => {
      repository.find.mockResolvedValue([makeScreen(screenId1)]);
      repository.findOne.mockResolvedValue(null);
      repository.update.mockResolvedValue({ affected: 1 });

      const result = await service.bulkAssignGroup(
        orgId,
        [screenId1, screenId3],
        groupId,
        userId,
      );

      expect(result.updated).toBe(1);
      expect(result.notFound).toEqual([screenId3]);
    });

    it('should throw BadRequestException when IDs belong to another org', async () => {
      repository.find.mockResolvedValue([makeScreen(screenId1)]);
      repository.findOne.mockResolvedValue(makeScreen(screenId2, otherOrgId));

      await expect(
        service.bulkAssignGroup(orgId, [screenId1, screenId2], groupId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit one audit event per updated screen', async () => {
      const screens = [makeScreen(screenId1), makeScreen(screenId2)];
      repository.find.mockResolvedValue(screens);
      repository.update.mockResolvedValue({ affected: 2 });

      await service.bulkAssignGroup(
        orgId,
        [screenId1, screenId2],
        groupId,
        userId,
      );

      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
        expect.objectContaining({
          screenId: screenId1,
          organisationId: orgId,
          userId,
          details: { bulkOperationSize: 2, groupId },
        }),
      );
    });

    it('should not call update when no screens found', async () => {
      repository.find.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      const result = await service.bulkAssignGroup(
        orgId,
        [screenId1],
        groupId,
        userId,
      );

      expect(result.updated).toBe(0);
      expect(result.notFound).toEqual([screenId1]);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
