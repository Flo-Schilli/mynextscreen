import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Organisation,
  CreateOrganisationDto,
  UpdateOrganisationDto,
  OrgMember,
  AddOrgMemberRequest,
  UpdateOrgMemberRoleRequest,
} from './organisation.model';

@Injectable({ providedIn: 'root' })
export class OrganisationService {
  private http = inject(HttpClient);
  private baseUrl = '/api/organisations';

  getAll(): Observable<Organisation[]> {
    return this.http.get<Organisation[]>(this.baseUrl);
  }

  getOne(id: string): Observable<Organisation> {
    return this.http.get<Organisation>(`${this.baseUrl}/${id}`);
  }

  create(dto: CreateOrganisationDto): Observable<Organisation> {
    return this.http.post<Organisation>(this.baseUrl, dto);
  }

  update(id: string, dto: UpdateOrganisationDto): Observable<Organisation> {
    return this.http.patch<Organisation>(`${this.baseUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listMembers(orgId: string): Observable<OrgMember[]> {
    return this.http.get<OrgMember[]>(`${this.baseUrl}/${orgId}/members`);
  }

  addMember(orgId: string, dto: AddOrgMemberRequest): Observable<OrgMember> {
    return this.http.post<OrgMember>(`${this.baseUrl}/${orgId}/members`, dto);
  }

  updateMemberRole(
    orgId: string,
    userId: string,
    dto: UpdateOrgMemberRoleRequest,
  ): Observable<OrgMember> {
    return this.http.patch<OrgMember>(`${this.baseUrl}/${orgId}/members/${userId}`, dto);
  }

  removeMember(orgId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${orgId}/members/${userId}`);
  }
}
