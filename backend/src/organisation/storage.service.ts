import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { organisations, type Organisation } from '../db/schema';

export interface StorageInfo {
  originalUsedBytes: number;
  originalLimitBytes: number;
  transcodedUsedBytes: number;
  transcodedLimitBytes: number;
}

@Injectable()
export class StorageService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private async getOrgOrFail(orgId: string): Promise<Organisation> {
    const [org] = await this.db
      .select()
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);
    if (!org) {
      throw new NotFoundException(`Organisation with id "${orgId}" not found`);
    }
    return org;
  }

  async checkOriginalLimit(orgId: string, additionalBytes: number): Promise<void> {
    const org = await this.getOrgOrFail(orgId);
    const limit = Number(org.storageOriginalLimitBytes);
    if (limit > 0) {
      const newUsage = Number(org.storageOriginalUsedBytes) + additionalBytes;
      if (newUsage > limit) {
        throw new BadRequestException('Upload would exceed organisation original storage limit');
      }
    }
  }

  async checkTranscodedLimit(orgId: string, additionalBytes: number): Promise<void> {
    const org = await this.getOrgOrFail(orgId);
    const limit = Number(org.storageTranscodedLimitBytes);
    if (limit > 0) {
      const newUsage = Number(org.storageTranscodedUsedBytes) + additionalBytes;
      if (newUsage > limit) {
        throw new BadRequestException(
          'Transcoded file would exceed organisation transcoded storage limit',
        );
      }
    }
  }

  async addOriginalUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.getOrgOrFail(orgId);
    await this.db
      .update(organisations)
      .set({ storageOriginalUsedBytes: Number(org.storageOriginalUsedBytes) + bytes })
      .where(eq(organisations.id, orgId));
  }

  async subtractOriginalUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.getOrgOrFail(orgId);
    await this.db
      .update(organisations)
      .set({ storageOriginalUsedBytes: Math.max(0, Number(org.storageOriginalUsedBytes) - bytes) })
      .where(eq(organisations.id, orgId));
  }

  async addTranscodedUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.getOrgOrFail(orgId);
    await this.db
      .update(organisations)
      .set({ storageTranscodedUsedBytes: Number(org.storageTranscodedUsedBytes) + bytes })
      .where(eq(organisations.id, orgId));
  }

  async subtractTranscodedUsage(orgId: string, bytes: number): Promise<void> {
    const org = await this.getOrgOrFail(orgId);
    await this.db
      .update(organisations)
      .set({
        storageTranscodedUsedBytes: Math.max(0, Number(org.storageTranscodedUsedBytes) - bytes),
      })
      .where(eq(organisations.id, orgId));
  }

  async getStorageInfo(orgId: string): Promise<StorageInfo> {
    const org = await this.getOrgOrFail(orgId);
    return {
      originalUsedBytes: Number(org.storageOriginalUsedBytes),
      originalLimitBytes: Number(org.storageOriginalLimitBytes),
      transcodedUsedBytes: Number(org.storageTranscodedUsedBytes),
      transcodedLimitBytes: Number(org.storageTranscodedLimitBytes),
    };
  }
}
