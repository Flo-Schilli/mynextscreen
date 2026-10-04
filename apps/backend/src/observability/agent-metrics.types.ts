// Backend half of the agent → backend observability contract. The agent half
// lives in `apps/site-agent/src/protocol/server-protocol.ts`; the two are kept
// in sync by hand on purpose (see the note there — `libs/shared-types` has no
// build target, so the apps do not import across that boundary).
//
// No `organisationId`: org breakdown belongs in the dashboard, not Prometheus.

/** Per-screen runtime state the agent observes, one entry per managed screen. */
export interface AgentScreenMetrics {
  screenId: string;
  reachable: boolean;
  failures: number;
  devmodeActive: boolean;
  devmodeExtensions: number;
  launches: number;
  wakes: number;
}

/** One heartbeat's worth of agent-level metrics. */
export interface AgentMetricsSnapshot {
  uptimeSeconds: number;
  memoryRssBytes: number;
  connected: boolean;
  lastConfigPullAtMs: number;
  screenCount: number;
  screens: AgentScreenMetrics[];
}
