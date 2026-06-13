import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { access, statfs } from 'node:fs/promises';
import * as path from 'node:path';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { organisations, users } from '../db/schema';

/** Verified vs. pending (unverified) account counts across the whole instance. */
export interface InstanceAdminUserStats {
  total: number;
  verified: number;
  pending: number;
}

/** Aggregate storage limits vs. used bytes summed over every organisation. */
export interface InstanceAdminStorageStats {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}

/** Free vs. total bytes of the host filesystem backing the media path. */
export interface InstanceAdminHostDisk {
  path: string;
  totalBytes: number;
  freeBytes: number;
  /** false when statfs failed (e.g. unsupported platform) — UI hides the bar. */
  available: boolean;
}

export interface InstanceAdminSummary {
  users: InstanceAdminUserStats;
  organisationCount: number;
  storage: InstanceAdminStorageStats;
  hostDisk: InstanceAdminHostDisk;
}

const MAX_PARENT_WALK = 64;

@Injectable()
export class InstanceAdminDashboardService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly config: ConfigService,
  ) {}

  async getSummary(): Promise<InstanceAdminSummary> {
    const [userStats, storage, hostDisk] = await Promise.all([
      this.getUserStats(),
      this.getStorageStats(),
      this.getHostDisk(),
    ]);
    return {
      users: userStats,
      organisationCount: storage.organisationCount,
      storage: storage.totals,
      hostDisk,
    };
  }

  private async getUserStats(): Promise<InstanceAdminUserStats> {
    const rows = await this.db
      .select({
        emailVerified: users.emailVerified,
        count: sql<string>`count(*)`,
      })
      .from(users)
      .groupBy(users.emailVerified);

    let verified = 0;
    let pending = 0;
    for (const row of rows) {
      const count = Number(row.count);
      if (row.emailVerified) {
        verified += count;
      } else {
        pending += count;
      }
    }
    return { total: verified + pending, verified, pending };
  }

  private async getStorageStats(): Promise<{
    organisationCount: number;
    totals: InstanceAdminStorageStats;
  }> {
    const [agg] = await this.db
      .select({
        organisationCount: sql<string>`count(*)`,
        originalUsedBytes: sql<string>`coalesce(sum(${organisations.storageOriginalUsedBytes}), 0)`,
        originalLimitBytes: sql<string>`coalesce(sum(${organisations.storageOriginalLimitBytes}), 0)`,
        transcodedUsedBytes: sql<string>`coalesce(sum(${organisations.storageTranscodedUsedBytes}), 0)`,
        transcodedLimitBytes: sql<string>`coalesce(sum(${organisations.storageTranscodedLimitBytes}), 0)`,
      })
      .from(organisations);

    return {
      organisationCount: Number(agg?.organisationCount ?? 0),
      totals: {
        originalUsedBytes: Number(agg?.originalUsedBytes ?? 0),
        originalLimitBytes: Number(agg?.originalLimitBytes ?? 0),
        transcodedUsedBytes: Number(agg?.transcodedUsedBytes ?? 0),
        transcodedLimitBytes: Number(agg?.transcodedLimitBytes ?? 0),
      },
    };
  }

  private async getHostDisk(): Promise<InstanceAdminHostDisk> {
    const basePath = this.config.get<string>('MEDIA_BASE_PATH', './media');
    const target = await this.resolveExistingAncestor(basePath);
    try {
      const stats = await statfs(target);
      return {
        path: basePath,
        totalBytes: stats.blocks * stats.bsize,
        freeBytes: stats.bavail * stats.bsize,
        available: true,
      };
    } catch {
      return { path: basePath, totalBytes: 0, freeBytes: 0, available: false };
    }
  }

  /**
   * The configured media path may not exist yet (fresh install). statfs needs an
   * existing path, so walk up to the nearest existing ancestor — that still lives
   * on the same filesystem and yields the correct free-space figures.
   */
  private async resolveExistingAncestor(input: string): Promise<string> {
    let current = path.resolve(input);
    for (let i = 0; i < MAX_PARENT_WALK; i++) {
      try {
        await access(current);
        return current;
      } catch {
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
    return path.resolve('.');
  }
}
