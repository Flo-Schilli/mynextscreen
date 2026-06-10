import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SetupService } from '../setup/setup.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const setup = inject(SetupService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  // No in-memory user yet (e.g. fresh page load): try the access cookie.
  await authService.loadCurrent();
  if (authService.isAuthenticated()) {
    return true;
  }
  // Unauthenticated: on a fresh install (no user yet) route to first-run setup,
  // otherwise to the login screen.
  const setupNeeded = await setup.checkStatus();
  return router.createUrlTree([setupNeeded ? '/setup' : '/login']);
};
