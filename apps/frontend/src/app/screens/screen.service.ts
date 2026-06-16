import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Screen,
  ScreenListItem,
  CreateScreenRequest,
  UpdateScreenRequest,
  BulkDeleteResponse,
  BulkAssignGroupResponse,
} from './screen.model';

@Injectable({ providedIn: 'root' })
export class ScreenService {
  private http = inject(HttpClient);

  getAll(orgId: string): Observable<ScreenListItem[]> {
    return this.http.get<ScreenListItem[]>('/api/screens', {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<Screen> {
    return this.http.get<Screen>(`/api/screens/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  /**
   * Register a screen by claiming the display's one-time pairing code. The
   * server returns the screen only — the API key is delivered to the display
   * itself via the pairing poll, never to the admin.
   */
  create(orgId: string, dto: CreateScreenRequest): Observable<Screen> {
    return this.http.post<Screen>('/api/screens', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: UpdateScreenRequest): Observable<Screen> {
    return this.http.patch<Screen>(`/api/screens/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  /**
   * Re-pair a screen: regenerate its API key and attach the fresh token to the
   * pending pairing for the given code, so a re-opened display pulls it.
   */
  repair(orgId: string, id: string, pairingCode: string): Observable<Screen> {
    return this.http.post<Screen>(
      `/api/screens/${id}/repair`,
      { pairingCode },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  /**
   * Ask the screen's player to reload itself (like hitting F5 in a browser).
   * Fire-and-forget for an offline screen — the server still accepts it.
   */
  refreshPlayer(orgId: string, id: string): Observable<Screen> {
    return this.http.post<Screen>(
      `/api/screens/${id}/refresh`,
      {},
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  /** Delete a single screen (reuses the bulk endpoint with a one-element list). */
  deleteOne(orgId: string, id: string): Observable<BulkDeleteResponse> {
    return this.bulkDelete(orgId, [id]);
  }

  bulkDelete(orgId: string, ids: string[]): Observable<BulkDeleteResponse> {
    return this.http.post<BulkDeleteResponse>(
      '/api/screens/bulk-delete',
      { ids },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  bulkAssignGroup(
    orgId: string,
    ids: string[],
    groupId: string | null,
  ): Observable<BulkAssignGroupResponse> {
    return this.http.post<BulkAssignGroupResponse>(
      '/api/screens/bulk-assign-group',
      { ids, groupId },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
