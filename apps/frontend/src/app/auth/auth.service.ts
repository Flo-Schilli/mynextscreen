import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AuthMeResponse,
  AuthSuccessResponse,
  AuthUserView,
  LoginMfaRequest,
  LoginResponse,
  MfaRequiredBy,
  MfaRequiredResponse,
} from '@mynextscreen/shared-types';
import { firstValueFrom } from 'rxjs';

export type AuthenticatedUser = AuthUserView;

/**
 * Where a first-factor step (login, verify-email auto-login, first-run setup)
 * leaves the user: signed in, asked for the second factor, or signed in but
 * required to enrol before using the app.
 */
export type LoginOutcome = 'ok' | 'mfa-required' | 'enrolment-required';

/**
 * The session is locked into the mandatory enrolment wizard. `requiredBy` is
 * known from a 403 `MFA_ENROLMENT_REQUIRED` body or `/api/auth/mfa/status`;
 * session responses and `/api/auth/me` only say *that* MFA is mandatory, so
 * it is null until the wizard's guard has loaded the status.
 */
export interface MfaEnrolmentLock {
  requiredBy: MfaRequiredBy | null;
}

/** Route of the mandatory enrolment wizard (outside the shell). */
export const MFA_ENROLMENT_ROUTE = '/mfa-enrolment';

function isMfaRequired(res: LoginResponse): res is MfaRequiredResponse {
  return 'mfaRequired' in res && res.mfaRequired;
}

/**
 * Internal email+password auth. The access/refresh tokens live in httpOnly
 * cookies set by the backend, so the SPA never stores or reads a token — it
 * only tracks the current user (a signal) and calls the cookie-backed
 * endpoints with `withCredentials`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly user = signal<AuthenticatedUser | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly loading = signal(false);

  /**
   * Set while the session may only reach the MFA enrolment wizard (a session
   * response or `/api/auth/me` said `mfaEnrolmentRequired`, or the backend
   * answered 403 `MFA_ENROLMENT_REQUIRED`). MFA is bound to the user, so the
   * lock covers every organisation.
   */
  readonly mfaEnrolment = signal<MfaEnrolmentLock | null>(null);
  /**
   * True between a password step that answered `mfaRequired` and the second
   * step. The challenge itself lives in an httpOnly cookie, never here.
   */
  readonly mfaChallengePending = signal(false);

  /** Password step. A TOTP user gets no session yet, only a challenge cookie. */
  async login(email: string, password: string): Promise<LoginOutcome> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<LoginResponse>(
          '/api/auth/login',
          { email, password },
          { withCredentials: true },
        ),
      );
      return this.applyFirstFactor(res);
    } finally {
      this.loading.set(false);
    }
  }

  /** Second login step: a TOTP code or a recovery code against the pending challenge. */
  async verifyMfa(input: LoginMfaRequest): Promise<Exclude<LoginOutcome, 'mfa-required'>> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<AuthSuccessResponse>('/api/auth/login/mfa', input, {
          withCredentials: true,
        }),
      );
      this.mfaChallengePending.set(false);
      return this.applySession(res);
    } finally {
      this.loading.set(false);
    }
  }

  /** The challenge expired or was dropped: the password step has to run again. */
  abandonMfaChallenge(): void {
    this.mfaChallengePending.set(false);
  }

  /**
   * Sessions without MFA may only reach the wizard from now on. An unknown
   * reason (null) never overwrites one that is already known.
   */
  requireEnrolment(requiredBy: MfaRequiredBy | null = null): void {
    this.mfaEnrolment.update((lock) => ({
      requiredBy: requiredBy ?? lock?.requiredBy ?? null,
    }));
  }

  /**
   * TOTP confirmed: the backend replaced the session with an MFA-confirmed one
   * (new cookies). Lift the wizard lock and reload the user from it.
   */
  async completeEnrolment(): Promise<void> {
    this.mfaEnrolment.set(null);
    await this.loadCurrent();
  }

  /** Applies a session-issuing response (setup, login without TOTP, login/mfa). */
  applySession(res: AuthSuccessResponse): Exclude<LoginOutcome, 'mfa-required'> {
    this.user.set(res.user);
    this.applyEnrolmentFlag(res.mfaEnrolmentRequired);
    return res.mfaEnrolmentRequired ? 'enrolment-required' : 'ok';
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>('/api/auth/logout', {}, { withCredentials: true }));
    } finally {
      this.user.set(null);
      this.mfaEnrolment.set(null);
      this.mfaChallengePending.set(false);
    }
  }

  async refreshSession(): Promise<void> {
    await firstValueFrom(
      this.http.post<{ refreshed: true }>('/api/auth/refresh', {}, { withCredentials: true }),
    );
  }

  /**
   * Loads the current user from the access cookie. `/api/auth/me` evaluates
   * the MFA requirement live, so a page load locks a not-yet-enrolled session
   * into the wizard right away (and lifts a stale lock). Clears the user on
   * failure.
   */
  async loadCurrent(): Promise<void> {
    try {
      const me = await firstValueFrom(
        this.http.get<AuthMeResponse>('/api/auth/me', { withCredentials: true }),
      );
      this.user.set({ userId: me.userId, email: me.email, isSuperAdmin: me.isSuperAdmin });
      this.applyEnrolmentFlag(me.mfaEnrolmentRequired);
    } catch {
      this.user.set(null);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/change-password',
        { currentPassword, newPassword },
        { withCredentials: true },
      ),
    );
  }

  /** `name` only on an invitation link; a password reset leaves the name alone. */
  async setPassword(token: string, newPassword: string, name?: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/set-password',
        { token, newPassword, name },
        { withCredentials: true },
      ),
    );
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>('/api/auth/forgot-password', { email }, { withCredentials: true }),
    );
  }

  /** Self-signup: create an account + organisation. Backend emails a verify link. */
  async register(email: string, password: string, organisationName: string): Promise<void> {
    // The new organisation's schedules run in this zone; without it the backend uses UTC.
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/register',
        { email, password, organisationName, timeZone },
        { withCredentials: true },
      ),
    );
  }

  /**
   * Confirm the verification token. The backend auto-logs-in (sets cookies) —
   * unless the user has TOTP, then it starts a login challenge instead.
   */
  async verifyEmail(token: string): Promise<LoginOutcome> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/verify-email', { token }, { withCredentials: true }),
    );
    return this.applyFirstFactor(res);
  }

  async resendVerification(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>('/api/auth/resend-verification', { email }, { withCredentials: true }),
    );
  }

  async changeEmail(newEmail: string, currentPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/change-email',
        { newEmail, currentPassword },
        { withCredentials: true },
      ),
    );
  }

  async confirmEmailChange(token: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>('/api/auth/confirm-email-change', { token }, { withCredentials: true }),
    );
  }

  /** Permanently deletes the current account, then clears local auth state. */
  async deleteAccount(currentPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/delete-account',
        { currentPassword },
        { withCredentials: true },
      ),
    );
    this.user.set(null);
  }

  private applyEnrolmentFlag(mfaEnrolmentRequired: boolean): void {
    if (mfaEnrolmentRequired) {
      this.requireEnrolment();
    } else {
      this.mfaEnrolment.set(null);
    }
  }

  private applyFirstFactor(res: LoginResponse): LoginOutcome {
    if (isMfaRequired(res)) {
      this.user.set(null);
      this.mfaChallengePending.set(true);
      return 'mfa-required';
    }
    this.mfaChallengePending.set(false);
    return this.applySession(res);
  }
}
