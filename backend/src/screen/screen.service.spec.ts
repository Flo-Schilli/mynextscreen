import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScreenService } from './screen.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, type Organisation, type Screen } from '../db/schema';
import { SCREEN_STATUS_CHANGED } from './screen-status.event';
import {
  AUDIT_SCREEN_REGISTERED,
  AUDIT_SCREEN_ONLINE,
  AUDIT_SCREEN_BULK_DELETED,
  AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
} from '../audit-log/audit.events';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import * as apiKeyUtil from './api-key.util';

jest.mock('./api-key.util');

const mockedApiKeyUtil = apiKeyUtil as jest.Mocked<typeof apiKeyUtil>;

describe('ScreenService', () => {
  let service: ScreenService;
  let db: DrizzleDB;
  let emit: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<ScreenService>(ScreenService);

    mockedApiKeyUtil.generateApiKey.mockReturnValue('test-api-key-plaintext');
    mockedApiKeyUtil.hashApiKey.mockResolvedValue('$2b$10$hashedvalue');
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  async function seedScreen(
    organisationId: string,
    overrides: Partial<Screen> = {},
  ): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId,
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
        apiKeyHash: '$2b$10$existing',
        ...overrides,
      })
      .returning();
    return screen;
  }

  describe('createScreen', () => {
    it('should create a screen with a generated API key', async () => {
      const org = await seedOrg();
      const dto = {
        name: 'Main Stage',
        resolution: '1920x1080',
        location: 'Stage Left',
      };

      const result = await service.createScreen(org.id, dto);

      expect(mockedApiKeyUtil.generateApiKey).toHaveBeenCalled();
      expect(mockedApiKeyUtil.hashApiKey).toHaveBeenCalledWith('test-api-key-plaintext');
      expect(result.apiKey).toBe('test-api-key-plaintext');
      expect(result.screen.name).toBe(dto.name);
      expect(result.screen.organisationId).toBe(org.id);
      expect(result.screen.apiKeyHash).toBe('$2b$10$hashedvalue');

      const rows = await db.select().from(screens).where(eq(screens.id, result.screen.id));
      expect(rows).toHaveLength(1);
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_REGISTERED, expect.anything());
    });
  });

  describe('findAll', () => {
    it('should return all screens for the organisation', async () => {
      const org = await seedOrg();
      await seedScreen(org.id);

      const result = await service.findAll(org.id);

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no screens exist', async () => {
      const org = await seedOrg();
      const result = await service.findAll(org.id);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a screen by id scoped to organisation', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const result = await service.findOne(org.id, screen.id);

      expect(result.id).toBe(screen.id);
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(service.findOne(org.id, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateScreen', () => {
    it('should update screen fields', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { name: 'Before' });

      const result = await service.updateScreen(org.id, screen.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      const [row] = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(row.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(
        service.updateScreen(org.id, '00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('regenerateApiKey', () => {
    it('should generate a new API key and hash it', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id);

      const result = await service.regenerateApiKey(org.id, screen.id);

      expect(mockedApiKeyUtil.generateApiKey).toHaveBeenCalled();
      expect(mockedApiKeyUtil.hashApiKey).toHaveBeenCalledWith('test-api-key-plaintext');
      expect(result.apiKey).toBe('test-api-key-plaintext');
      const [row] = await db.select().from(screens).where(eq(screens.id, screen.id));
      expect(row.apiKeyHash).toBe('$2b$10$hashedvalue');
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(
        service.regenerateApiKey(org.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordHeartbeat', () => {
    it('should update lastHeartbeat and set isOnline to true', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: false });

      const result = await service.recordHeartbeat(org.id, screen.id);

      expect(result.lastHeartbeat).toBeInstanceOf(Date);
      expect(result.isOnline).toBe(true);
    });

    it('should emit status change event when screen was offline', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: false });

      await service.recordHeartbeat(org.id, screen.id);

      expect(emit).toHaveBeenCalledWith(
        SCREEN_STATUS_CHANGED,
        expect.objectContaining({
          screenId: screen.id,
          organisationId: org.id,
          isOnline: true,
        }),
      );
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_ONLINE, expect.anything());
    });

    it('should not emit status change event when screen was already online', async () => {
      const org = await seedOrg();
      const screen = await seedScreen(org.id, { isOnline: true });

      await service.recordHeartbeat(org.id, screen.id);

      expect(emit).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when screen not found', async () => {
      const org = await seedOrg();
      await expect(
        service.recordHeartbeat(org.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDelete', () => {
    it('deletes screens belonging to the organisation and emits audit events', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);
      const b = await seedScreen(org.id);

      const result = await service.bulkDelete(org.id, [a.id, b.id], 'user-1');

      expect(result.deleted).toBe(2);
      expect(result.notFound).toEqual([]);
      const remaining = await db.select().from(screens).where(eq(screens.organisationId, org.id));
      expect(remaining).toHaveLength(0);
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_BULK_DELETED, expect.anything());
    });

    it('reports notFound for unknown ids', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);

      const result = await service.bulkDelete(
        org.id,
        [a.id, '00000000-0000-0000-0000-000000000000'],
        null,
      );

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual(['00000000-0000-0000-0000-000000000000']);
    });

    it('throws BadRequestException when an id belongs to another organisation', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const foreign = await seedScreen(other.id);

      await expect(service.bulkDelete(org.id, [foreign.id], null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkAssignGroup', () => {
    it('assigns screens to a group', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);

      const result = await service.bulkAssignGroup(org.id, [a.id], null, 'user-1');

      expect(result.updated).toBe(1);
      expect(emit).toHaveBeenCalledWith(AUDIT_SCREEN_BULK_GROUP_ASSIGNED, expect.anything());
    });

    it('throws BadRequestException when an id belongs to another organisation', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const foreign = await seedScreen(other.id);

      await expect(service.bulkAssignGroup(org.id, [foreign.id], null, null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('detectOfflineScreens', () => {
    it('should mark online screens as offline when heartbeat is stale', async () => {
      const org = await seedOrg();
      const stale = await seedScreen(org.id, {
        isOnline: true,
        lastHeartbeat: new Date(Date.now() - 300_000),
      });

      const result = await service.detectOfflineScreens(120_000);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(stale.id);
      const [row] = await db.select().from(screens).where(eq(screens.id, stale.id));
      expect(row.isOnline).toBe(false);
    });

    it('should return empty array when no screens are stale', async () => {
      const org = await seedOrg();
      await seedScreen(org.id, { isOnline: true, lastHeartbeat: new Date() });

      const result = await service.detectOfflineScreens(120_000);

      expect(result).toEqual([]);
    });
  });
});
