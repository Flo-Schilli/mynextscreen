/**
 * Read-model shapes for the dashboard summary endpoint (`GET /api/dashboard/summary`).
 *
 * These are response-only DTOs: the controller never accepts them as input, so
 * no `class-validator` decorators are required. The frontend mirrors these
 * shapes in `apps/frontend/src/app/dashboard/dashboard-summary.model.ts`.
 */

/** Severity/category of a derived dashboard alert. Drives icon + colour in the UI. */
export type DashboardAlertTone = 'offline' | 'warn' | 'info';

/** A single actionable alert derived from current org state. */
export interface DashboardAlert {
  /** Stable id (e.g. `screen:<id>`, `transcode:failed`) for `@for` tracking. */
  id: string;
  tone: DashboardAlertTone;
  title: string;
  description: string;
  /** ISO timestamp the underlying condition was last observed, if known. */
  timestamp: string | null;
}

export interface DashboardScreenCounts {
  total: number;
  online: number;
  offline: number;
  /** Online screens whose heartbeat is stale but not yet flipped offline. */
  warning: number;
}

export interface DashboardStorageUsage {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}

/** Aggregated, org-scoped metrics powering the dashboard KPI row and widgets. */
export interface DashboardSummary {
  screens: DashboardScreenCounts;
  content: {
    count: number;
    /** Total bytes (originals + transcoded) currently used by the library. */
    libraryBytes: number;
  };
  playlists: {
    count: number;
  };
  schedules: {
    /** Entries overlapping the next 24 hours. */
    upcoming24h: number;
  };
  storage: DashboardStorageUsage;
  alerts: DashboardAlert[];
}
