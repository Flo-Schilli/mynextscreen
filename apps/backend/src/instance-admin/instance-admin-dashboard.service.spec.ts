import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InstanceAdminDashboardService } from './instance-admin-dashboard.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, users } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('InstanceAdminDashboardService', () => {
  let service: InstanceAdminDashboardService;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const config = {
      get: jest.fn((_key: string, fallback?: string) => fallback),
    } as unknown as ConfigService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstanceAdminDashboardService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(InstanceAdminDashboardService);
  });

  it('counts verified vs pending users', async () => {
    await db.insert(users).values([
      { email: 'v1@example.com', emailVerified: true },
      { email: 'v2@example.com', emailVerified: true },
      { email: 'p1@example.com', emailVerified: false },
    ]);

    const summary = await service.getSummary();

    expect(summary.users).toEqual({ total: 3, verified: 2, pending: 1 });
  });

  it('reports zero users when none exist', async () => {
    const summary = await service.getSummary();
    expect(summary.users).toEqual({ total: 0, verified: 0, pending: 0 });
  });

  it('aggregates organisation count and storage limits vs usage', async () => {
    await db.insert(organisations).values([
      {
        name: 'Org A',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 1000,
        storageTranscodedLimitBytes: 2000,
        storageOriginalUsedBytes: 100,
        storageTranscodedUsedBytes: 200,
      },
      {
        name: 'Org B',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 500,
        storageTranscodedLimitBytes: 700,
        storageOriginalUsedBytes: 50,
        storageTranscodedUsedBytes: 70,
      },
    ]);

    const summary = await service.getSummary();

    expect(summary.organisationCount).toBe(2);
    expect(summary.storage).toEqual({
      originalUsedBytes: 150,
      originalLimitBytes: 1500,
      transcodedUsedBytes: 270,
      transcodedLimitBytes: 2700,
    });
  });

  it('reports host disk free/total space for the media path', async () => {
    const summary = await service.getSummary();

    expect(summary.hostDisk.available).toBe(true);
    expect(summary.hostDisk.totalBytes).toBeGreaterThan(0);
    expect(summary.hostDisk.freeBytes).toBeGreaterThanOrEqual(0);
    expect(summary.hostDisk.freeBytes).toBeLessThanOrEqual(summary.hostDisk.totalBytes);
  });
});
