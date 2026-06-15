import { StorageInfo } from '../../content/content.model';

export interface InstanceAdminUserStats {
  total: number;
  verified: number;
  pending: number;
}

/** Aggregate storage limits vs. usage summed across all organisations. */
export type InstanceAdminStorageStats = StorageInfo;

export interface InstanceAdminHostDisk {
  path: string;
  totalBytes: number;
  freeBytes: number;
  available: boolean;
}

export interface InstanceAdminSummary {
  users: InstanceAdminUserStats;
  organisationCount: number;
  storage: InstanceAdminStorageStats;
  hostDisk: InstanceAdminHostDisk;
}

/**
 * Instance-wide host load over the last 24h (`GET /api/admin/dashboard/load`).
 * `cpu` / `ram` are aligned percentage series (0–100), oldest sample first.
 */
export interface SystemLoad {
  cpu: number[];
  ram: number[];
  cores: number;
  ramTotalGB: number;
}
