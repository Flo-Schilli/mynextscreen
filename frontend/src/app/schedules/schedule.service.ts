import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ScheduleEntry,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
} from './schedule.model';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private http = inject(HttpClient);

  getByScreen(
    orgId: string,
    screenId: string,
    from: string,
    to: string,
  ): Observable<ScheduleEntry[]> {
    const params = new HttpParams().set('screenId', screenId).set('from', from).set('to', to);
    return this.http.get<ScheduleEntry[]>('/api/schedules', {
      headers: this.orgHeader(orgId),
      params,
    });
  }

  getByDateRange(orgId: string, from: string, to: string): Observable<ScheduleEntry[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ScheduleEntry[]>('/api/schedules', {
      headers: this.orgHeader(orgId),
      params,
    });
  }

  create(orgId: string, dto: CreateScheduleEntryRequest): Observable<ScheduleEntry> {
    return this.http.post<ScheduleEntry>('/api/schedules', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: UpdateScheduleEntryRequest): Observable<ScheduleEntry> {
    return this.http.patch<ScheduleEntry>(`/api/schedules/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/schedules/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
