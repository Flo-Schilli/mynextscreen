import { Test, TestingModule } from '@nestjs/testing';
import { MetricsQueryService } from './metrics-query.service';
import { SystemMetricsService, type SystemLoadSample } from './system-metrics.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, orgMetricSnapshots, systemMetricSnapshots } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

const HOUR_MS = 60 * 60 * 1000;

describe('MetricsQueryService', () => {
  let service: MetricsQueryService;
  let db: DrizzleDB;
  let orgId: string;
  const sample: SystemLoadSample = {
    cpuPercent: 0,
    ramPercent: 0,
    cores: 8,
    ramTotalBytes: 16 * 1e9,
  };

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const systemMetrics = { read: jest.fn(() => sample) } as unknown as SystemMetricsService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsQueryService,
        { provide: DRIZZLE, useValue: db },
        { provide: SystemMetricsService, useValue: systemMetrics },
      ],
    }).compile();
    service = module.get(MetricsQueryService);

    const [org] = await db
      .insert(organisations)
      .values({ name: 'Acme', timeZone: 'UTC' })
      .returning();
    orgId = org.id;
  });

  it('returns an empty series for an org with no snapshots', async () => {
    const history = await service.getOrgHistory(orgId);
    expect(history.points).toEqual([]);
  });

  it('averages snapshots within the same 15-minute bucket and aligns to it', async () => {
    const base = new Date('2026-06-15T10:00:00.000Z');
    await db.insert(orgMetricSnapshots).values([
      // Same 10:00–10:15 bucket → averaged.
      { organisationId: orgId, capturedAt: new Date('2026-06-15T10:02:00.000Z'), screensOnline: 2 },
      { organisationId: orgId, capturedAt: new Date('2026-06-15T10:12:00.000Z'), screensOnline: 4 },
      // Next 10:15–10:30 bucket.
      { organisationId: orgId, capturedAt: new Date('2026-06-15T10:20:00.000Z'), screensOnline: 6 },
    ]);

    const now = new Date(base.getTime() + HOUR_MS);
    const history = await service.getOrgHistory(orgId, now);

    expect(history.points).toHaveLength(2);
    // First bucket: avg(2,4) = 3; second bucket: 6.
    expect(history.points[0].screensOnline).toBe(3);
    expect(history.points[1].screensOnline).toBe(6);
    // Buckets are aligned to the 15-minute stride and ordered oldest-first.
    expect(history.points[0].capturedAt).toBe('2026-06-15T10:00:00.000Z');
    expect(history.points[1].capturedAt).toBe('2026-06-15T10:15:00.000Z');
  });

  it('excludes snapshots older than the 24h window', async () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    await db.insert(orgMetricSnapshots).values([
      // 30h ago — excluded.
      {
        organisationId: orgId,
        capturedAt: new Date(now.getTime() - 30 * HOUR_MS),
        screensOnline: 9,
      },
      // 2h ago — included.
      {
        organisationId: orgId,
        capturedAt: new Date(now.getTime() - 2 * HOUR_MS),
        screensOnline: 5,
      },
    ]);

    const history = await service.getOrgHistory(orgId, now);

    expect(history.points).toHaveLength(1);
    expect(history.points[0].screensOnline).toBe(5);
  });

  it('scopes history to the requested organisation', async () => {
    const [other] = await db
      .insert(organisations)
      .values({ name: 'Other', timeZone: 'UTC' })
      .returning();
    const now = new Date('2026-06-15T12:00:00.000Z');
    await db.insert(orgMetricSnapshots).values({
      organisationId: other.id,
      capturedAt: new Date(now.getTime() - HOUR_MS),
      screensOnline: 7,
    });

    const history = await service.getOrgHistory(orgId, now);
    expect(history.points).toEqual([]);
  });

  it('returns aligned cpu/ram series plus host descriptors for system load', async () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    await db.insert(systemMetricSnapshots).values([
      { capturedAt: new Date(now.getTime() - 2 * HOUR_MS), cpuPercent: 20, ramPercent: 50 },
      { capturedAt: new Date(now.getTime() - HOUR_MS), cpuPercent: 40, ramPercent: 60 },
    ]);

    const load = await service.getSystemLoad(now);

    expect(load.cpu).toEqual([20, 40]);
    expect(load.ram).toEqual([50, 60]);
    expect(load.cores).toBe(8);
    expect(load.ramTotalGB).toBe(16);
  });
});
