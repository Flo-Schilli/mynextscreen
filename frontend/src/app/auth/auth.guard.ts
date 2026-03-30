import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const valid = await authService.isValid();
  if (!valid) {
    return router.createUrlTree(['/login']);
  }
  return true;
};
