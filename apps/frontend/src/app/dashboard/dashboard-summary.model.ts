/**
 * Frontend mirror of the backend dashboard summary read-model
 * (`apps/backend/src/dashboard/dto/dashboard-summary.dto.ts`). Kept in sync by
 * hand; the shapes must match what `GET /api/dashboard/summary` returns.
 */

export type DashboardAlertTone = 'offline' | 'warn' | 'info';

export interface DashboardAlert {
  id: string;
  tone: DashboardAlertTone;
  title: string;
  description: string;
  timestamp: string | null;
}

export interface DashboardScreenCounts {
  total: number;
  online: number;
  offline: number;
  warning: number;
}

export interface DashboardStorageUsage {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}

export interface DashboardSummary {
  screens: DashboardScreenCounts;
  content: {
    count: number;
    libraryBytes: number;
  };
  playlists: {
    count: number;
  };
  schedules: {
    upcoming24h: number;
  };
  storage: DashboardStorageUsage;
  alerts: DashboardAlert[];
}
