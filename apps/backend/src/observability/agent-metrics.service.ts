import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import {
  AGENT_CONNECTED,
  AGENT_LAST_CONFIG_PULL_TIMESTAMP,
  AGENT_MEMORY_RSS_BYTES,
  AGENT_SCREEN_DEVMODE_ACTIVE,
  AGENT_SCREEN_DEVMODE_EXTENSIONS_TOTAL,
  AGENT_SCREEN_FAILURES,
  AGENT_SCREEN_LAUNCHES_TOTAL,
  AGENT_SCREEN_REACHABLE,
  AGENT_SCREEN_WAKES_TOTAL,
  AGENT_SCREENS_TOTAL,
  AGENT_UP,
  AGENT_UPTIME_SECONDS,
} from './observability.constants';
import type { AgentMetricsSnapshot } from './agent-metrics.types';

const MS_PER_SECOND = 1000;

/**
 * Mirrors the latest metrics snapshot an agent pushed on heartbeat into the
 * backend's Prometheus registry, so a single `/api/metrics` target covers the
 * backend and every agent without any agent being reachable from outside the
 * venue.
 *
 * Series are labelled by `agent` (and `screen` for per-screen series) only —
 * never `organisationId`.
 */
@Injectable()
export class AgentMetricsService {
  constructor(
    @InjectMetric(AGENT_UP) private readonly up: Gauge<string>,
    @InjectMetric(AGENT_UPTIME_SECONDS) private readonly uptime: Gauge<string>,
    @InjectMetric(AGENT_MEMORY_RSS_BYTES) private readonly memoryRss: Gauge<string>,
    @InjectMetric(AGENT_CONNECTED) private readonly connected: Gauge<string>,
    @InjectMetric(AGENT_LAST_CONFIG_PULL_TIMESTAMP)
    private readonly lastConfigPull: Gauge<string>,
    @InjectMetric(AGENT_SCREENS_TOTAL) private readonly screensTotal: Gauge<string>,
    @InjectMetric(AGENT_SCREEN_REACHABLE) private readonly screenReachable: Gauge<string>,
    @InjectMetric(AGENT_SCREEN_FAILURES) private readonly screenFailures: Gauge<string>,
    @InjectMetric(AGENT_SCREEN_DEVMODE_ACTIVE)
    private readonly screenDevmodeActive: Gauge<string>,
    @InjectMetric(AGENT_SCREEN_DEVMODE_EXTENSIONS_TOTAL)
    private readonly screenDevmodeExtensions: Gauge<string>,
    @InjectMetric(AGENT_SCREEN_LAUNCHES_TOTAL) private readonly screenLaunches: Gauge<string>,
    @InjectMetric(AGENT_SCREEN_WAKES_TOTAL) private readonly screenWakes: Gauge<string>,
  ) {}

  /** Apply a snapshot pushed by `agentId` to the registry. */
  record(agentId: string, snapshot: AgentMetricsSnapshot): void {
    this.up.set({ agent: agentId }, 1);
    this.uptime.set({ agent: agentId }, snapshot.uptimeSeconds);
    this.memoryRss.set({ agent: agentId }, snapshot.memoryRssBytes);
    this.connected.set({ agent: agentId }, snapshot.connected ? 1 : 0);
    this.lastConfigPull.set(
      { agent: agentId },
      snapshot.lastConfigPullAtMs > 0 ? snapshot.lastConfigPullAtMs / MS_PER_SECOND : 0,
    );
    this.screensTotal.set({ agent: agentId }, snapshot.screenCount);

    for (const screen of snapshot.screens) {
      const labels = { agent: agentId, screen: screen.screenId };
      this.screenReachable.set(labels, screen.reachable ? 1 : 0);
      this.screenFailures.set(labels, screen.failures);
      this.screenDevmodeActive.set(labels, screen.devmodeActive ? 1 : 0);
      this.screenDevmodeExtensions.set(labels, screen.devmodeExtensions);
      this.screenLaunches.set(labels, screen.launches);
      this.screenWakes.set(labels, screen.wakes);
    }
  }
}
