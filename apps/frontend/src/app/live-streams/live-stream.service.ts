import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LiveStream,
  CreateLiveStreamRequest,
  UpdateLiveStreamRequest,
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  StreamHealthState,
} from './live-stream.model';

@Injectable({ providedIn: 'root' })
export class LiveStreamService {
  private http = inject(HttpClient);

  getAll(orgId: string): Observable<LiveStream[]> {
    return this.http.get<LiveStream[]>('/api/live-streams', {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<LiveStream> {
    return this.http.get<LiveStream>(`/api/live-streams/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  create(orgId: string, dto: CreateLiveStreamRequest): Observable<LiveStream> {
    return this.http.post<LiveStream>('/api/live-streams', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: UpdateLiveStreamRequest): Observable<LiveStream> {
    return this.http.patch<LiveStream>(`/api/live-streams/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/live-streams/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  activate(
    orgId: string,
    id: string,
    dto: ActivateLiveStreamRequest,
  ): Observable<ActivateStreamResponse> {
    return this.http.post<ActivateStreamResponse>(`/api/live-streams/${id}/activate`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  deactivate(orgId: string, id: string): Observable<LiveStream> {
    return this.http.post<LiveStream>(
      `/api/live-streams/${id}/deactivate`,
      {},
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  getHealth(orgId: string, id: string): Observable<StreamHealthState> {
    return this.http.get<StreamHealthState>(`/api/live-streams/${id}/health`, {
      headers: this.orgHeader(orgId),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
