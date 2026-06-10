import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, map, filter } from 'rxjs';
import { Content, StorageInfo } from './content.model';
import { OrganisationStateService } from '../shell/organisation-state.service';

export interface UploadProgress {
  type: 'progress' | 'complete';
  progress?: number;
  content?: Content;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private orgState = inject(OrganisationStateService);

  getAll(orgId: string, filters?: { type?: string; tags?: string }): Observable<Content[]> {
    let url = '/api/content';
    const params: string[] = [];
    if (filters?.type) params.push(`type=${filters.type}`);
    if (filters?.tags) params.push(`tags=${filters.tags}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<Content[]>(url, {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<Content> {
    return this.http.get<Content>(`/api/content/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  upload(
    orgId: string,
    file: File,
    title: string,
    description: string,
    tags: string[],
  ): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    if (tags.length) formData.append('tags', JSON.stringify(tags));

    return this.http
      .post<Content>('/api/content/upload', formData, {
        headers: this.orgHeader(orgId),
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        filter(
          (event) =>
            event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response,
        ),
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            return {
              type: 'progress' as const,
              progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
            };
          }
          return {
            type: 'complete' as const,
            content: (event as { body: Content }).body,
          };
        }),
      );
  }

  updateMetadata(
    orgId: string,
    id: string,
    dto: { title?: string; description?: string; tags?: string[] },
  ): Observable<Content> {
    return this.http.patch<Content>(`/api/content/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/content/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  reUpload(orgId: string, id: string, file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<Content>(`/api/content/${id}/reupload`, formData, {
        headers: this.orgHeader(orgId),
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        filter(
          (event) =>
            event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response,
        ),
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            return {
              type: 'progress' as const,
              progress: event.total ? Math.round((event.loaded / event.total) * 100) : 0,
            };
          }
          return {
            type: 'complete' as const,
            content: (event as { body: Content }).body,
          };
        }),
      );
  }

  getStorage(orgId: string): Observable<StorageInfo> {
    return this.http.get<StorageInfo>(`/api/organisations/${orgId}/storage`, {
      headers: this.orgHeader(orgId),
    });
  }

  bulkDelete(orgId: string, ids: string[]): Observable<{ deleted: number; notFound: string[] }> {
    return this.http.post<{ deleted: number; notFound: string[] }>(
      '/api/content/bulk-delete',
      { ids },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  bulkTag(
    orgId: string,
    ids: string[],
    tags: string[],
  ): Observable<{ updated: number; notFound: string[] }> {
    return this.http.post<{ updated: number; notFound: string[] }>(
      '/api/content/bulk-tag',
      { ids, tags },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  bulkUntag(
    orgId: string,
    ids: string[],
    tags: string[],
  ): Observable<{ updated: number; notFound: string[] }> {
    return this.http.post<{ updated: number; notFound: string[] }>(
      '/api/content/bulk-untag',
      { ids, tags },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  bulkAddToPlaylist(
    orgId: string,
    ids: string[],
    playlistId: string,
  ): Observable<{ added: number; alreadyPresent: number; notFound: string[] }> {
    return this.http.post<{ added: number; alreadyPresent: number; notFound: string[] }>(
      '/api/content/bulk-add-to-playlist',
      { ids, playlistId },
      {
        headers: this.orgHeader(orgId),
      },
    );
  }

  getOriginalUrl(id: string): string {
    return this.buildMediaUrl(`/api/content/${id}/file/original`);
  }

  getTranscodedUrl(id: string): string {
    return this.buildMediaUrl(`/api/content/${id}/file/transcoded`);
  }

  private buildMediaUrl(base: string): string {
    // Same-origin <img>/<video> send the httpOnly access cookie automatically;
    // the org scope travels as a query param since image tags cannot set headers.
    const params = new URLSearchParams();
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      params.set('organisationId', orgId);
    }
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
