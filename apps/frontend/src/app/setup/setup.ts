import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { SetupService } from './setup.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { mismatch: true };
}

/**
 * First-run setup screen: create the initial super-admin account. Reachable only
 * while no user exists (guarded by setupGuard); on success the backend logs the
 * user in and we navigate to the dashboard.
 */
@Component({
  selector: 'app-setup',
  imports: [ReactiveFormsModule],
  templateUrl: './setup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Setup {
  private readonly fb = inject(FormBuilder);
  private readonly setup = inject(SetupService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      name: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const { name, email, password } = this.form.getRawValue();
    try {
      await this.setup.createFirstAdmin(email, password, name || undefined);
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('Could not complete setup. It may already be done — try signing in.');
    } finally {
      this.submitting.set(false);
    }
  }
}
