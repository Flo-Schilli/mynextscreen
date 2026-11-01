import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import type { LoginMfaRequest } from '@mynextscreen/shared-types';
import { AuthService, MFA_ENROLMENT_ROUTE, type LoginOutcome } from '../auth/auth.service';
import { MfaCodeInputComponent, TOTP_CODE_LENGTH } from '../auth/mfa-code-input';
import { httpStatus, mfaErrorCode } from '../auth/mfa-errors';
import { SetupService } from '../setup/setup.service';
import { ToastService } from '../shared/toast/toast.service';
import { VersionBadge } from '../shared/version-badge';
import { BtnComponent, IconComponent } from '../ui';

@Component({
  selector: 'app-login',
  imports: [
    // FormsModule: NgForm handles (ngSubmit) on the second-step forms (no formGroup).
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    VersionBadge,
    BtnComponent,
    IconComponent,
    MfaCodeInputComponent,
    TranslocoDirective,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly setup = inject(SetupService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);

  /** Notice shown after redirect (e.g. account deletion). */
  readonly notice = signal<string | null>(
    this.route.snapshot.queryParamMap.get('notice') === 'account-deleted'
      ? this.transloco.translate('auth.notice.accountDeleted')
      : null,
  );

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  /** i18n keys for the brand-panel feature ticks. */
  readonly ticks = [
    'auth.brand.ticks.pair',
    'auth.brand.ticks.schedule',
    'auth.brand.ticks.monitor',
  ] as const;

  /** Set when the backend rejects login with 403 "Email not verified". */
  readonly needsVerification = signal(false);
  readonly resending = signal(false);
  readonly resent = signal(false);

  /** Drives the "Create account" link; populated by the login guard's status check. */
  readonly signupEnabled = this.setup.signupEnabled;

  /**
   * Password first; a TOTP user then enters the second factor in the same
   * view. Starts at the second step when another page (verify-email) already
   * opened a challenge.
   */
  readonly step = signal<'password' | 'mfa'>(this.auth.mfaChallengePending() ? 'mfa' : 'password');
  readonly mfaMethod = signal<'totp' | 'recovery'>('totp');
  readonly code = signal('');
  readonly recoveryCode = signal('');
  /** Inline hint under the code field after a wrong code. */
  readonly codeError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.needsVerification.set(false);
    this.resent.set(false);
    const { email, password } = this.form.getRawValue();
    try {
      const outcome = await this.auth.login(email, password);
      if (outcome === 'mfa-required') {
        this.enterMfaStep();
        return;
      }
      await this.navigateAfterSignIn(outcome);
    } catch (err: unknown) {
      if (httpStatus(err) === 429) {
        this.toastTooManyAttempts(err);
      } else if (httpStatus(err) === 403) {
        this.needsVerification.set(true);
        this.error.set(this.transloco.translate('auth.errors.notVerified'));
      } else {
        this.error.set(this.transloco.translate('auth.errors.invalidCredentials'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  async resendVerification(): Promise<void> {
    const email = this.form.getRawValue().email;
    if (!email || this.resending()) {
      return;
    }
    this.resending.set(true);
    try {
      await this.auth.resendVerification(email);
      this.resent.set(true);
    } finally {
      this.resending.set(false);
    }
  }

  onCodeChange(code: string): void {
    this.code.set(code);
    this.codeError.set(null);
  }

  onRecoveryInput(event: Event): void {
    this.recoveryCode.set((event.target as HTMLInputElement).value);
    this.codeError.set(null);
  }

  /** Auto-submit target of the code field and the explicit submit button. */
  async submitCode(): Promise<void> {
    const code = this.code();
    if (code.length !== TOTP_CODE_LENGTH) {
      this.codeError.set(this.transloco.translate('auth.mfa.login.codeIncomplete'));
      return;
    }
    await this.verify({ code });
  }

  async submitRecoveryCode(): Promise<void> {
    const recoveryCode = this.recoveryCode().trim();
    if (!recoveryCode) {
      this.codeError.set(this.transloco.translate('auth.mfa.login.recoveryRequired'));
      return;
    }
    await this.verify({ recoveryCode });
  }

  useRecoveryCode(): void {
    this.mfaMethod.set('recovery');
    this.code.set('');
    this.codeError.set(null);
  }

  useAuthenticator(): void {
    this.mfaMethod.set('totp');
    this.recoveryCode.set('');
    this.codeError.set(null);
  }

  /** Back to the password; the server-side challenge is simply left to expire. */
  backToPassword(): void {
    this.auth.abandonMfaChallenge();
    this.step.set('password');
    this.mfaMethod.set('totp');
    this.code.set('');
    this.recoveryCode.set('');
    this.codeError.set(null);
    this.form.controls.password.reset('');
  }

  private enterMfaStep(): void {
    this.step.set('mfa');
    this.mfaMethod.set('totp');
    this.code.set('');
    this.recoveryCode.set('');
    this.codeError.set(null);
  }

  private async verify(input: LoginMfaRequest): Promise<void> {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.codeError.set(null);
    try {
      const outcome = await this.auth.verifyMfa(input);
      this.code.set('');
      this.recoveryCode.set('');
      await this.navigateAfterSignIn(outcome);
    } catch (err: unknown) {
      this.code.set('');
      const code = mfaErrorCode(err);
      if (code === 'MFA_CHALLENGE_EXPIRED') {
        this.toast.error(this.transloco.translate('auth.mfa.login.challengeExpired'));
        this.backToPassword();
      } else if (httpStatus(err) === 429) {
        this.toastTooManyAttempts(err);
      } else if (code === 'MFA_INVALID_CODE') {
        this.codeError.set(
          this.transloco.translate(
            this.mfaMethod() === 'recovery'
              ? 'auth.mfa.login.invalidRecoveryCode'
              : 'auth.mfa.login.invalidCode',
          ),
        );
      } else {
        this.toast.error(this.transloco.translate('auth.mfa.login.genericError'));
      }
    } finally {
      this.submitting.set(false);
    }
  }

  private toastTooManyAttempts(err: unknown): void {
    this.toast.error(
      this.transloco.translate(
        mfaErrorCode(err) === 'MFA_LOCKED_OUT'
          ? 'auth.mfa.login.lockedOut'
          : 'auth.mfa.login.tooManyAttempts',
      ),
    );
  }

  private async navigateAfterSignIn(outcome: Exclude<LoginOutcome, 'mfa-required'>): Promise<void> {
    await this.router.navigateByUrl(outcome === 'enrolment-required' ? MFA_ENROLMENT_ROUTE : '/');
  }
}
