import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { isMfaMandatory } from './mfa-requirement';

/**
 * Lets a signed-in user into the mandatory enrolment wizard only while
 * enrolment is actually required. On a fresh page load `GET /api/auth/me`
 * (via `loadCurrent`) already sets the lock. The reason (`requiredBy`) is
 * filled in from `GET /api/auth/mfa/status` when the lock does not carry it
 * yet; the same call also catches a session that was never locked in memory.
 */
export const mfaEnrolmentGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const mfa = inject(MfaService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    await auth.loadCurrent();
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
  }
  const lock = auth.mfaEnrolment();
  if (lock?.requiredBy) {
    return true;
  }

  try {
    const status = await mfa.loadStatus();
    if (lock || (!status.totpEnabled && isMfaMandatory(status.requiredBy))) {
      auth.requireEnrolment(status.requiredBy);
      return true;
    }
  } catch {
    // Status unavailable: a known lock still holds (the page falls back to a
    // generic reason); otherwise let the app re-trigger the lock on its next 403.
    if (lock) {
      return true;
    }
  }
  return router.createUrlTree(['/']);
};
