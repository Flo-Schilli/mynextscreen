import { signal, WritableSignal } from '@angular/core';
import { OrgWithRole } from './organisation-state.service';

/** Test double for the part of OrganisationStateService that pages read. */
export interface OrganisationStateStub {
  selectedOrg: WritableSignal<OrgWithRole | null>;
  selectedOrgId: WritableSignal<string | null>;
}

export function orgWithRole(
  id: string,
  role = 'org_admin',
  timeZone = 'Europe/Berlin',
): OrgWithRole {
  return { id, name: `Org ${id}`, timeZone, role };
}

/** The shell has selected `org` (null: the user belongs to no organisation). */
export function organisationStateStub(org: OrgWithRole | null): OrganisationStateStub {
  return { selectedOrg: signal(org), selectedOrgId: signal(org?.id ?? null) };
}
