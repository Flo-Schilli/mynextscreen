import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService, type AuthenticatedUser } from '../auth/auth.service';

interface SetupStatusResponse {
  setupNeeded: boolean;
}

interface AuthSuccessResponse {
  user: AuthenticatedUser;
}

/**
 * First-run setup: on a fresh deployment (no user yet) the first visitor creates
 * the initial super-admin via the UI, replacing env-based seeding. The create
 * call logs them in (cookies set by the backend), so we seed the auth user
 * signal directly — same effect as AuthService.login().
 */
@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** null = not yet checked. */
  readonly setupNeeded = signal<boolean | null>(null);

  async checkStatus(): Promise<boolean> {
    const res = await firstValueFrom(
      this.http.get<SetupStatusResponse>('/api/auth/setup-status', { withCredentials: true }),
    );
    this.setupNeeded.set(res.setupNeeded);
    return res.setupNeeded;
  }

  async createFirstAdmin(email: string, password: string, name?: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthSuccessResponse>(
        '/api/auth/setup',
        { email, password, name },
        { withCredentials: true },
      ),
    );
    this.auth.user.set(res.user);
    this.setupNeeded.set(false);
  }
}
