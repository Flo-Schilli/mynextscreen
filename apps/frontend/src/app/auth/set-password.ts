import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthService } from './auth.service';
import { BtnComponent, IconComponent } from '../ui';

@Component({
  selector: 'app-set-password',
  imports: [ReactiveFormsModule, BtnComponent, IconComponent, TranslocoDirective],
  templateUrl: './set-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  private readonly token = this.route.snapshot.queryParamMap.get('t') ?? '';

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);
  readonly hasToken = signal(this.token.length > 0);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting() || !this.hasToken()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.setPassword(this.token, this.form.getRawValue().newPassword);
      this.done.set(true);
      await this.router.navigateByUrl('/login');
    } catch {
      this.error.set(this.transloco.translate('auth.setPassword.errors.invalidLink'));
    } finally {
      this.submitting.set(false);
    }
  }
}
