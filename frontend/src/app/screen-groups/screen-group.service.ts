import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ScreenGroup,
  CreateScreenGroupRequest,
  UpdateScreenGroupRequest,
} from './screen-group.model';

@Injectable({ providedIn: 'root' })
export class ScreenGroupService {
  private http = inject(HttpClient);

  getAll(orgId: string): Observable<ScreenGroup[]> {
    return this.http.get<ScreenGroup[]>('/api/screen-groups', {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<ScreenGroup> {
    return this.http.get<ScreenGroup>(`/api/screen-groups/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  create(orgId: string, dto: CreateScreenGroupRequest): Observable<ScreenGroup> {
    return this.http.post<ScreenGroup>('/api/screen-groups', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: UpdateScreenGroupRequest): Observable<ScreenGroup> {
    return this.http.patch<ScreenGroup>(`/api/screen-groups/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/screen-groups/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
