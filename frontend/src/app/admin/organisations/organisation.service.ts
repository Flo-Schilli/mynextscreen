import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Organisation, CreateOrganisationDto, UpdateOrganisationDto } from './organisation.model';

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
}
