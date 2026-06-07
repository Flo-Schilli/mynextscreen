import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditEntry } from './audit-entry.entity';
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
  constructor(
    @InjectRepository(AuditEntry)
    private readonly repository: Repository<AuditEntry>,
  ) {}

  async record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const auditEntry = this.repository.create(entry);
    return this.repository.save(auditEntry);
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
    where: FindOptionsWhere<AuditEntry>,
    filters: AuditLogFilters,
  ): Promise<{ data: AuditEntry[]; total: number }> {
    const take = filters.limit ?? 50;
    const skip = filters.offset ?? 0;

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      take,
      skip,
    });

    return { data, total };
  }

  private buildWhere(
    filters: AuditLogFilters & { organisationId?: string },
  ): FindOptionsWhere<AuditEntry> {
    const where: FindOptionsWhere<AuditEntry> = {};

    if (filters.organisationId) {
      where.organisationId = filters.organisationId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.from && filters.to) {
      where.timestamp = Between(filters.from, filters.to);
    } else if (filters.from) {
      where.timestamp = MoreThanOrEqual(filters.from);
    } else if (filters.to) {
      where.timestamp = LessThanOrEqual(filters.to);
    }

    return where;
  }
}
