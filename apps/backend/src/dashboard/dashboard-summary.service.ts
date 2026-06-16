import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contents,
  organisations,
  playlists,
  scheduleEntries,
  screens,
  type Screen,
} from '../db/schema';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import type {
  DashboardAlert,
  DashboardScreenCounts,
  DashboardStorageUsage,
  DashboardSummary,
} from './dto/dashboard-summary.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Default offline threshold (mirrors ScreenScheduler) when env is unset. */
const DEFAULT_OFFLINE_THRESHOLD_MS = 120_000;
/** A backlog this size or larger raises a "transcode queue" alert. */
const TRANSCODE_BACKLOG_ALERT_THRESHOLD = 3;
/** Cap on per-screen offline alerts so a mass-outage doesn't flood the list. */
const MAX_OFFLINE_SCREEN_ALERTS = 5;

interface ContentAggregate {
  count: number;
  failed: number;
  pending: number;
}

/**
 * Org-scoped, read-only aggregate that powers the dashboard KPI row and the
 * Alerts widget. Lives in the dashboard module as a dedicated read-model so it
 * stays decoupled from the write-path services of each domain (no cross-module
 * service injection, no circular deps) and resolves in a single round-trip.
 */
@Injectable()
export class DashboardSummaryService {
  /**
   * Online screens whose heartbeat is older than this are surfaced as
   * "warning" (stale but not yet flipped offline by the scheduler). Set to half
   * the offline threshold so a screen degrades to warning before going offline.
   */
  private readonly warningThresholdMs: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {
    const offlineThresholdMs = this.config.get<number>(
      'SCREEN_OFFLINE_THRESHOLD_MS',
      DEFAULT_OFFLINE_THRESHOLD_MS,
    );
    this.warningThresholdMs = Math.floor(offlineThresholdMs / 2);
  }

  async getSummary(organisationId: string): Promise<DashboardSummary> {
    const now = new Date();
    const [screenRows, contentAgg, playlistCount, upcoming24h, storage] = await Promise.all([
      this.loadScreens(organisationId),
      this.loadContentAggregate(organisationId),
      this.db.$count(playlists, eq(playlists.organisationId, organisationId)),
      this.countUpcomingSchedules(organisationId, now),
      this.loadStorage(organisationId),
    ]);

    const screenCounts = this.countScreens(screenRows, now);
    const alerts = this.buildAlerts(screenRows, contentAgg, now);

    return {
      screens: screenCounts,
      content: {
        count: contentAgg.count,
        libraryBytes: storage.originalUsedBytes + storage.transcodedUsedBytes,
      },
      playlists: { count: playlistCount },
      schedules: { upcoming24h },
      storage,
      alerts,
    };
  }

  private loadScreens(organisationId: string): Promise<Screen[]> {
    return this.db.select().from(screens).where(eq(screens.organisationId, organisationId));
  }

  private async loadContentAggregate(organisationId: string): Promise<ContentAggregate> {
    const [agg] = await this.db
      .select({
        count: sql<string>`count(*)`,
        failed: sql<string>`count(*) filter (where ${contents.transcodingStatus} = ${TranscodingStatus.Failed})`,
        pending: sql<string>`count(*) filter (where ${contents.transcodingStatus} in (${TranscodingStatus.Pending}, ${TranscodingStatus.Processing}))`,
      })
      .from(contents)
      .where(eq(contents.organisationId, organisationId));

    return {
      count: Number(agg?.count ?? 0),
      failed: Number(agg?.failed ?? 0),
      pending: Number(agg?.pending ?? 0),
    };
  }

  /** Entries overlapping [now, now + 24h): they start before the window ends and end after now. */
  private countUpcomingSchedules(organisationId: string, now: Date): Promise<number> {
    const windowEnd = new Date(now.getTime() + DAY_MS);
    return this.db.$count(
      scheduleEntries,
      and(
        eq(scheduleEntries.organisationId, organisationId),
        lt(scheduleEntries.startTime, windowEnd),
        gt(scheduleEntries.endTime, now),
      ),
    );
  }

