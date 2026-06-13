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
