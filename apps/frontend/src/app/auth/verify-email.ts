import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService, MFA_ENROLMENT_ROUTE, type LoginOutcome } from './auth.service';
import { BtnComponent, IconComponent } from '../ui';

type State = 'verifying' | 'error';

/**
 * Reads the `?t=` token, confirms the email, and (the backend auto-logs-in by
 * setting cookies) redirects to the dashboard. On failure it offers a resend.
 */
@Component({
  selector: 'app-verify-email',
  imports: [BtnComponent, IconComponent, TranslocoDirective],
  templateUrl: './verify-email.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmail implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  private readonly token = this.route.snapshot.queryParamMap.get('t') ?? '';

  readonly state = signal<State>('verifying');
  readonly resending = signal(false);
  readonly resent = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.state.set('error');
      return;
    }
    try {
      const outcome = await this.auth.verifyEmail(this.token);
      await this.router.navigateByUrl(this.targetFor(outcome));
    } catch {
      this.state.set('error');
    }
  }

  /**
   * A TOTP user gets a login challenge instead of a session: the login page
   * opens straight at the code step (the challenge cookie is already set).
   */
  private targetFor(outcome: LoginOutcome | undefined): string {
    switch (outcome) {
      case 'mfa-required':
        return '/login';
      case 'enrolment-required':
        return MFA_ENROLMENT_ROUTE;
      default:
        return '/';
    }
  }

  async resend(): Promise<void> {
    const email = window.prompt(this.transloco.translate('auth.verifyEmail.resendPrompt'));
    if (!email) {
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
