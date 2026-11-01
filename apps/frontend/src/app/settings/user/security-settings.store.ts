import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { httpStatus, mfaErrorCode } from '../../auth/mfa-errors';
import { describeMfaRequirement } from '../../auth/mfa-requirement';
import { MfaService } from '../../auth/mfa.service';
import { ToastService } from '../../shared/toast/toast.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';

export type SecurityDialog = 'enrol' | 'device' | 'regenerate' | 'disable';

/** Translation key + params explaining why MFA cannot be switched off. */
export interface RequiredReason {
  key: string;
  params: Record<string, string | number>;
}

/**
 * State + actions of the "Security" section in the user settings. Freshly
 * regenerated recovery codes are held only while their dialog is open and
 * wiped when it closes or the page is left.
 */
@Injectable()
export class SecuritySettingsStore {
  private readonly mfa = inject(MfaService);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly orgState = inject(OrganisationStateService);

  readonly status = this.mfa.status;
  readonly isRequired = this.mfa.isRequired;
  readonly lowRecoveryCodes = this.mfa.lowRecoveryCodes;
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  readonly dialog = signal<SecurityDialog | null>(null);
  readonly busy = signal(false);
  readonly fieldError = signal<string | null>(null);
  readonly regeneratedCodes = signal<readonly string[]>([]);
  readonly codesAcknowledged = signal(false);
  /** Freshly regenerated codes are shown but not yet confirmed as saved. */
  readonly regeneratedCodesPending = computed(
    () => this.regeneratedCodes().length > 0 && !this.codesAcknowledged(),
  );

  /** Why the "Disable" action is missing, or null while MFA is optional. */
  readonly requiredReason = computed((): RequiredReason | null => {
    const text = describeMfaRequirement(this.status()?.requiredBy, this.orgState.organisations());
    return text
      ? { key: `settings.user.security.required${text.variant}`, params: text.params }
      : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearSecrets());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      await this.mfa.loadStatus();
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  open(dialog: SecurityDialog): void {
    this.clearSecrets();
    this.fieldError.set(null);
    this.dialog.set(dialog);
  }

  /**
   * Closes the open dialog unless fresh recovery codes still wait for "saved"
   * — the regenerated ones held here, or the wizard's (`canLeave` false).
   */
  close(canLeave = true): boolean {
    if (!canLeave || this.regeneratedCodesPending()) {
      this.toast.info(this.translate('settings.user.security.toast.saveCodesFirst'));
      return false;
    }
    this.clearSecrets();
    this.fieldError.set(null);
    this.dialog.set(null);
    return true;
  }

  async onEnrolmentFinished(): Promise<void> {
    const deviceChange = this.dialog() === 'device';
    this.dialog.set(null);
    this.toast.success(
      this.translate(
        deviceChange
          ? 'settings.user.security.toast.deviceChanged'
          : 'settings.user.security.toast.enabled',
      ),
    );
    await this.load();
  }

  async regenerate(currentPassword: string, code: string): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.fieldError.set(null);
    try {
      this.regeneratedCodes.set(await this.mfa.regenerateRecoveryCodes(currentPassword, code));
      this.codesAcknowledged.set(false);
      await this.load();
    } catch (err: unknown) {
      this.handleError(err);
    } finally {
      this.busy.set(false);
    }
  }

  async disable(currentPassword: string, code: string): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.fieldError.set(null);
    try {
      await this.mfa.disable(currentPassword, code);
      this.dialog.set(null);
      this.toast.success(this.translate('settings.user.security.toast.disabled'));
      await this.load();
    } catch (err: unknown) {
      if (mfaErrorCode(err) === 'MFA_DISABLE_FORBIDDEN') {
        this.dialog.set(null);
        this.toast.error(this.translate('settings.user.security.toast.disableForbidden'));
        await this.load();
      } else {
        this.handleError(err);
      }
    } finally {
      this.busy.set(false);
    }
  }

  setCodesAcknowledged(value: boolean): void {
    this.codesAcknowledged.set(value);
  }

  private handleError(err: unknown): void {
    const code = mfaErrorCode(err);
    if (code === 'MFA_INVALID_PASSWORD') {
      this.fieldError.set(this.translate('settings.user.security.errors.invalidPassword'));
    } else if (code === 'MFA_INVALID_CODE') {
      this.fieldError.set(this.translate('settings.user.security.errors.invalidCode'));
    } else if (httpStatus(err) === 429) {
      this.toast.error(this.translate('settings.user.security.errors.tooManyAttempts'));
    } else {
      this.toast.error(this.translate('settings.user.security.errors.generic'));
    }
  }

  private clearSecrets(): void {
    this.regeneratedCodes.set([]);
    this.codesAcknowledged.set(false);
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }
}
