import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

interface AuthSuccessResponse {
  user: AuthenticatedUser;
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

  async login(email: string, password: string): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<AuthSuccessResponse>(
          '/api/auth/login',
          { email, password },
          { withCredentials: true },
        ),
      );
      this.user.set(res.user);
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>('/api/auth/logout', {}, { withCredentials: true }));
    } finally {
      this.user.set(null);
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

  async setPassword(token: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/set-password',
        { token, newPassword },
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
    await firstValueFrom(
      this.http.post<void>(
        '/api/auth/register',
        { email, password, organisationName },
        { withCredentials: true },
      ),
    );
  }

  /** Confirm the verification token; the backend auto-logs-in (sets cookies). */
  async verifyEmail(token: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthSuccessResponse>(
        '/api/auth/verify-email',
        { token },
        { withCredentials: true },
      ),
    );
    this.user.set(res.user);
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
}
