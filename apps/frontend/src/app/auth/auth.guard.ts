import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  // No in-memory user yet (e.g. fresh page load): try the access cookie.
  await authService.loadCurrent();
  if (authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
