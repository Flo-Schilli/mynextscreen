/**
 * Central registry of custom Prometheus series names for the backend.
 *
 * Process-default metrics (CPU, heap, event-loop lag, GC, open FDs) are provided
 * by `prom-client` via the PrometheusModule and are not listed here.
 *
 * Cardinality discipline: no `organisationId` label anywhere. HTTP series use the
 * route *template* (`/api/screens/:id`), never the concrete URL with UUIDs.
 */

// ── HTTP ──────────────────────────────────────────────────────────────────────
export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const HTTP_REQUEST_DURATION_SECONDS = 'http_request_duration_seconds';

// ── BullMQ ─────────────────────────────────────────────────────────────────────
export const BULLMQ_QUEUE_JOBS = 'bullmq_queue_jobs';
export const BULLMQ_JOB_DURATION_SECONDS = 'bullmq_job_duration_seconds';

// ── SSE ────────────────────────────────────────────────────────────────────────
export const SSE_ACTIVE_CONNECTIONS = 'sse_active_connections';

// ── Domain ─────────────────────────────────────────────────────────────────────
export const SCREENS_TOTAL = 'screens_total';
export const LIVE_STREAMS_ACTIVE = 'live_streams_active';
export const PG_POOL_CONNECTIONS = 'pg_pool_connections';

// ── Site-agent (pushed, mirrored into the registry) ─────────────────────────────
export const AGENT_UP = 'agent_up';
export const AGENT_UPTIME_SECONDS = 'agent_uptime_seconds';
export const AGENT_MEMORY_RSS_BYTES = 'agent_memory_rss_bytes';
export const AGENT_CONNECTED = 'agent_connected';
export const AGENT_LAST_CONFIG_PULL_TIMESTAMP = 'agent_last_config_pull_timestamp_seconds';
export const AGENT_SCREENS_TOTAL = 'agent_screens_total';
export const AGENT_SCREEN_REACHABLE = 'agent_screen_reachable';
export const AGENT_SCREEN_FAILURES = 'agent_screen_failures';
export const AGENT_SCREEN_DEVMODE_ACTIVE = 'agent_screen_devmode_active';
export const AGENT_SCREEN_DEVMODE_EXTENSIONS_TOTAL = 'agent_screen_devmode_extensions_total';
export const AGENT_SCREEN_LAUNCHES_TOTAL = 'agent_screen_launches_total';
export const AGENT_SCREEN_WAKES_TOTAL = 'agent_screen_wakes_total';

/** HTTP duration histogram buckets (seconds), tuned for an API, not a CDN. */
export const HTTP_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/** Job-duration histogram buckets (seconds): transcoding/slicing run long. */
export const JOB_DURATION_BUCKETS = [0.5, 1, 5, 15, 30, 60, 120, 300, 600, 1800];
