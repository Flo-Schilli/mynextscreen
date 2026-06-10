import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SetupService } from './setup.service';

/** Allow `/setup` only on a fresh install (no user yet); otherwise send to login. */
export const setupGuard: CanActivateFn = async () => {
  const setup = inject(SetupService);
  const router = inject(Router);

  const setupNeeded = await setup.checkStatus();
  return setupNeeded ? true : router.createUrlTree(['/login']);
};
