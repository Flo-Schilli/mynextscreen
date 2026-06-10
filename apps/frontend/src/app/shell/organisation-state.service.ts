import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const STORAGE_KEY = 'signage_selected_org_id';

export interface OrgMembership {
  id: string;
  organisationId: string;
  role: string;
  organisation: {
    id: string;
    name: string;
    timeZone: string;
  };
}

export interface OrgWithRole {
  id: string;
  name: string;
  timeZone: string;
  role: string;
}

interface UserProfile {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrganisationStateService {
  private http = inject(HttpClient);

  readonly organisations = signal<OrgWithRole[]>([]);
  readonly selectedOrgId = signal<string | null>(localStorage.getItem(STORAGE_KEY));
  readonly selectedOrg = computed(() => {
    const id = this.selectedOrgId();
    return this.organisations().find((o) => o.id === id) ?? null;
  });
  readonly loading = signal(false);
  readonly isSuperAdmin = signal(false);

  loadOrganisations(): void {
    this.loading.set(true);

    this.http.get<UserProfile>('/api/me/profile').subscribe({
      next: (profile) => this.isSuperAdmin.set(profile.isSuperAdmin),
      error: () => this.isSuperAdmin.set(false),
    });

    this.http.get<OrgMembership[]>('/api/me/memberships').subscribe({
      next: (memberships) => {
        const orgs: OrgWithRole[] = memberships.map((m) => ({
          id: m.organisation.id,
          name: m.organisation.name,
          timeZone: m.organisation.timeZone,
          role: m.role,
        }));
        this.organisations.set(orgs);
        const storedId = this.selectedOrgId();
        const valid = orgs.find((o) => o.id === storedId);
        if (!valid && orgs.length > 0) {
          this.select(orgs[0].id);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  select(orgId: string): void {
    this.selectedOrgId.set(orgId);
    localStorage.setItem(STORAGE_KEY, orgId);
  }
}
