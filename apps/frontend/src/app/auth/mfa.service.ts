import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  MfaStatusResponse,
  RecoveryCodesResponse,
  TotpSetupResponse,
} from '@mynextscreen/shared-types';
import { firstValueFrom } from 'rxjs';
import { isMfaMandatory } from './mfa-requirement';

/** At or below this many unused recovery codes the UI warns the user. */
export const LOW_RECOVERY_CODES_THRESHOLD = 3;

const BASE = '/api/auth/mfa';

/**
 * Self-service MFA management (`/api/auth/mfa/*`). Secrets, codes and recovery
 * codes pass through as return values only — this service never keeps them.
 * It caches the last status so the settings page and the guard share one view.
 */
@Injectable({ providedIn: 'root' })
export class MfaService {
  private readonly http = inject(HttpClient);

  readonly status = signal<MfaStatusResponse | null>(null);

  /** MFA is mandatory for this user (super-admin or an org requiring it). */
  readonly isRequired = computed(() => isMfaMandatory(this.status()?.requiredBy));

  readonly lowRecoveryCodes = computed(() => {
    const status = this.status();
    return (
      status !== null &&
      status.totpEnabled &&
      status.recoveryCodesRemaining <= LOW_RECOVERY_CODES_THRESHOLD
    );
  });

  async loadStatus(): Promise<MfaStatusResponse> {
    const status = await firstValueFrom(this.http.get<MfaStatusResponse>(`${BASE}/status`));
    this.status.set(status);
    return status;
  }

  /**
   * Starts (or restarts) enrolment. `code` is required by the backend when TOTP
   * is already active — that is the device change.
   */
  async startSetup(currentPassword: string, code?: string): Promise<TotpSetupResponse> {
    const body = code === undefined ? { currentPassword } : { currentPassword, code };
    return firstValueFrom(this.http.post<TotpSetupResponse>(`${BASE}/totp/setup`, body));
  }

  /** Persists the factor; the backend replaces the session with an MFA-confirmed one. */
  async confirmSetup(code: string): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.post<RecoveryCodesResponse>(`${BASE}/totp/confirm`, { code }),
    );
    return res.recoveryCodes;
  }

  /** 409 `MFA_DISABLE_FORBIDDEN` while MFA is mandatory for the user. */
  async disable(currentPassword: string, code: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${BASE}/totp/disable`, { currentPassword, code }));
  }

  /** Needs the current password and a valid TOTP code, like every other factor change. */
  async regenerateRecoveryCodes(currentPassword: string, code: string): Promise<string[]> {
    const res = await firstValueFrom(
      this.http.post<RecoveryCodesResponse>(`${BASE}/recovery-codes/regenerate`, {
        currentPassword,
        code,
      }),
    );
    return res.recoveryCodes;
  }

  /** Drops the cached status (logout, user switch). */
  reset(): void {
    this.status.set(null);
  }
}
