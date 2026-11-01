import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';
import type { MfaRequiredBy } from '@mynextscreen/shared-types';
import { AuthService, MFA_ENROLMENT_ROUTE } from './auth.service';
import { mfaErrorCode, mfaErrorRequiredBy } from './mfa-errors';
import { OrganisationStateService } from '../shell/organisation-state.service';

/**
 * Cookie auth interceptor:
 * - sends credentials (httpOnly access/refresh cookies) on every `/api` call
 * - attaches the active `X-Organisation-Id` header
 * - on a 401 (expired access token) it refreshes once and retries the request,
 *   de-duplicating concurrent refreshes via a single shared promise.
 * - on a 403 `MFA_ENROLMENT_REQUIRED` it locks the session into the
 *   enrolment wizard (with the body's `requiredBy`) and navigates there —
 *   unless the request was sent before the last completed enrolment (a stale
 *   answer for the old session, see `AuthService.enrolmentGeneration`).
 * Auth endpoints (`/api/auth/*`) are exempt from both: a failing refresh would
 * otherwise loop, and the wizard's own `/api/auth/mfa/*` calls must never send
 * it back to itself.
 */
let refreshInFlight: Promise<void> | null = null;

function isAuthRoute(url: string): boolean {
  return url.includes('/api/auth/');
}

/** Test-only: reset the shared single-flight refresh promise between specs. */
export function __resetRefreshInFlight(): void {
  refreshInFlight = null;
}

/** An enrolment lock a 403 asks for, or null for any other error. */
interface EnrolmentDemand {
  requiredBy: MfaRequiredBy | null;
}

function enrolmentDemandFor(err: unknown): EnrolmentDemand | null {
  if (
    !(err instanceof HttpErrorResponse) ||
    err.status !== 403 ||
    mfaErrorCode(err) !== 'MFA_ENROLMENT_REQUIRED'
  ) {
    return null;
  }
  return { requiredBy: mfaErrorRequiredBy(err) };
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

  /** Sends the session to the wizard once; later 403s of the same burst only rethrow. */
  const lockIntoEnrolment = (demand: EnrolmentDemand, sentInGeneration: number): void => {
    if (sentInGeneration !== auth.enrolmentGeneration) {
      // Sent on the session that existed before the enrolment completed.
      return;
    }
    const alreadyLocked = auth.mfaEnrolment() !== null;
    auth.requireEnrolment(demand.requiredBy);
    if (!alreadyLocked && !router.url.startsWith(MFA_ENROLMENT_ROUTE)) {
      void router.navigateByUrl(MFA_ENROLMENT_ROUTE);
    }
  };

  const generation = auth.enrolmentGeneration;
  return next(authedReq).pipe(
    catchError((err: unknown) => {
      const demand = enrolmentDemandFor(err);
      if (demand) {
        lockIntoEnrolment(demand, generation);
        return throwError(() => err);
      }
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      // Single-flight refresh: concurrent 401s share one refresh call.
      refreshInFlight ??= auth.refreshSession().finally(() => {
        refreshInFlight = null;
      });
      let retryGeneration = generation;
      return from(refreshInFlight).pipe(
        switchMap(() => {
          retryGeneration = auth.enrolmentGeneration;
          return next(authedReq);
        }),
        catchError((retryErr: unknown) => {
          // The refreshed session is valid but not MFA-confirmed: wizard, not logout.
          const retryDemand = enrolmentDemandFor(retryErr);
          if (retryDemand) {
            lockIntoEnrolment(retryDemand, retryGeneration);
            return throwError(() => retryErr);
          }
          void auth.logout().finally(() => router.navigateByUrl('/login'));
          return throwError(() => retryErr);
        }),
      ) as Observable<HttpEvent<unknown>>;
    }),
  );
};
