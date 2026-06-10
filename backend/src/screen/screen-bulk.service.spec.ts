import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScreenService } from './screen.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, screenGroups, type Organisation, type Screen } from '../db/schema';
import {
  AUDIT_SCREEN_BULK_DELETED,
  AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
} from '../audit-log/audit.events';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

const MISSING_ID = '00000000-0000-0000-0000-000000000000';

describe('ScreenService — bulk operations', () => {
  let service: ScreenService;
  let db: DrizzleDB;
  let emit: jest.Mock;

  const userId = '660e8400-e29b-41d4-a716-446655440000';

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
  });

  async function seedOrg(): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    return org;
  }

  async function seedScreen(organisationId: string, name = 'Screen'): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId,
        name,
        resolution: '1920x1080',
        location: 'Test',
        apiKeyHash: '$2b$10$hash',
      })
      .returning();
    return screen;
  }

  async function seedGroup(organisationId: string): Promise<string> {
    const [group] = await db
      .insert(screenGroups)
      .values({ organisationId, name: 'Group' })
      .returning();
    return group.id;
  }

  describe('bulkDelete', () => {
    it('should delete all found screens and return count', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);
      const b = await seedScreen(org.id);

      const result = await service.bulkDelete(org.id, [a.id, b.id], userId);

      expect(result.deleted).toBe(2);
      expect(result.notFound).toEqual([]);
      const remaining = await db.select().from(screens).where(eq(screens.organisationId, org.id));
      expect(remaining).toHaveLength(0);
    });

    it('should return notFound IDs for screens that do not exist anywhere', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);

      const result = await service.bulkDelete(org.id, [a.id, MISSING_ID], userId);

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([MISSING_ID]);
    });

    it('should throw BadRequestException when IDs belong to another org', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const a = await seedScreen(org.id);
      const foreign = await seedScreen(other.id);

      await expect(service.bulkDelete(org.id, [a.id, foreign.id], userId)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.bulkDelete(org.id, [a.id, foreign.id], userId);
      } catch (err: unknown) {
        expect((err as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({ foreignIds: [foreign.id] }),
        );
      }
    });

    it('should emit one audit event per deleted screen', async () => {
      const org = await seedOrg();
      const a = await seedScreen(org.id);
      const b = await seedScreen(org.id);

      await service.bulkDelete(org.id, [a.id, b.id], userId);

      expect(emit).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_BULK_DELETED,
        expect.objectContaining({
          screenId: a.id,
          organisationId: org.id,
          userId,
          details: { bulkOperationSize: 2 },
        }),
      );
      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_BULK_DELETED,
        expect.objectContaining({
          screenId: b.id,
          organisationId: org.id,
          userId,
          details: { bulkOperationSize: 2 },
        }),
      );
    });

    it('should handle empty found set gracefully', async () => {
      const org = await seedOrg();

      const result = await service.bulkDelete(org.id, [MISSING_ID], userId);

      expect(result.deleted).toBe(0);
      expect(result.notFound).toEqual([MISSING_ID]);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('bulkAssignGroup', () => {
    it('should assign all found screens to the group', async () => {
      const org = await seedOrg();
      const groupId = await seedGroup(org.id);
      const a = await seedScreen(org.id);
      const b = await seedScreen(org.id);

      const result = await service.bulkAssignGroup(org.id, [a.id, b.id], groupId, userId);

      expect(result.updated).toBe(2);
      expect(result.notFound).toEqual([]);
      const rows = await db.select().from(screens).where(eq(screens.organisationId, org.id));
      expect(rows.every((s) => s.groupId === groupId)).toBe(true);
    });

    it('should set groupId to null to unassign screens', async () => {
      const org = await seedOrg();
      const groupId = await seedGroup(org.id);
      const a = await seedScreen(org.id);
      await db.update(screens).set({ groupId }).where(eq(screens.id, a.id));

      const result = await service.bulkAssignGroup(org.id, [a.id], null, userId);

      expect(result.updated).toBe(1);
      const [row] = await db.select().from(screens).where(eq(screens.id, a.id));
      expect(row.groupId).toBeNull();
    });

    it('should return notFound IDs for screens that do not exist', async () => {
      const org = await seedOrg();
      const groupId = await seedGroup(org.id);
      const a = await seedScreen(org.id);

      const result = await service.bulkAssignGroup(org.id, [a.id, MISSING_ID], groupId, userId);

      expect(result.updated).toBe(1);
      expect(result.notFound).toEqual([MISSING_ID]);
    });

    it('should throw BadRequestException when IDs belong to another org', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const groupId = await seedGroup(org.id);
      const a = await seedScreen(org.id);
      const foreign = await seedScreen(other.id);

      await expect(
        service.bulkAssignGroup(org.id, [a.id, foreign.id], groupId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit one audit event per updated screen', async () => {
      const org = await seedOrg();
      const groupId = await seedGroup(org.id);
      const a = await seedScreen(org.id);
      const b = await seedScreen(org.id);

      await service.bulkAssignGroup(org.id, [a.id, b.id], groupId, userId);

      expect(emit).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_SCREEN_BULK_GROUP_ASSIGNED,
        expect.objectContaining({
          screenId: a.id,
          organisationId: org.id,
          userId,
          details: { bulkOperationSize: 2, groupId },
        }),
      );
    });

    it('should not call update when no screens found', async () => {
      const org = await seedOrg();
      const groupId = await seedGroup(org.id);

      const result = await service.bulkAssignGroup(org.id, [MISSING_ID], groupId, userId);

      expect(result.updated).toBe(0);
      expect(result.notFound).toEqual([MISSING_ID]);
      expect(emit).not.toHaveBeenCalled();
    });
  });
});
