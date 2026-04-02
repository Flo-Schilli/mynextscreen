import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Playlist,
  PlaylistItem,
  CreatePlaylistRequest,
  AddPlaylistItemRequest,
  UpdatePlaylistItemRequest,
  ReorderPlaylistItemsRequest,
  BulkDeletePlaylistsResponse,
  BulkAssignScreenResponse,
} from './playlist.model';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private http = inject(HttpClient);

  getAll(orgId: string): Observable<Playlist[]> {
    return this.http.get<Playlist[]>('/api/playlists', {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<Playlist> {
    return this.http.get<Playlist>(`/api/playlists/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  create(orgId: string, dto: CreatePlaylistRequest): Observable<Playlist> {
    return this.http.post<Playlist>('/api/playlists', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: { name: string }): Observable<Playlist> {
    return this.http.patch<Playlist>(`/api/playlists/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/playlists/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  addItem(orgId: string, playlistId: string, dto: AddPlaylistItemRequest): Observable<PlaylistItem> {
    return this.http.post<PlaylistItem>(`/api/playlists/${playlistId}/items`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  updateItem(orgId: string, playlistId: string, itemId: string, dto: UpdatePlaylistItemRequest): Observable<PlaylistItem> {
    return this.http.patch<PlaylistItem>(`/api/playlists/${playlistId}/items/${itemId}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  removeItem(orgId: string, playlistId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`/api/playlists/${playlistId}/items/${itemId}`, {
      headers: this.orgHeader(orgId),
    });
  }

  reorderItems(orgId: string, playlistId: string, dto: ReorderPlaylistItemsRequest): Observable<PlaylistItem[]> {
    return this.http.put<PlaylistItem[]>(`/api/playlists/${playlistId}/items/reorder`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  getDuration(orgId: string, playlistId: string): Observable<{ totalDurationSeconds: number }> {
    return this.http.get<{ totalDurationSeconds: number }>(`/api/playlists/${playlistId}/duration`, {
      headers: this.orgHeader(orgId),
    });
  }

  setAsDefault(orgId: string, playlistId: string | null): Observable<unknown> {
    return this.http.patch(`/api/organisations/${orgId}/default-playlist`, { playlistId }, {
      headers: this.orgHeader(orgId),
    });
  }

  bulkDelete(orgId: string, ids: string[]): Observable<BulkDeletePlaylistsResponse> {
    return this.http.post<BulkDeletePlaylistsResponse>('/api/playlists/bulk-delete', { ids }, {
      headers: this.orgHeader(orgId),
    });
  }

  bulkAssignScreen(orgId: string, ids: string[], screenId: string): Observable<BulkAssignScreenResponse> {
    return this.http.post<BulkAssignScreenResponse>('/api/playlists/bulk-assign-screen', { ids, screenId }, {
      headers: this.orgHeader(orgId),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
