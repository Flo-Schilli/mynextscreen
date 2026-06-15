/**
 * Frontend mirror of the backend dashboard metric-history read-model
 * (`apps/backend/src/metrics/dto/metrics.dto.ts`). Kept in sync by hand; the
 * shapes must match what `GET /api/dashboard/history` returns.
 */

export interface DashboardHistoryPoint {
  capturedAt: string;
  screensOnline: number;
  contentCount: number;
  playlistCount: number;
  openAlerts: number;
}

export interface DashboardHistory {
  points: DashboardHistoryPoint[];
}
