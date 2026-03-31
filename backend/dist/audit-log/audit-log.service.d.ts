import { Repository } from 'typeorm';
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
export declare class AuditLogService {
    private readonly repository;
    constructor(repository: Repository<AuditEntry>);
    record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry>;
    findByOrganisation(organisationId: string, filters?: AuditLogFilters): Promise<{
        data: AuditEntry[];
        total: number;
    }>;
    findAll(filters?: AuditLogFilters): Promise<{
        data: AuditEntry[];
        total: number;
    }>;
    private query;
    private buildWhere;
}
