import { Inject, Injectable, Logger } from '@nestjs/common';
import { lt } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  organisations,
  orgMetricSnapshots,
  systemMetricSnapshots,
  type NewOrgMetricSnapshot,
} from '../db/schema';
import { DashboardSummaryService } from '../dashboard/dashboard-summary.service';
import { SystemMetricsService } from './system-metrics.service';
import { RETENTION_MS } from './metrics.constants';

/**
 * Writes the periodic metric snapshots that back the dashboard history charts.
 *
 * Org KPIs reuse {@link DashboardSummaryService} so the captured values match
 * exactly what the live dashboard derives (no duplicated alert/heartbeat logic).
 * Host load comes from {@link SystemMetricsService}. Capture is best-effort: one
 * org failing must not abort the others, and a failed tick must not crash the
 * scheduler.
 */
@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly summaryService: DashboardSummaryService,
    private readonly systemMetrics: SystemMetricsService,
  ) {}

  /** Capture one snapshot row per organisation plus a single host-load row. */
  async captureSnapshots(): Promise<void> {
    await Promise.all([this.captureOrgSnapshots(), this.captureSystemSnapshot()]);
  }

  private async captureOrgSnapshots(): Promise<void> {
    const orgs = await this.db.select({ id: organisations.id }).from(organisations);
    if (orgs.length === 0) return;

    const rows: NewOrgMetricSnapshot[] = [];
    for (const org of orgs) {
      try {
        const summary = await this.summaryService.getSummary(org.id);
        rows.push({
          organisationId: org.id,
          screensOnline: summary.screens.online,
          contentCount: summary.content.count,
          playlistCount: summary.playlists.count,
          openAlerts: summary.alerts.length,
        });
      } catch (error: unknown) {
        this.logger.warn(`Failed to capture metrics for org ${org.id}: ${describe(error)}`);
      }
    }

    if (rows.length > 0) {
      await this.db.insert(orgMetricSnapshots).values(rows);
    }
  }

  private async captureSystemSnapshot(): Promise<void> {
    const sample = this.systemMetrics.read();
    await this.db.insert(systemMetricSnapshots).values({
      cpuPercent: sample.cpuPercent,
      ramPercent: sample.ramPercent,
    });
  }

  /** Delete snapshots older than the retention window from both tables. */
  async cleanupOld(now: Date = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    await Promise.all([
      this.db.delete(orgMetricSnapshots).where(lt(orgMetricSnapshots.capturedAt, cutoff)),
      this.db.delete(systemMetricSnapshots).where(lt(systemMetricSnapshots.capturedAt, cutoff)),
    ]);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
