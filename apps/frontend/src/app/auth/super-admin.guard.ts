import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrganisationStateService } from '../shell/organisation-state.service';

interface UserProfile {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

/**
 * Restricts `/admin/*` routes to super-admins. The backend already enforces this
 * (403), but role-restricted routes must also be guarded client-side.
 *
 * The super-admin signal is populated by the shell after login, but on a fresh
 * page load (deep link) it may not be set yet — so when it is false we confirm
 * against `/api/me/profile` before denying.
 */
export const superAdminGuard: CanActivateFn = async () => {
  const orgState = inject(OrganisationStateService);
  const http = inject(HttpClient);
  const router = inject(Router);

  if (orgState.isSuperAdmin()) {
    return true;
  }

  try {
    const profile = await firstValueFrom(http.get<UserProfile>('/api/me/profile'));
    orgState.isSuperAdmin.set(profile.isSuperAdmin);
    if (profile.isSuperAdmin) {
      return true;
    }
  } catch {
    orgState.isSuperAdmin.set(false);
  }

  return router.createUrlTree(['/dashboard']);
};
