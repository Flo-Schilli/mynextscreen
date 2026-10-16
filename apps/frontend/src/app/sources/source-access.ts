import { Injectable, computed, inject } from '@angular/core';
import { OrganisationStateService } from '../shell/organisation-state.service';

/** Roles that may create, change and sync sources and rules (backend `WRITE_ROLES`). */
const WRITE_ROLES: ReadonlySet<string> = new Set(['org_admin', 'editor']);

/**
 * The active organisation and whether the current user may change its
 * sources. The backend enforces the same roles; this only keeps the UI from
 * offering what would fail with 403.
 */
@Injectable({ providedIn: 'root' })
export class SourceAccess {
  private readonly orgState = inject(OrganisationStateService);

  readonly orgId = computed(() => this.orgState.selectedOrgId());
  readonly canEdit = computed(() => WRITE_ROLES.has(this.orgState.selectedOrg()?.role ?? ''));
}
