import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Queue } from 'bullmq';
import { Gauge } from 'prom-client';
import { Pool } from 'pg';
import { count } from 'drizzle-orm';
import { PG_POOL, DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens } from '../db/schema';
import { DashboardSseService } from '../dashboard';
import { SiteAgentSseService } from '../site-agent/site-agent-sse.service';
import { FfmpegLiveService } from '../live-stream/ffmpeg-live.service';
import { SLICE_CONTENT_QUEUE } from '../slice-content/slice-content.constants';
import {
  BULLMQ_QUEUE_JOBS,
  LIVE_STREAMS_ACTIVE,
  PG_POOL_CONNECTIONS,
  SCREENS_TOTAL,
  SSE_ACTIVE_CONNECTIONS,
} from './observability.constants';

/** How often the point-in-time gauges are refreshed. */
export const DOMAIN_METRICS_INTERVAL_MS = 15_000;

const BULLMQ_STATES = ['waiting', 'active', 'completed', 'failed', 'delayed'] as const;

/**
 * Polls point-in-time domain state into gauges on a fixed interval.
 *
 * Gauges (queue depth, connection counts, pool state, screen status) describe a
 * snapshot, so pulling them on a timer is simpler and cheaper than hooking every
 * mutation. Counters/histograms that must not miss an event (HTTP, job duration)
 * are instrumented at the event site instead, not here.
 *
 * Every refresh is wrapped so a transient failure (e.g. Redis blip) logs and is
 * skipped rather than crashing the scheduler.
 */
@Injectable()
export class DomainMetricsCollector {
  private readonly logger = new Logger(DomainMetricsCollector.name);

  constructor(
    @InjectQueue('transcoding') private readonly transcodingQueue: Queue,
    @InjectQueue(SLICE_CONTENT_QUEUE) private readonly sliceQueue: Queue,
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly dashboardSse: DashboardSseService,
    private readonly agentSse: SiteAgentSseService,
    private readonly ffmpeg: FfmpegLiveService,
    @InjectMetric(BULLMQ_QUEUE_JOBS) private readonly queueJobs: Gauge<string>,
    @InjectMetric(SSE_ACTIVE_CONNECTIONS) private readonly sseConnections: Gauge<string>,
    @InjectMetric(SCREENS_TOTAL) private readonly screensGauge: Gauge<string>,
    @InjectMetric(LIVE_STREAMS_ACTIVE) private readonly liveStreams: Gauge<string>,
    @InjectMetric(PG_POOL_CONNECTIONS) private readonly pgPool: Gauge<string>,
  ) {}

  @Interval(DOMAIN_METRICS_INTERVAL_MS)
  async refresh(): Promise<void> {
    await Promise.all([
      this.safe('bullmq', () => this.collectQueues()),
      this.safe('screens', () => this.collectScreens()),
    ]);
    // Synchronous reads never throw; kept out of the Promise.all for clarity.
    this.collectSse();
    this.collectLiveStreams();
    this.collectPgPool();
  }

  private async collectQueues(): Promise<void> {
    await Promise.all([
      this.collectQueue('transcoding', this.transcodingQueue),
      this.collectQueue(SLICE_CONTENT_QUEUE, this.sliceQueue),
    ]);
  }

  private async collectQueue(name: string, queue: Queue): Promise<void> {
    const counts = await queue.getJobCounts(...BULLMQ_STATES);
    for (const state of BULLMQ_STATES) {
      this.queueJobs.set({ queue: name, state }, counts[state] ?? 0);
    }
  }

  private collectSse(): void {
    this.sseConnections.set({ channel: 'dashboard' }, this.dashboardSse.activeConnectionCount());
    this.sseConnections.set({ channel: 'agent' }, this.agentSse.activeConnectionCount());
  }

  private collectLiveStreams(): void {
    this.liveStreams.set(this.ffmpeg.activeStreamCount());
  }

  private collectPgPool(): void {
    this.pgPool.set({ state: 'total' }, this.pool.totalCount);
    this.pgPool.set({ state: 'idle' }, this.pool.idleCount);
    this.pgPool.set({ state: 'waiting' }, this.pool.waitingCount);
  }

  private async collectScreens(): Promise<void> {
    const rows = await this.db
      .select({ online: screens.isOnline, total: count() })
      .from(screens)
      .groupBy(screens.isOnline);

    let online = 0;
    let offline = 0;
    for (const row of rows) {
      if (row.online) {
        online = Number(row.total);
      } else {
        offline = Number(row.total);
      }
    }
    this.screensGauge.set({ status: 'online' }, online);
    this.screensGauge.set({ status: 'offline' }, offline);
  }

  private async safe(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.warn(
        `Metrics refresh for '${label}' failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
