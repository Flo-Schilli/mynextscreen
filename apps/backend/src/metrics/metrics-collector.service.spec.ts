import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { MetricsCollectorService } from './metrics-collector.service';
import { SystemMetricsService, type SystemLoadSample } from './system-metrics.service';
import { DashboardSummaryService } from '../dashboard/dashboard-summary.service';
import { DRIZZLE } from '../db/database.constants';
import {
  contents,
  organisations,
  orgMetricSnapshots,
  playlists,
  screens,
  systemMetricSnapshots,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;
  let db: DrizzleDB;
  const sample: SystemLoadSample = {
    cpuPercent: 42,
    ramPercent: 63,
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
    const config = {
      get: jest.fn((_key: string, fallback?: number) => fallback),
    } as unknown as ConfigService;
    const systemMetrics = { read: jest.fn(() => sample) } as unknown as SystemMetricsService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsCollectorService,
        DashboardSummaryService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: config },
        { provide: SystemMetricsService, useValue: systemMetrics },
      ],
    }).compile();
    service = module.get(MetricsCollectorService);
  });

  async function seedOrg(name: string): Promise<string> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org.id;
  }

  it('captures one KPI snapshot per organisation matching the live summary', async () => {
    const orgId = await seedOrg('Acme');
    await db.insert(screens).values({
      organisationId: orgId,
      name: 'Lobby',
      resolution: '1920x1080',
      location: 'HQ',
      apiKeyHash: 'hash',
      isOnline: true,
      lastHeartbeat: new Date(),
    });
    await db.insert(contents).values({
      organisationId: orgId,
      title: 'Clip',
      type: ContentType.Video,
      originalFilename: 'clip.mp4',
      originalMimeType: 'video/mp4',
      originalSizeBytes: 1000,
      transcodingStatus: TranscodingStatus.Completed,
    });
    await db.insert(playlists).values({ organisationId: orgId, name: 'Mix' });

    await service.captureSnapshots();

    const rows = await db
      .select()
      .from(orgMetricSnapshots)
      .where(eq(orgMetricSnapshots.organisationId, orgId));
    expect(rows).toHaveLength(1);
    expect(rows[0].screensOnline).toBe(1);
    expect(rows[0].contentCount).toBe(1);
    expect(rows[0].playlistCount).toBe(1);
    expect(rows[0].openAlerts).toBe(0);
  });

  it('captures a single host-load snapshot from the system metrics service', async () => {
    await seedOrg('Acme');

    await service.captureSnapshots();

    const rows = await db.select().from(systemMetricSnapshots);
    expect(rows).toHaveLength(1);
    expect(rows[0].cpuPercent).toBe(42);
    expect(rows[0].ramPercent).toBe(63);
  });

  it('captures a host-load snapshot even when no organisations exist', async () => {
    await service.captureSnapshots();

    expect(await db.select().from(orgMetricSnapshots)).toHaveLength(0);
    expect(await db.select().from(systemMetricSnapshots)).toHaveLength(1);
  });

  it('prunes snapshots older than the retention window', async () => {
    const orgId = await seedOrg('Acme');
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recent = new Date();
    await db.insert(orgMetricSnapshots).values([
      { organisationId: orgId, capturedAt: old, screensOnline: 1 },
      { organisationId: orgId, capturedAt: recent, screensOnline: 2 },
    ]);
    await db.insert(systemMetricSnapshots).values([
      { capturedAt: old, cpuPercent: 10, ramPercent: 20 },
      { capturedAt: recent, cpuPercent: 30, ramPercent: 40 },
    ]);

    await service.cleanupOld();

    const orgRows = await db.select().from(orgMetricSnapshots);
    const sysRows = await db.select().from(systemMetricSnapshots);
    expect(orgRows).toHaveLength(1);
    expect(orgRows[0].screensOnline).toBe(2);
    expect(sysRows).toHaveLength(1);
    expect(sysRows[0].cpuPercent).toBe(30);
  });
});
