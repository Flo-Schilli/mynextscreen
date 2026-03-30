import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Screen,
  CreateScreenRequest,
  UpdateScreenRequest,
  ScreenWithApiKey,
} from './screen.model';

@Injectable({ providedIn: 'root' })
export class ScreenService {
  private http = inject(HttpClient);

  getAll(orgId: string): Observable<Screen[]> {
    return this.http.get<Screen[]>('/api/screens', {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<Screen> {
    return this.http.get<Screen>(`/api/screens/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  create(orgId: string, dto: CreateScreenRequest): Observable<ScreenWithApiKey> {
    return this.http.post<ScreenWithApiKey>('/api/screens', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: UpdateScreenRequest): Observable<Screen> {
    return this.http.patch<Screen>(`/api/screens/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  regenerateApiKey(orgId: string, id: string): Observable<ScreenWithApiKey> {
    return this.http.post<ScreenWithApiKey>(`/api/screens/${id}/regenerate-key`, {}, {
      headers: this.orgHeader(orgId),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
