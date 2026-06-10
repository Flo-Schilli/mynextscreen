import { Injectable, Inject } from '@nestjs/common';
import { and, between, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { auditEntries, type AuditEntry, type NewAuditEntry } from '../db/schema';
import { AuditAction } from './audit-action.enum';

export interface AuditLogFilters {
  action?: AuditAction;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditLogService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async record(entry: Omit<NewAuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const [saved] = await this.db.insert(auditEntries).values(entry).returning();
    return saved;
  }

  async findByOrganisation(
    organisationId: string,
    filters: AuditLogFilters = {},
  ): Promise<{ data: AuditEntry[]; total: number }> {
    const where = this.buildWhere({ ...filters, organisationId });
    return this.query(where, filters);
  }

  async findAll(filters: AuditLogFilters = {}): Promise<{ data: AuditEntry[]; total: number }> {
    const where = this.buildWhere(filters);
    return this.query(where, filters);
  }

  private async query(
    where: SQL | undefined,
    filters: AuditLogFilters,
  ): Promise<{ data: AuditEntry[]; total: number }> {
    const take = filters.limit ?? 50;
    const skip = filters.offset ?? 0;

    const data = await this.db
      .select()
      .from(auditEntries)
      .where(where)
      .orderBy(desc(auditEntries.timestamp))
      .limit(take)
      .offset(skip);

    const total = await this.db.$count(auditEntries, where);

    return { data, total };
  }

  private buildWhere(filters: AuditLogFilters & { organisationId?: string }): SQL | undefined {
    const conditions: SQL[] = [];

    if (filters.organisationId) {
      conditions.push(eq(auditEntries.organisationId, filters.organisationId));
    }
    if (filters.action) {
      conditions.push(eq(auditEntries.action, filters.action));
    }
    if (filters.userId) {
      conditions.push(eq(auditEntries.userId, filters.userId));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditEntries.resourceType, filters.resourceType));
    }
    if (filters.resourceId) {
      conditions.push(eq(auditEntries.resourceId, filters.resourceId));
    }
    if (filters.from && filters.to) {
      conditions.push(between(auditEntries.timestamp, filters.from, filters.to));
    } else if (filters.from) {
      conditions.push(gte(auditEntries.timestamp, filters.from));
    } else if (filters.to) {
      conditions.push(lte(auditEntries.timestamp, filters.to));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
