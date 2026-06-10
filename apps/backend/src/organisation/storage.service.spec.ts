import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { StorageService } from './storage.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, type Organisation } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('StorageService', () => {
  let service: StorageService;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<StorageService>(StorageService);
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  describe('checkOriginalLimit', () => {
    it('passes when within limit', async () => {
      const org = await seedOrg({ storageOriginalLimitBytes: 1000, storageOriginalUsedBytes: 100 });
      await expect(service.checkOriginalLimit(org.id, 500)).resolves.toBeUndefined();
    });

    it('throws when exceeding limit', async () => {
      const org = await seedOrg({ storageOriginalLimitBytes: 1000, storageOriginalUsedBytes: 900 });
      await expect(service.checkOriginalLimit(org.id, 200)).rejects.toThrow(BadRequestException);
    });

    it('is unlimited when limit is 0', async () => {
      const org = await seedOrg({ storageOriginalLimitBytes: 0 });
      await expect(service.checkOriginalLimit(org.id, 10 ** 12)).resolves.toBeUndefined();
    });

    it('throws NotFoundException for a missing org', async () => {
      await expect(
        service.checkOriginalLimit('00000000-0000-0000-0000-000000000000', 1),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkTranscodedLimit', () => {
    it('throws when exceeding limit', async () => {
      const org = await seedOrg({
        storageTranscodedLimitBytes: 1000,
        storageTranscodedUsedBytes: 900,
      });
      await expect(service.checkTranscodedLimit(org.id, 200)).rejects.toThrow(BadRequestException);
    });
  });

  describe('usage counters', () => {
    it('adds and subtracts original usage (clamped at 0)', async () => {
      const org = await seedOrg({ storageOriginalUsedBytes: 0 });
      await service.addOriginalUsage(org.id, 500);
      let [row] = await db.select().from(organisations).where(eq(organisations.id, org.id));
      expect(Number(row.storageOriginalUsedBytes)).toBe(500);

      await service.subtractOriginalUsage(org.id, 1000);
      [row] = await db.select().from(organisations).where(eq(organisations.id, org.id));
      expect(Number(row.storageOriginalUsedBytes)).toBe(0);
    });

    it('adds and subtracts transcoded usage', async () => {
      const org = await seedOrg({ storageTranscodedUsedBytes: 100 });
      await service.addTranscodedUsage(org.id, 50);
      await service.subtractTranscodedUsage(org.id, 30);
      const [row] = await db.select().from(organisations).where(eq(organisations.id, org.id));
      expect(Number(row.storageTranscodedUsedBytes)).toBe(120);
    });
  });

  describe('getStorageInfo', () => {
    it('returns all counters as numbers', async () => {
      const org = await seedOrg({
        storageOriginalLimitBytes: 10,
        storageTranscodedLimitBytes: 20,
        storageOriginalUsedBytes: 1,
        storageTranscodedUsedBytes: 2,
      });
      const info = await service.getStorageInfo(org.id);
      expect(info).toEqual({
        originalUsedBytes: 1,
        originalLimitBytes: 10,
        transcodedUsedBytes: 2,
        transcodedLimitBytes: 20,
      });
    });
  });
});
