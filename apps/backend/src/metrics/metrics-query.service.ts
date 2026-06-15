import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { orgMetricSnapshots, systemMetricSnapshots } from '../db/schema';
import { HISTORY_BUCKET, HISTORY_WINDOW_MS } from './metrics.constants';
import type { DashboardHistory, DashboardHistoryPoint, SystemLoadHistory } from './dto/metrics.dto';
import { SystemMetricsService } from './system-metrics.service';

const BYTES_PER_GB = 1e9;

/**
 * Read-side of the metric snapshots: returns the trailing 24h, downsampled to
 * one point per hour (`date_bin`) so payloads stay small and the charts render
 * a clean, evenly-spaced trend regardless of capture cadence. Points are ordered
 * oldest-first.
 */
@Injectable()
export class MetricsQueryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly systemMetrics: SystemMetricsService,
  ) {}

  async getOrgHistory(organisationId: string, now: Date = new Date()): Promise<DashboardHistory> {
    const since = new Date(now.getTime() - HISTORY_WINDOW_MS);
    const bucket = this.timeBucket(orgMetricSnapshots.capturedAt);

    const rows = await this.db
      .select({
        bucket,
        screensOnline: sql<string>`round(avg(${orgMetricSnapshots.screensOnline}))`,
        contentCount: sql<string>`round(avg(${orgMetricSnapshots.contentCount}))`,
        playlistCount: sql<string>`round(avg(${orgMetricSnapshots.playlistCount}))`,
        openAlerts: sql<string>`round(avg(${orgMetricSnapshots.openAlerts}))`,
      })
      .from(orgMetricSnapshots)
      .where(
        and(
          eq(orgMetricSnapshots.organisationId, organisationId),
          gte(orgMetricSnapshots.capturedAt, since),
        ),
      )
      .groupBy(bucket)
      .orderBy(bucket);

    const points: DashboardHistoryPoint[] = rows.map((row) => ({
      capturedAt: new Date(row.bucket).toISOString(),
      screensOnline: Number(row.screensOnline),
      contentCount: Number(row.contentCount),
      playlistCount: Number(row.playlistCount),
      openAlerts: Number(row.openAlerts),
    }));

    return { points };
  }

  async getSystemLoad(now: Date = new Date()): Promise<SystemLoadHistory> {
    const since = new Date(now.getTime() - HISTORY_WINDOW_MS);
    const bucket = this.timeBucket(systemMetricSnapshots.capturedAt);

    const rows = await this.db
      .select({
        bucket,
        cpuPercent: sql<string>`round(avg(${systemMetricSnapshots.cpuPercent}))`,
        ramPercent: sql<string>`round(avg(${systemMetricSnapshots.ramPercent}))`,
      })
      .from(systemMetricSnapshots)
      .where(gte(systemMetricSnapshots.capturedAt, since))
      .groupBy(bucket)
      .orderBy(bucket);

    const host = this.systemMetrics.read();
    return {
      cpu: rows.map((row) => Number(row.cpuPercent)),
      ram: rows.map((row) => Number(row.ramPercent)),
      cores: host.cores,
      ramTotalGB: Math.round(host.ramTotalBytes / BYTES_PER_GB),
    };
  }

  /** Bins a timestamptz column into {@link HISTORY_BUCKET} buckets aligned to the Unix epoch. */
  private timeBucket(column: AnyColumn): SQL<Date> {
    return sql<Date>`date_bin(${sql.raw(`'${HISTORY_BUCKET}'`)}, ${column}, '1970-01-01'::timestamptz)`;
  }
}
