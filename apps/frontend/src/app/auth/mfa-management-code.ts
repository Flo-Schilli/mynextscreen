import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MfaCodeInputComponent, TOTP_CODE_LENGTH } from './mfa-code-input';

const TOTP_CODE = new RegExp(`^\\d{${TOTP_CODE_LENGTH}}$`);
/** Mirrors the backend's `RECOVERY_CODE_PATTERN`: `xxxxx-xxxxx`, dash optional, any case. */
const RECOVERY_CODE = /^[a-z2-7]{5}-?[a-z2-7]{5}$/i;

/**
 * True when `code` is a complete TOTP code or a well-formed recovery code —
 * what device change, disable and regeneration accept as "current code".
 */
export function isManagementCodeComplete(code: string): boolean {
  const trimmed = code.trim();
  return TOTP_CODE.test(trimmed) || RECOVERY_CODE.test(trimmed);
}

/**
 * "Current code" field of an MFA management action: the six-digit
 * authenticator code, with a switch to a recovery code for users whose
 * authenticator is gone. Switching clears the value.
 */
@Component({
  selector: 'app-mfa-management-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MfaCodeInputComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      @if (method() === 'totp') {
        <app-mfa-code-input
          [inputId]="inputId()"
          [label]="label()"
          [value]="value()"
          [disabled]="disabled()"
          [invalid]="invalid()"
          (valueChange)="valueChange.emit($event)"
          (completed)="completed.emit($event)"
        />
        <button
          type="button"
          class="use-recovery mt-2 text-[12.5px] font-semibold text-accent hover:opacity-80"
          [disabled]="disabled()"
          (click)="switchTo('recovery')"
        >
          {{ t('auth.mfa.login.useRecoveryCode') }}
        </button>
      } @else {
        <input
          [id]="inputId()"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          maxlength="11"
          placeholder="xxxxx-xxxxx"
          [attr.aria-label]="t('auth.mfa.login.recoveryLabel')"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          [value]="value()"
          [disabled]="disabled()"
          (input)="onRecoveryInput($event)"
          class="recovery-input w-full rounded-[12px] border bg-surface-2 px-3.5 py-3 text-center font-mono text-[16px] tracking-[0.15em] text-text outline-none placeholder:text-faint focus:border-accent"
          [class.border-offline]="invalid()"
          [class.border-border]="!invalid()"
        />
        <button
          type="button"
          class="use-authenticator mt-2 text-[12.5px] font-semibold text-accent hover:opacity-80"
          [disabled]="disabled()"
          (click)="switchTo('totp')"
        >
          {{ t('auth.mfa.login.useAuthenticator') }}
        </button>
      }
    </ng-container>
  `,
  host: { style: 'display:block' },
})
export class MfaManagementCodeComponent {
  readonly inputId = input<string>('mfa-management-code');
  readonly label = input<string>('');
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);

  readonly valueChange = output<string>();
  /** Six TOTP digits are in (recovery codes are submitted explicitly). */
  readonly completed = output<string>();

  protected readonly method = signal<'totp' | 'recovery'>('totp');

  protected switchTo(method: 'totp' | 'recovery'): void {
    this.method.set(method);
    this.valueChange.emit('');
  }

  protected onRecoveryInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value.trim());
  }
}
