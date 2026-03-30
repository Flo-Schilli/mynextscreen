import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditLogResponse, AuditLogFilters } from './audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private http = inject(HttpClient);

  getAuditLog(orgId: string, filters: AuditLogFilters = {}): Observable<AuditLogResponse> {
    let params = new HttpParams();

    if (filters.action) params = params.set('action', filters.action);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.resourceType) params = params.set('resourceType', filters.resourceType);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.limit != null) params = params.set('limit', String(filters.limit));
    if (filters.offset != null) params = params.set('offset', String(filters.offset));

    return this.http.get<AuditLogResponse>('/api/audit-log', {
      headers: new HttpHeaders({ 'X-Organisation-Id': orgId }),
      params,
    });
  }
}
