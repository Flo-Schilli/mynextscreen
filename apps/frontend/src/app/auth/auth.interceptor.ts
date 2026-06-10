import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

/**
 * Cookie auth interceptor:
 * - sends credentials (httpOnly access/refresh cookies) on every `/api` call
 * - attaches the active `X-Organisation-Id` header
 * - on a 401 (expired access token) it refreshes once and retries the request,
 *   de-duplicating concurrent refreshes via a single shared promise.
 * Auth endpoints (`/api/auth/*`) are exempt from the refresh-on-401 retry to
 * avoid recursion (a failing refresh would otherwise loop).
 */
let refreshInFlight: Promise<void> | null = null;

function isAuthRoute(url: string): boolean {
  return url.includes('/api/auth/');
}

/** Test-only: reset the shared single-flight refresh promise between specs. */
export function __resetRefreshInFlight(): void {
  refreshInFlight = null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/api')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const orgState = inject(OrganisationStateService);

  const orgId = orgState.selectedOrgId();
  const headers: Record<string, string> = {};
  if (orgId) {
    headers['X-Organisation-Id'] = orgId;
  }

  const authedReq: HttpRequest<unknown> = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  if (isAuthRoute(req.url)) {
    return next(authedReq);
  }

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      // Single-flight refresh: concurrent 401s share one refresh call.
      refreshInFlight ??= auth.refreshSession().finally(() => {
        refreshInFlight = null;
      });
      return from(refreshInFlight).pipe(
        switchMap(() => next(authedReq)),
        catchError((retryErr: unknown) => {
          void auth.logout().finally(() => router.navigateByUrl('/login'));
          return throwError(() => retryErr);
        }),
      ) as Observable<HttpEvent<unknown>>;
    }),
  );
};
