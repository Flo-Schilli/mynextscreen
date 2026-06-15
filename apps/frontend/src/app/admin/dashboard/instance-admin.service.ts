import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InstanceAdminSummary, SystemLoad } from './instance-admin.model';

@Injectable({ providedIn: 'root' })
export class InstanceAdminService {
  private http = inject(HttpClient);

  getSummary(): Observable<InstanceAdminSummary> {
    return this.http.get<InstanceAdminSummary>('/api/admin/dashboard');
  }

  getSystemLoad(): Observable<SystemLoad> {
    return this.http.get<SystemLoad>('/api/admin/dashboard/load');
  }
}
