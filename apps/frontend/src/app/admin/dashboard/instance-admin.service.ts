import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InstanceAdminSummary } from './instance-admin.model';

@Injectable({ providedIn: 'root' })
export class InstanceAdminService {
  private http = inject(HttpClient);

  getSummary(): Observable<InstanceAdminSummary> {
    return this.http.get<InstanceAdminSummary>('/api/admin/dashboard');
  }
}
