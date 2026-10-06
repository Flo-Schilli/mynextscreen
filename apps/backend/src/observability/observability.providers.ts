import type { Provider } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
// makeCounterProvider is used for HTTP request totals.
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
  BULLMQ_JOB_DURATION_SECONDS,
  BULLMQ_QUEUE_JOBS,
  HTTP_DURATION_BUCKETS,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
  JOB_DURATION_BUCKETS,
  LIVE_STREAMS_ACTIVE,
  PG_POOL_CONNECTIONS,
  SCREENS_TOTAL,
  SSE_ACTIVE_CONNECTIONS,
} from './observability.constants';

/**
 * All custom series the backend registers, declared in one place so the module
 * stays a thin wiring layer and a single test can assert the registry exposes
 * exactly this set.
 */
export const observabilityMetricProviders: Provider[] = [
  // ── HTTP ───────────────────────────────────────────────────────────────────
  makeCounterProvider({
    name: HTTP_REQUESTS_TOTAL,
    help: 'Total HTTP requests by method, route template and status code.',
    labelNames: ['method', 'route', 'status'],
  }),
  makeHistogramProvider({
    name: HTTP_REQUEST_DURATION_SECONDS,
    help: 'HTTP request duration in seconds by method, route template and status code.',
    labelNames: ['method', 'route', 'status'],
    buckets: HTTP_DURATION_BUCKETS,
  }),

  // ── BullMQ ─────────────────────────────────────────────────────────────────
  makeGaugeProvider({
    name: BULLMQ_QUEUE_JOBS,
    help: 'Jobs in a BullMQ queue by state (waiting/active/completed/failed/delayed).',
    labelNames: ['queue', 'state'],
  }),
  makeHistogramProvider({
    name: BULLMQ_JOB_DURATION_SECONDS,
    help: 'BullMQ job processing duration in seconds by queue and outcome.',
    labelNames: ['queue', 'status'],
    buckets: JOB_DURATION_BUCKETS,
  }),

  // ── SSE ────────────────────────────────────────────────────────────────────
  makeGaugeProvider({
    name: SSE_ACTIVE_CONNECTIONS,
    help: 'Currently open SSE connections by channel (dashboard/agent).',
    labelNames: ['channel'],
  }),

  // ── Domain ─────────────────────────────────────────────────────────────────
  makeGaugeProvider({
    name: SCREENS_TOTAL,
    help: 'Registered screens by online/offline status.',
    labelNames: ['status'],
  }),
  makeGaugeProvider({
    name: LIVE_STREAMS_ACTIVE,
    help: 'FFmpeg live-stream processes currently running.',
  }),
  makeGaugeProvider({
    name: PG_POOL_CONNECTIONS,
    help: 'PostgreSQL connection pool size by state (total/idle/waiting).',
    labelNames: ['state'],
  }),

  // ── Site-agent (pushed values, mirrored into the registry) ───────────────────
  makeGaugeProvider({
    name: AGENT_UP,
    help: 'Whether the backend has received a recent snapshot from the agent (1/0).',
    labelNames: ['agent'],
  }),
  makeGaugeProvider({
    name: AGENT_UPTIME_SECONDS,
    help: 'Reported agent process uptime in seconds.',
    labelNames: ['agent'],
  }),
  makeGaugeProvider({
    name: AGENT_MEMORY_RSS_BYTES,
    help: 'Reported agent resident set size in bytes.',
    labelNames: ['agent'],
  }),
  makeGaugeProvider({
    name: AGENT_CONNECTED,
    help: 'Whether the agent reported an active server session (1/0).',
    labelNames: ['agent'],
  }),
  makeGaugeProvider({
    name: AGENT_LAST_CONFIG_PULL_TIMESTAMP,
    help: 'Unix timestamp (seconds) of the agent last successful config pull.',
    labelNames: ['agent'],
  }),
  makeGaugeProvider({
    name: AGENT_SCREENS_TOTAL,
    help: 'Number of screens the agent supervises.',
    labelNames: ['agent'],
  }),
  makeGaugeProvider({
    name: AGENT_SCREEN_REACHABLE,
    help: 'Whether a supervised TV is reachable (1/0).',
    labelNames: ['agent', 'screen'],
  }),
  makeGaugeProvider({
    name: AGENT_SCREEN_FAILURES,
    help: 'Consecutive failed supervision rounds for a screen.',
    labelNames: ['agent', 'screen'],
  }),
  makeGaugeProvider({
    name: AGENT_SCREEN_DEVMODE_ACTIVE,
    help: 'Whether Developer Mode is active for a screen (1/0).',
    labelNames: ['agent', 'screen'],
  }),
  // Agent counters arrive as absolute values (monotonic since agent start).
  // prom-client Counters only expose inc(); a Gauge lets the backend `set()` the
  // reported absolute value verbatim. The _total suffix keeps Prometheus
  // `rate()`/`increase()` usage idiomatic for operators.
  makeGaugeProvider({
    name: AGENT_SCREEN_DEVMODE_EXTENSIONS_TOTAL,
    help: 'Developer Mode extensions performed for a screen since agent start.',
    labelNames: ['agent', 'screen'],
  }),
  makeGaugeProvider({
    name: AGENT_SCREEN_LAUNCHES_TOTAL,
    help: 'App launches the agent performed for a screen since agent start.',
    labelNames: ['agent', 'screen'],
  }),
  makeGaugeProvider({
    name: AGENT_SCREEN_WAKES_TOTAL,
    help: 'Wake-on-LAN packets the agent sent for a screen since agent start.',
    labelNames: ['agent', 'screen'],
  }),
];
