import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

/**
 * Lets a signed-in user into the mandatory enrolment wizard only while
 * enrolment is actually required. After a page reload the in-memory lock is
 * gone, so it is rebuilt from `GET /api/auth/mfa/status`: no TOTP yet but
 * required by the super-admin role or an organisation.
 */
export const mfaEnrolmentGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const mfa = inject(MfaService);
  const orgState = inject(OrganisationStateService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    await auth.loadCurrent();
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
  }
  if (auth.mfaEnrolment()) {
    return true;
  }

  try {
    const status = await mfa.loadStatus();
    if (!status.totpEnabled) {
      if (status.requiredBy.superAdmin) {
        auth.requireEnrolment({ kind: 'super-admin' });
        return true;
      }
      const orgIds = status.requiredBy.organisationIds;
      if (orgIds.length > 0) {
        const selected = orgState.selectedOrgId();
        const organisationId = selected && orgIds.includes(selected) ? selected : orgIds[0];
        auth.requireEnrolment({ kind: 'organisation', organisationId });
        return true;
      }
    }
  } catch {
    // Status unavailable: fall through to the app, which re-triggers the lock on its next 403.
  }
  return router.createUrlTree(['/']);
};
