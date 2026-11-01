import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { OrgMfaRequirementRequest, OrgMfaRequirementView } from '@mynextscreen/shared-types';
import { Observable } from 'rxjs';

/** The organisation's "require MFA for all members" switch (OrgAdmin). */
@Injectable({ providedIn: 'root' })
export class OrgMfaService {
  private readonly http = inject(HttpClient);

  getRequirement(orgId: string): Observable<OrgMfaRequirementView> {
    return this.http.get<OrgMfaRequirementView>(this.url(orgId), { headers: this.headers(orgId) });
  }

  setRequirement(orgId: string, requireMfa: boolean): Observable<OrgMfaRequirementView> {
    const body: OrgMfaRequirementRequest = { requireMfa };
    return this.http.patch<OrgMfaRequirementView>(this.url(orgId), body, {
      headers: this.headers(orgId),
    });
  }

  private url(orgId: string): string {
    return `/api/organisations/${orgId}/mfa-requirement`;
  }

  private headers(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
