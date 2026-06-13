import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLogResponse, AuditLogFilters } from '../../audit-log/audit-log.model';

/** Instance-admin audit filters extend the per-org ones with an org scope. */
export interface InstanceAuditLogFilters extends AuditLogFilters {
  organisationId?: string;
}

/**
 * Super-admin-scoped audit log spanning ALL organisations plus instance-level
 * events (registrations, email dispatch, account changes). Hits the
 * super-admin-guarded `/api/admin/audit-log` endpoint, so — like the other
 * admin services — it carries no `X-Organisation-Id` header.
 */
@Injectable({ providedIn: 'root' })
export class InstanceAuditLogService {
  private http = inject(HttpClient);

  getAuditLog(filters: InstanceAuditLogFilters = {}): Observable<AuditLogResponse> {
    let params = new HttpParams();

    if (filters.action) params = params.set('action', filters.action);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.resourceType) params = params.set('resourceType', filters.resourceType);
    if (filters.organisationId) params = params.set('organisationId', filters.organisationId);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.limit != null) params = params.set('limit', String(filters.limit));
    if (filters.offset != null) params = params.set('offset', String(filters.offset));

    return this.http.get<AuditLogResponse>('/api/admin/audit-log', { params });
  }
}
