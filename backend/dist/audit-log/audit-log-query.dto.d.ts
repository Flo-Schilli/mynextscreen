import { AuditAction } from './audit-action.enum';
export declare class AuditLogQueryDto {
    action?: AuditAction;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    from?: string;
    to?: string;
    limit?: string;
    offset?: string;
}
export declare class AdminAuditLogQueryDto extends AuditLogQueryDto {
    organisationId?: string;
}
