import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EventSchedulePreviewItem,
  EventScheduleRule,
  EventScheduleRuleRequest,
} from './event-schedule.model';

/** Stateless HttpClient wrapper for `/api/content-sources/:sourceId/event-schedules`. */
@Injectable({ providedIn: 'root' })
export class EventScheduleService {
  private http = inject(HttpClient);

  getAll(orgId: string, sourceId: string): Observable<EventScheduleRule[]> {
    return this.http.get<EventScheduleRule[]>(this.base(sourceId), {
      headers: this.orgHeader(orgId),
    });
  }

  create(
    orgId: string,
    sourceId: string,
    dto: EventScheduleRuleRequest,
  ): Observable<EventScheduleRule> {
    return this.http.post<EventScheduleRule>(this.base(sourceId), dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(
    orgId: string,
    sourceId: string,
    id: string,
    dto: Partial<EventScheduleRuleRequest>,
  ): Observable<EventScheduleRule> {
    return this.http.patch<EventScheduleRule>(`${this.base(sourceId)}/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, sourceId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(sourceId)}/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  /** Upcoming events of the rule with the status of each target. */
  preview(orgId: string, sourceId: string, id: string): Observable<EventSchedulePreviewItem[]> {
    return this.http.get<EventSchedulePreviewItem[]>(`${this.base(sourceId)}/${id}/preview`, {
      headers: this.orgHeader(orgId),
    });
  }

  /** Leaves one event out of the rule, or takes it back in. */
  setExcluded(
    orgId: string,
    sourceId: string,
    id: string,
    eventId: string,
    excluded: boolean,
  ): Observable<void> {
    const url = `${this.base(sourceId)}/${id}/exclusions/${eventId}`;
    const options = { headers: this.orgHeader(orgId) };
    return excluded ? this.http.put<void>(url, {}, options) : this.http.delete<void>(url, options);
  }

  private base(sourceId: string): string {
    return `/api/content-sources/${sourceId}/event-schedules`;
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
