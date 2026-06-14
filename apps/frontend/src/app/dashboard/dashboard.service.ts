import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary } from './dashboard-summary.model';

/**
 * HTTP access to the org-scoped dashboard read-model. The aggregate metrics
 * (screen/content/playlist counts, storage, derived alerts) are resolved
 * server-side in a single round-trip by `GET /api/dashboard/summary`.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getSummary(orgId: string): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>('/api/dashboard/summary', {
      headers: new HttpHeaders({ 'X-Organisation-Id': orgId }),
    });
  }
}
