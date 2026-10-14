import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdapterDescriptor,
  ContentSource,
  CreateContentSourceRequest,
  SourceEvent,
  SourceEventsQuery,
  SourceFacets,
  UpdateContentSourceRequest,
} from './content-source.model';

/** Stateless HttpClient wrapper for `/api/content-sources`. */
@Injectable({ providedIn: 'root' })
export class ContentSourceService {
  private http = inject(HttpClient);

  getAdapters(orgId: string): Observable<AdapterDescriptor[]> {
    return this.http.get<AdapterDescriptor[]>('/api/content-sources/adapters', {
      headers: this.orgHeader(orgId),
    });
  }

  /** Venue and genre values of the given sources; all of the organisation's when empty. */
  getFacets(orgId: string, sourceIds: string[]): Observable<SourceFacets> {
    let params = new HttpParams();
    if (sourceIds.length > 0) {
      params = params.set('sourceIds', sourceIds.join(','));
    }
    return this.http.get<SourceFacets>('/api/content-sources/facets', {
      headers: this.orgHeader(orgId),
      params,
    });
  }

  getAll(orgId: string): Observable<ContentSource[]> {
    return this.http.get<ContentSource[]>('/api/content-sources', {
      headers: this.orgHeader(orgId),
    });
  }

  getOne(orgId: string, id: string): Observable<ContentSource> {
    return this.http.get<ContentSource>(`/api/content-sources/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  create(orgId: string, dto: CreateContentSourceRequest): Observable<ContentSource> {
    return this.http.post<ContentSource>('/api/content-sources', dto, {
      headers: this.orgHeader(orgId),
    });
  }

  update(orgId: string, id: string, dto: UpdateContentSourceRequest): Observable<ContentSource> {
    return this.http.patch<ContentSource>(`/api/content-sources/${id}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  delete(orgId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/content-sources/${id}`, {
      headers: this.orgHeader(orgId),
    });
  }

  /** Queues a sync now; answers 202 before the sync has run. */
  sync(orgId: string, id: string): Observable<{ queued: true }> {
    return this.http.post<{ queued: true }>(
      `/api/content-sources/${id}/sync`,
      {},
      { headers: this.orgHeader(orgId) },
    );
  }

  getEvents(orgId: string, id: string, query: SourceEventsQuery = {}): Observable<SourceEvent[]> {
    return this.http.get<SourceEvent[]>(`/api/content-sources/${id}/events`, {
      headers: this.orgHeader(orgId),
      params: toEventParams(query),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}

function toEventParams(query: SourceEventsQuery): HttpParams {
  let params = new HttpParams();
  if (query.from) params = params.set('from', query.from);
  if (query.to) params = params.set('to', query.to);
  if (query.venues?.length) params = params.set('venues', query.venues.join(','));
  if (query.genres?.length) params = params.set('genres', query.genres.join(','));
  if (query.includeGone !== undefined) params = params.set('includeGone', query.includeGone);
  if (query.limit !== undefined) params = params.set('limit', query.limit);
  if (query.offset !== undefined) params = params.set('offset', query.offset);
  return params;
}
