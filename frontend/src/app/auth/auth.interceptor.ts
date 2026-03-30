import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const orgState = inject(OrganisationStateService);
  const token = authService.getToken();
  const orgId = orgState.selectedOrgId();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['X-Organisation-Id'] = orgId;
  }

  if (Object.keys(headers).length > 0) {
    return next(req.clone({ setHeaders: headers }));
  }

  return next(req);
};
