import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { AuthService } from './auth.service';
import { IconComponent } from '../ui';

type State = 'confirming' | 'done' | 'error';

/** Reads the `?t=` token and confirms an email-address change. */
@Component({
  selector: 'app-confirm-email-change',
  imports: [IconComponent, TranslocoDirective],
  templateUrl: './confirm-email-change.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEmailChange implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly token = this.route.snapshot.queryParamMap.get('t') ?? '';

  readonly state = signal<State>('confirming');

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.state.set('error');
      return;
    }
    try {
      await this.auth.confirmEmailChange(this.token);
      this.state.set('done');
    } catch {
      this.state.set('error');
    }
  }
}
