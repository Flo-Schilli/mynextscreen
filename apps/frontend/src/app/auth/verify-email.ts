import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from './auth.service';
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
      await this.auth.verifyEmail(this.token);
      await this.router.navigateByUrl('/');
    } catch {
      this.state.set('error');
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
