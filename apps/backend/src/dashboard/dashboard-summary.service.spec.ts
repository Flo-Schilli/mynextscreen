import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DashboardSummaryService } from './dashboard-summary.service';
import { DRIZZLE } from '../db/database.constants';
import { contents, organisations, playlists, scheduleEntries, screens } from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('DashboardSummaryService', () => {
  let service: DashboardSummaryService;
  let db: DrizzleDB;
  let orgId: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    // Offline threshold 120s → warning threshold 60s.
    const config = {
      get: jest.fn((_key: string, fallback?: number) => fallback),
    } as unknown as ConfigService;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardSummaryService,
        { provide: DRIZZLE, useValue: db },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(DashboardSummaryService);

    const [org] = await db
      .insert(organisations)
      .values({
        name: 'Acme',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 5_000_000_000,
        storageTranscodedLimitBytes: 5_000_000_000,
        storageOriginalUsedBytes: 3_200_000_000,
        storageTranscodedUsedBytes: 1_600_000_000,
      })
      .returning();
    orgId = org.id;
  });

  function insertScreen(overrides: {
    name: string;
    isOnline: boolean;
    lastHeartbeat: Date | null;
  }) {
    return db.insert(screens).values({
      organisationId: orgId,
      name: overrides.name,
      resolution: '1920x1080',
      location: 'HQ',
      apiKeyHash: 'hash',
      isOnline: overrides.isOnline,
      lastHeartbeat: overrides.lastHeartbeat,
    });
  }

  function insertContent(status: TranscodingStatus) {
    return db.insert(contents).values({
      organisationId: orgId,
      title: `Clip ${status}`,
      type: ContentType.Video,
      originalFilename: 'clip.mp4',
      originalMimeType: 'video/mp4',
      originalSizeBytes: 1000,
      transcodingStatus: status,
    });
  }

  it('reports an empty-but-valid summary for a fresh org', async () => {
    const summary = await service.getSummary(orgId);

    expect(summary.screens).toEqual({ total: 0, online: 0, offline: 0, warning: 0 });
    expect(summary.content.count).toBe(0);
    expect(summary.playlists.count).toBe(0);
    expect(summary.schedules.upcoming24h).toBe(0);
    expect(summary.alerts).toEqual([]);
  });

  it('mirrors organisation storage and derives library bytes from used storage', async () => {
    const summary = await service.getSummary(orgId);

    expect(summary.storage).toEqual({
      originalUsedBytes: 3_200_000_000,
      originalLimitBytes: 5_000_000_000,
      transcodedUsedBytes: 1_600_000_000,
      transcodedLimitBytes: 5_000_000_000,
    });
    expect(summary.content.libraryBytes).toBe(4_800_000_000);
  });

  it('classifies screens into online, offline and warning by heartbeat staleness', async () => {
    const now = Date.now();
    await insertScreen({ name: 'Fresh', isOnline: true, lastHeartbeat: new Date(now - 5_000) });
    await insertScreen({ name: 'Stale', isOnline: true, lastHeartbeat: new Date(now - 90_000) });
    await insertScreen({ name: 'Down', isOnline: false, lastHeartbeat: new Date(now - 300_000) });

    const summary = await service.getSummary(orgId);

    expect(summary.screens).toEqual({ total: 3, online: 1, offline: 1, warning: 1 });
  });

  it('counts content items and a single failed transcode raises a warn alert', async () => {
    await insertContent(TranscodingStatus.Completed);
    await insertContent(TranscodingStatus.Failed);

    const summary = await service.getSummary(orgId);

    expect(summary.content.count).toBe(2);
    const failed = summary.alerts.find((a) => a.id === 'transcode:failed');
    expect(failed).toBeDefined();
    expect(failed?.tone).toBe('warn');
    expect(failed?.title).toBe('Transcoding failed');
  });

  it('raises a backlog alert only once the pending queue reaches the threshold', async () => {
    await insertContent(TranscodingStatus.Pending);
    await insertContent(TranscodingStatus.Processing);

    let summary = await service.getSummary(orgId);
    expect(summary.alerts.find((a) => a.id === 'transcode:backlog')).toBeUndefined();

    await insertContent(TranscodingStatus.Pending);
    summary = await service.getSummary(orgId);
    const backlog = summary.alerts.find((a) => a.id === 'transcode:backlog');
    expect(backlog).toBeDefined();
    expect(backlog?.description).toBe('3 items pending');
  });

  it('emits a per-screen offline alert ordered newest-first, capped at five', async () => {
    const now = Date.now();
    for (let i = 0; i < 7; i++) {
      await insertScreen({
        name: `Screen ${i}`,
        isOnline: false,
        lastHeartbeat: new Date(now - (i + 1) * 60_000),
      });
    }

    const summary = await service.getSummary(orgId);

    const offlineAlerts = summary.alerts.filter((a) => a.id.startsWith('screen:'));
    expect(offlineAlerts).toHaveLength(5);
    expect(offlineAlerts[0].tone).toBe('offline');
    // Newest heartbeat (Screen 0) first.
    expect(offlineAlerts[0].title).toBe('Screen 0 offline');
  });

  it('does not alert on never-paired offline screens (no heartbeat on record)', async () => {
    await insertScreen({ name: 'Never paired', isOnline: false, lastHeartbeat: null });

    const summary = await service.getSummary(orgId);

    expect(summary.screens.offline).toBe(1);
    expect(summary.alerts.filter((a) => a.id.startsWith('screen:'))).toHaveLength(0);
  });

  it('counts a playlist and schedule entries overlapping the next 24h window', async () => {
    const now = Date.now();
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Lobby Mix' })
      .returning();
    const [screen] = await insertScreen({
      name: 'Lobby',
      isOnline: true,
      lastHeartbeat: new Date(now),
    }).returning();

    await db.insert(scheduleEntries).values([
      {
        organisationId: orgId,
        screenId: screen.id,
        playlistId: playlist.id,
        startTime: new Date(now + 2 * 60 * 60 * 1000),
        endTime: new Date(now + 4 * 60 * 60 * 1000),
        colour: '#6d6cf6',
      },
      {
        organisationId: orgId,
        screenId: screen.id,
        playlistId: playlist.id,
        // Fully in the past — must be excluded.
        startTime: new Date(now - 4 * 60 * 60 * 1000),
        endTime: new Date(now - 2 * 60 * 60 * 1000),
        colour: '#6d6cf6',
      },
    ]);

    const summary = await service.getSummary(orgId);

    expect(summary.playlists.count).toBe(1);
    expect(summary.schedules.upcoming24h).toBe(1);
  });

  it('scopes every metric to the requested organisation', async () => {
    const [other] = await db
      .insert(organisations)
      .values({ name: 'Other', timeZone: 'UTC' })
      .returning();
    await db.insert(screens).values({
      organisationId: other.id,
      name: 'Foreign',
      resolution: '1920x1080',
      location: 'Elsewhere',
      apiKeyHash: 'hash',
      isOnline: true,
      lastHeartbeat: new Date(),
    });
    await db.insert(playlists).values({ organisationId: other.id, name: 'Foreign Mix' });

    const summary = await service.getSummary(orgId);

    expect(summary.screens.total).toBe(0);
    expect(summary.playlists.count).toBe(0);
  });
});
