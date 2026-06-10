import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SetupService } from '../setup/setup.service';

/**
 * On a fresh install (no user yet), redirect a direct `/login` visit to the
 * first-run setup screen; otherwise allow the login page as usual.
 */
export const loginGuard: CanActivateFn = async () => {
  const setup = inject(SetupService);
  const router = inject(Router);

  const setupNeeded = await setup.checkStatus();
  return setupNeeded ? router.createUrlTree(['/setup']) : true;
};
