import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Membership,
  MyMembership,
  AddMemberRequest,
  UpdateMemberRoleRequest,
} from './member.model';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);

  getMyMemberships(): Observable<MyMembership[]> {
    return this.http.get<MyMembership[]>('/api/me/memberships');
  }

  listMembers(orgId: string): Observable<Membership[]> {
    return this.http.get<Membership[]>(`/api/organisations/${orgId}/members`, {
      headers: this.orgHeader(orgId),
    });
  }

  addMember(orgId: string, dto: AddMemberRequest): Observable<Membership> {
    return this.http.post<Membership>(`/api/organisations/${orgId}/members`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  updateRole(orgId: string, userId: string, dto: UpdateMemberRoleRequest): Observable<Membership> {
    return this.http.patch<Membership>(`/api/organisations/${orgId}/members/${userId}`, dto, {
      headers: this.orgHeader(orgId),
    });
  }

  removeMember(orgId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`/api/organisations/${orgId}/members/${userId}`, {
      headers: this.orgHeader(orgId),
    });
  }

  private orgHeader(orgId: string): HttpHeaders {
    return new HttpHeaders({ 'X-Organisation-Id': orgId });
  }
}
