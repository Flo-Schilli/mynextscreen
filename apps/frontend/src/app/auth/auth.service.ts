import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AuthSuccessResponse,
  AuthUserView,
  LoginMfaRequest,
  LoginResponse,
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

/** Why the mandatory enrolment wizard is shown. */
export type MfaEnrolmentReason =
  { kind: 'super-admin' } | { kind: 'organisation'; organisationId: string | null };

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
   * Set while the session may only reach the MFA enrolment wizard (backend
   * answered `MFA_ENROLMENT_REQUIRED` / `MFA_REQUIRED`, or a login said so).
   */
  readonly mfaEnrolment = signal<MfaEnrolmentReason | null>(null);
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

  /** Sessions without MFA may only reach the wizard from now on. */
  requireEnrolment(reason: MfaEnrolmentReason): void {
    this.mfaEnrolment.set(reason);
  }

  clearEnrolment(): void {
    this.mfaEnrolment.set(null);
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
    if (res.mfaEnrolmentRequired) {
      this.mfaEnrolment.set({ kind: 'super-admin' });
      return 'enrolment-required';
    }
    this.mfaEnrolment.set(null);
    return 'ok';
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

  /** Loads the current user from the access cookie. Clears state on failure. */
  async loadCurrent(): Promise<void> {
    try {
      const me = await firstValueFrom(
        this.http.get<AuthenticatedUser>('/api/auth/me', { withCredentials: true }),
      );
      this.user.set(me);
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
