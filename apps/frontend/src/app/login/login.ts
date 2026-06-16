import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SetupService } from '../setup/setup.service';
import { VersionBadge } from '../shared/version-badge';
import { BtnComponent, IconComponent } from '../ui';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, VersionBadge, BtnComponent, IconComponent],
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

  /** Notice shown after redirect (e.g. account deletion). */
  readonly notice = signal<string | null>(
    this.route.snapshot.queryParamMap.get('notice') === 'account-deleted'
      ? 'Account gelöscht.'
      : null,
  );

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly ticks = [
    'Pair any screen in seconds',
    'Schedule content across locations',
    'Monitor every display in real time',
  ] as const;

  /** Set when the backend rejects login with 403 "Email not verified". */
  readonly needsVerification = signal(false);
  readonly resending = signal(false);
  readonly resent = signal(false);

  /** Drives the "Create account" link; populated by the login guard's status check. */
  readonly signupEnabled = this.setup.signupEnabled;

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
      await this.auth.login(email, password);
      await this.router.navigateByUrl('/');
    } catch (err: unknown) {
      if ((err as { status?: number })?.status === 403) {
        this.needsVerification.set(true);
        this.error.set('Please verify your email before signing in.');
      } else {
        this.error.set('Invalid email or password.');
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
}
