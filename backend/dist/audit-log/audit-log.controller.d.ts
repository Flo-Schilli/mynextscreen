import { AuditLogService } from './audit-log.service';
import { AuditEntry } from './audit-entry.entity';
import { AuditLogQueryDto, AdminAuditLogQueryDto } from './audit-log-query.dto';
export declare class AuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    findByOrganisation(organisationId: string, query: AuditLogQueryDto): Promise<{
        data: AuditEntry[];
        total: number;
    }>;
}
export declare class AdminAuditLogController {
    private readonly auditLogService;
    constructor(auditLogService: AuditLogService);
    findAll(query: AdminAuditLogQueryDto): Promise<{
        data: AuditEntry[];
        total: number;
    }>;
}
