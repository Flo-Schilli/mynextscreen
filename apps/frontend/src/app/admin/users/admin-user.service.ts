import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminUser } from './admin-user.model';

/**
 * Super-admin-scoped user administration. Like {@link OrganisationService},
 * these calls are not tied to a single organisation, so they carry no
 * `X-Organisation-Id` header (the interceptor only adds it when an org is
 * selected; these endpoints are guarded server-side by super-admin role).
 */
@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private http = inject(HttpClient);
  private baseUrl = '/api/admin/users';

  getAll(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.baseUrl);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