  private async loadStorage(organisationId: string): Promise<DashboardStorageUsage> {
    const [org] = await this.db
      .select({
        originalUsedBytes: organisations.storageOriginalUsedBytes,
        originalLimitBytes: organisations.storageOriginalLimitBytes,
        transcodedUsedBytes: organisations.storageTranscodedUsedBytes,
        transcodedLimitBytes: organisations.storageTranscodedLimitBytes,
      })
      .from(organisations)
      .where(eq(organisations.id, organisationId));

    return (
      org ?? {
        originalUsedBytes: 0,
        originalLimitBytes: 0,
        transcodedUsedBytes: 0,
        transcodedLimitBytes: 0,
      }
    );
  }

  private countScreens(screenRows: Screen[], now: Date): DashboardScreenCounts {
    let online = 0;
    let offline = 0;
    let warning = 0;
    for (const screen of screenRows) {
      if (!screen.isOnline) {
        offline += 1;
        continue;
      }
      if (this.isHeartbeatStale(screen, now)) {
        warning += 1;
      } else {
        online += 1;
      }
    }
    return { total: screenRows.length, online, offline, warning };
  }

  private isHeartbeatStale(screen: Screen, now: Date): boolean {
    if (!screen.lastHeartbeat) return true;
    const age = now.getTime() - new Date(screen.lastHeartbeat).getTime();
    return age > this.warningThresholdMs;
  }

  /**
   * Derives the alerts list from current state, ordered by severity
   * (offline → warn). Offline-screen alerts are capped to avoid flooding.
   */
  private buildAlerts(
    screenRows: Screen[],
    contentAgg: ContentAggregate,
    now: Date,
  ): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    // Offline screens that were previously paired (have a heartbeat on record).
    const offlineScreens = screenRows
      .filter((s) => !s.isOnline && s.lastHeartbeat !== null)
      .sort(
        (a, b) =>
          new Date(b.lastHeartbeat as Date).getTime() - new Date(a.lastHeartbeat as Date).getTime(),
      );

    for (const screen of offlineScreens.slice(0, MAX_OFFLINE_SCREEN_ALERTS)) {
      alerts.push({
        id: `screen:${screen.id}`,
        tone: 'offline',
        title: `${screen.name} offline`,
        description: `No heartbeat since ${this.formatAge(screen.lastHeartbeat, now)}`,
        timestamp: screen.lastHeartbeat ? new Date(screen.lastHeartbeat).toISOString() : null,
      });
    }

    // Warning screens (online but stale heartbeat).
    const warningScreens = screenRows.filter((s) => s.isOnline && this.isHeartbeatStale(s, now));
    if (warningScreens.length > 0) {
      const first = warningScreens[0];
      alerts.push({
        id: 'screens:unstable',
        tone: 'warn',
        title:
          warningScreens.length === 1
            ? `${first.name} unstable connection`
            : `${warningScreens.length} screens with unstable connection`,
        description: 'Heartbeat delayed — reconnecting',
        timestamp: first.lastHeartbeat ? new Date(first.lastHeartbeat).toISOString() : null,
      });
    }

    if (contentAgg.failed > 0) {
      alerts.push({
        id: 'transcode:failed',
        tone: 'warn',
        title: 'Transcoding failed',
        description: `${contentAgg.failed} item${contentAgg.failed > 1 ? 's' : ''} failed to transcode`,
        timestamp: now.toISOString(),
      });
    }

    if (contentAgg.pending >= TRANSCODE_BACKLOG_ALERT_THRESHOLD) {
      alerts.push({
        id: 'transcode:backlog',
        tone: 'warn',
        title: 'Transcode queue backed up',
        description: `${contentAgg.pending} items pending`,
        timestamp: now.toISOString(),
      });
    }

    return alerts;
  }

  /** Human-friendly relative age, e.g. "2 h ago", "5 min ago", "just now". */
  private formatAge(since: Date | null, now: Date): string {
    if (!since) return 'unknown';
    const diffMs = now.getTime() - new Date(since).getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
  }
}
