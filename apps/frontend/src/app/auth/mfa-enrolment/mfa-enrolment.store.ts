import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { TotpSetupResponse } from '@mynextscreen/shared-types';
import { AuthService } from '../auth.service';
import { httpStatus, mfaErrorCode } from '../mfa-errors';
import { MfaService } from '../mfa.service';
import { ToastService } from '../../shared/toast/toast.service';

export type EnrolmentStep = 'password' | 'scan' | 'verify' | 'codes';

/** Ordered steps, for the progress indicator. */
export const ENROLMENT_STEPS: readonly EnrolmentStep[] = ['password', 'scan', 'verify', 'codes'];

/**
 * State + actions of one TOTP enrolment run. Provided per wizard instance:
 * the secret, the QR code and the recovery codes live only here and are wiped
 * when the wizard is destroyed (route left, dialog closed) — nothing is
 * persisted or logged.
 */
@Injectable()
export class MfaEnrolmentStore {
  private readonly mfa = inject(MfaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  readonly step = signal<EnrolmentStep>('password');
  readonly busy = signal(false);
  readonly setup = signal<TotpSetupResponse | null>(null);
  readonly recoveryCodes = signal<readonly string[]>([]);
  readonly acknowledged = signal(false);
  /** Inline hint for the field of the current step. */
  readonly fieldError = signal<string | null>(null);

  readonly stepIndex = computed(() => ENROLMENT_STEPS.indexOf(this.step()));
  /** The factor is active once the codes are shown, so leaving is safe only after acknowledging. */
  readonly canFinish = computed(() => this.step() === 'codes' && this.acknowledged());
  /** Before confirmation nothing changed server-side; after it, only with the codes saved. */
  readonly canLeave = computed(() => this.step() !== 'codes' || this.acknowledged());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  /**
   * Step 1: proof of identity. `currentCode` is required by the backend when
   * TOTP is already active (device change).
   */
  async start(currentPassword: string, currentCode?: string): Promise<boolean> {
    if (this.busy()) {
      return false;
    }
    this.busy.set(true);
    this.fieldError.set(null);
    try {
      this.setup.set(await this.mfa.startSetup(currentPassword, currentCode));
      this.step.set('scan');
      return true;
    } catch (err: unknown) {
      const code = mfaErrorCode(err);
      if (code === 'MFA_INVALID_PASSWORD') {
        this.fieldError.set(this.translate('auth.mfa.enrol.errors.invalidPassword'));
      } else if (code === 'MFA_INVALID_CODE') {
        // Device change: the code of the current authenticator was wrong.
        this.fieldError.set(this.translate('auth.mfa.enrol.errors.invalidCurrentCode'));
      } else {
        this.toastFailure(err);
      }
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  goToVerify(): void {
    if (this.setup()) {
      this.fieldError.set(null);
      this.step.set('verify');
    }
  }

  backToScan(): void {
    this.fieldError.set(null);
    this.step.set('scan');
  }

  /**
   * Step 3: the first code. On success the backend persists the factor, hands
   * out the recovery codes once and replaces the session with an
   * MFA-confirmed one — so the wizard lock is lifted right away.
   */
  async confirm(code: string): Promise<boolean> {
    if (this.busy()) {
      return false;
    }
    this.busy.set(true);
    this.fieldError.set(null);
    try {
      const codes = await this.mfa.confirmSetup(code);
      // The secret is no longer needed once the factor is persisted.
      this.setup.set(null);
      this.recoveryCodes.set(codes);
      this.acknowledged.set(false);
      this.step.set('codes');
      await this.auth.completeEnrolment();
      return true;
    } catch (err: unknown) {
      if (mfaErrorCode(err) === 'MFA_INVALID_CODE') {
        this.fieldError.set(this.translate('auth.mfa.enrol.errors.invalidCode'));
      } else if (httpStatus(err) === 400) {
        // Pending secret expired (10 min) — start over from the password.
        this.toast.error(this.translate('auth.mfa.enrol.errors.setupExpired'));
        this.restart();
      } else {
        this.toastFailure(err);
      }
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  setAcknowledged(value: boolean): void {
    this.acknowledged.set(value);
  }

  /** Back to the first step, dropping any pending secret. */
  restart(): void {
    this.setup.set(null);
    this.fieldError.set(null);
    this.step.set('password');
  }

  /** Wipes every secret this run has seen. */
  reset(): void {
    this.setup.set(null);
    this.recoveryCodes.set([]);
    this.acknowledged.set(false);
    this.fieldError.set(null);
    this.step.set('password');
  }

  private toastFailure(err: unknown): void {
    this.toast.error(
      this.translate(
        httpStatus(err) === 429
          ? 'auth.mfa.enrol.errors.tooManyAttempts'
          : 'auth.mfa.enrol.errors.generic',
      ),
    );
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }
}
