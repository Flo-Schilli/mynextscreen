import { Gauge } from 'prom-client';
import type { Queue } from 'bullmq';
import { Pool } from 'pg';
import type { DrizzleDB } from '../db/drizzle.types';
import { DashboardSseService } from '../dashboard';
import { SiteAgentSseService } from '../site-agent/site-agent-sse.service';
import { FfmpegLiveService } from '../live-stream/ffmpeg-live.service';
import { DomainMetricsCollector } from './domain-metrics.collector';

function gaugeMock(): jest.Mocked<Pick<Gauge<string>, 'set'>> {
  return { set: jest.fn() };
}

describe('DomainMetricsCollector', () => {
  let transcodingQueue: { getJobCounts: jest.Mock };
  let sliceQueue: { getJobCounts: jest.Mock };
  let pool: Pick<Pool, 'totalCount' | 'idleCount' | 'waitingCount'>;
  let db: { select: jest.Mock };
  let dashboardSse: Pick<DashboardSseService, 'activeConnectionCount'>;
  let agentSse: Pick<SiteAgentSseService, 'activeConnectionCount'>;
  let ffmpeg: Pick<FfmpegLiveService, 'activeStreamCount'>;
  let gauges: Record<string, jest.Mocked<Pick<Gauge<string>, 'set'>>>;
  let collector: DomainMetricsCollector;

  beforeEach(() => {
    transcodingQueue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 2,
        active: 1,
        completed: 10,
        failed: 3,
        delayed: 0,
      }),
    };
    sliceQueue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 5,
        failed: 0,
        delayed: 1,
      }),
    };
    pool = { totalCount: 8, idleCount: 5, waitingCount: 2 };
    // groupBy returns one row per isOnline value
    db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockResolvedValue([
            { online: true, total: 7 },
            { online: false, total: 3 },
          ]),
        }),
      }),
    };
    dashboardSse = { activeConnectionCount: jest.fn().mockReturnValue(4) };
    agentSse = { activeConnectionCount: jest.fn().mockReturnValue(2) };
    ffmpeg = { activeStreamCount: jest.fn().mockReturnValue(1) };

    gauges = {
      queueJobs: gaugeMock(),
      sseConnections: gaugeMock(),
      screensGauge: gaugeMock(),
      liveStreams: gaugeMock(),
      pgPool: gaugeMock(),
    };

    collector = new DomainMetricsCollector(
      transcodingQueue as unknown as Queue,
      sliceQueue as unknown as Queue,
      pool as Pool,
      db as unknown as DrizzleDB,
      dashboardSse as DashboardSseService,
      agentSse as SiteAgentSseService,
      ffmpeg as FfmpegLiveService,
      gauges.queueJobs as unknown as Gauge<string>,
      gauges.sseConnections as unknown as Gauge<string>,
      gauges.screensGauge as unknown as Gauge<string>,
      gauges.liveStreams as unknown as Gauge<string>,
      gauges.pgPool as unknown as Gauge<string>,
    );
  });

  it('sets queue depth per queue and state', async () => {
    await collector.refresh();

    expect(gauges.queueJobs.set).toHaveBeenCalledWith(
      { queue: 'transcoding', state: 'waiting' },
      2,
    );
    expect(gauges.queueJobs.set).toHaveBeenCalledWith({ queue: 'transcoding', state: 'failed' }, 3);
    expect(gauges.queueJobs.set).toHaveBeenCalledWith(
      { queue: 'slice-content', state: 'delayed' },
      1,
    );
  });

  it('sets SSE connection gauges per channel', async () => {
    await collector.refresh();
    expect(gauges.sseConnections.set).toHaveBeenCalledWith({ channel: 'dashboard' }, 4);
    expect(gauges.sseConnections.set).toHaveBeenCalledWith({ channel: 'agent' }, 2);
  });

  it('sets the live-stream and pg-pool gauges', async () => {
    await collector.refresh();
    expect(gauges.liveStreams.set).toHaveBeenCalledWith(1);
    expect(gauges.pgPool.set).toHaveBeenCalledWith({ state: 'total' }, 8);
    expect(gauges.pgPool.set).toHaveBeenCalledWith({ state: 'idle' }, 5);
    expect(gauges.pgPool.set).toHaveBeenCalledWith({ state: 'waiting' }, 2);
  });

  it('sets screens online/offline from the grouped query', async () => {
    await collector.refresh();
    expect(gauges.screensGauge.set).toHaveBeenCalledWith({ status: 'online' }, 7);
    expect(gauges.screensGauge.set).toHaveBeenCalledWith({ status: 'offline' }, 3);
  });

  it('swallows a queue failure without throwing', async () => {
    transcodingQueue.getJobCounts.mockRejectedValue(new Error('redis down'));
    await expect(collector.refresh()).resolves.toBeUndefined();
    // Synchronous collectors still ran.
    expect(gauges.liveStreams.set).toHaveBeenCalledWith(1);
  });
});
