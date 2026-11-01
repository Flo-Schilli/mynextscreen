import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, MFA_ENROLMENT_ROUTE } from './auth.service';
import { SetupService } from '../setup/setup.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const setup = inject(SetupService);
  const router = inject(Router);

  // A session that still has to enrol in MFA only reaches the wizard.
  const allowed = () =>
    authService.mfaEnrolment() ? router.createUrlTree([MFA_ENROLMENT_ROUTE]) : true;

  if (authService.isAuthenticated()) {
    return allowed();
  }
  // No in-memory user yet (e.g. fresh page load): try the access cookie.
  await authService.loadCurrent();
  if (authService.isAuthenticated()) {
    return allowed();
  }
  // Unauthenticated: on a fresh install (no user yet) route to first-run setup,
  // otherwise to the login screen.
  const setupNeeded = await setup.checkStatus();
  return router.createUrlTree([setupNeeded ? '/setup' : '/login']);
};
