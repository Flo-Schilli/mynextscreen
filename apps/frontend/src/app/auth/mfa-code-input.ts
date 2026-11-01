import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Length of a TOTP code. */
export const TOTP_CODE_LENGTH = 6;

/** Keeps the digits only and caps the result at {@link TOTP_CODE_LENGTH}. */
export function normaliseTotpCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, TOTP_CODE_LENGTH);
}

/**
 * Six-digit authenticator code field. Lets the browser / OS offer the code
 * (`one-time-code`), opens the numeric keypad, and emits `completed` once six
 * digits are in so hosts can auto-submit.
 */
@Component({
  selector: 'app-mfa-code-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      [id]="inputId()"
      type="text"
      name="one-time-code"
      autocomplete="one-time-code"
      inputmode="numeric"
      pattern="[0-9]*"
      [attr.maxlength]="maxLength"
      [attr.aria-label]="label()"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      [placeholder]="placeholder"
      [value]="value()"
      [disabled]="disabled()"
      (input)="onInput($event)"
      class="w-full rounded-[12px] border bg-surface-2 py-3 text-center font-mono text-[22px] tracking-[0.4em] text-text outline-none transition-all duration-[150ms] placeholder:text-faint focus:border-accent"
      [class.border-offline]="invalid()"
      [class.border-border]="!invalid()"
    />
  `,
  host: { style: 'display:block' },
})
export class MfaCodeInputComponent {
  readonly inputId = input<string>('mfa-code');
  readonly label = input<string>('');
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);

  readonly valueChange = output<string>();
  readonly completed = output<string>();

  protected readonly maxLength = TOTP_CODE_LENGTH;
  protected readonly placeholder = '••••••';

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const code = normaliseTotpCode(target.value);
    // Write the cleaned value back so pasted spaces / letters disappear at once.
    target.value = code;
    this.valueChange.emit(code);
    if (code.length === TOTP_CODE_LENGTH) {
      this.completed.emit(code);
    }
  }
}
