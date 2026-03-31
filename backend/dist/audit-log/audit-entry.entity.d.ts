import { Organisation } from '../organisation/organisation.entity';
import { AuditAction } from './audit-action.enum';
export declare class AuditEntry {
    id: string;
    timestamp: Date;
    userId: string | null;
    organisationId: string | null;
    organisation: Organisation | null;
    action: AuditAction;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown> | null;
}
