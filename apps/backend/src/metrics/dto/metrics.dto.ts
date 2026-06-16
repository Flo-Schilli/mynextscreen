/**
 * Read-model shapes for the dashboard metric-history endpoints
 * (`GET /api/dashboard/history` and `GET /api/admin/dashboard/load`).
 *
 * Response-only DTOs — the controllers never accept them as input, so no
 * `class-validator` decorators are needed. The frontend mirrors these shapes in
 * `apps/frontend/src/app/dashboard/dashboard-history.model.ts` and
 * `apps/frontend/src/app/admin/dashboard/instance-admin.model.ts`.
 */

/** One hourly-bucketed point of an organisation's KPI history. */
export interface DashboardHistoryPoint {
  /** ISO timestamp of the bucket start. */
  capturedAt: string;
  screensOnline: number;
  contentCount: number;
  playlistCount: number;
  openAlerts: number;
}

/** Org-scoped KPI trend over the last 24 hours, oldest point first. */
export interface DashboardHistory {
  points: DashboardHistoryPoint[];
}

/**
 * Instance-wide host load over the last 24 hours, oldest sample first. `cpu` and
 * `ram` are aligned percentage series (0–100). `cores` / `ramTotalGB` describe
 * the host so the UI can render absolute readouts.
 */
export interface SystemLoadHistory {
  cpu: number[];
  ram: number[];
  cores: number;
  ramTotalGB: number;
}
