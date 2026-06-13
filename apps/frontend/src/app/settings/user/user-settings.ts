import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  NotificationPreferencesService,
  NotificationPreferences,
} from './notification-preferences.service';
import { AuthService } from '../../auth/auth.service';
import { ProfileService } from './profile.service';
import { ToastService } from '../../shared/toast/toast.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const next = control.get('newPassword')?.value;
  const confirm = control.get('confirmNewPassword')?.value;
  return next === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>User Settings</h1>
        </div>
      </header>

      <section class="section">
        <h2 class="section-title">Profile</h2>
        <p class="section-desc">Your account details and display name.</p>
        <form [formGroup]="profileForm" (ngSubmit)="submitProfile()" class="form-grid">
          <div class="field">
            <span class="field-label">Email</span>
            <input type="email" [value]="profileEmail" disabled />
            <span class="field-note">
              Change your email below; we'll send a confirmation link first.
            </span>
          </div>
          <label class="field">
            <span class="field-label">Display name</span>
            <input
              type="text"
              formControlName="name"
              autocomplete="name"
              placeholder="Your name"
              maxlength="255"
            />
            @if (profileForm.controls.name.touched && profileForm.controls.name.invalid) {
              <span class="field-error">Name must be 255 characters or fewer.</span>
            }
          </label>
          <div>
            <button type="submit" class="primary-btn" [disabled]="savingProfile || loadingProfile">
              {{ savingProfile ? 'Saving…' : 'Save profile' }}
            </button>
          </div>
        </form>
      </section>

      <section class="section">
        <h2 class="section-title">Notification Channels</h2>
        <p class="section-desc">
          Choose how you receive notifications. These apply across all organisations you belong to.
        </p>

        @if (loading) {
          <p class="loading-text">Loading preferences...</p>
        }

        @if (loadError) {
          <p class="error">{{ loadError }}</p>
        }

        @if (!loading && !loadError && preferences) {
          <div class="toggle-list">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">In-app</span>
                <span class="toggle-desc">Receive notifications in the dashboard</span>
              </div>
              <button
                class="toggle-switch"
                [class.active]="preferences.inAppEnabled"
                (click)="toggle('inAppEnabled')"
                role="switch"
                [attr.aria-checked]="preferences.inAppEnabled"
                aria-label="Toggle in-app notifications"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Email</span>
                <span class="toggle-desc">Receive notifications by email</span>
                <span class="toggle-note">Sent for organisations that have email configured</span>
              </div>
              <button
                class="toggle-switch"
                [class.active]="preferences.emailEnabled"
                (click)="toggle('emailEnabled')"
                role="switch"
                [attr.aria-checked]="preferences.emailEnabled"
                aria-label="Toggle email notifications"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>

            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">ntfy</span>
                <span class="toggle-desc">Receive notifications via ntfy</span>
                <span class="toggle-note">Sent for organisations that have ntfy configured</span>
              </div>
              <button
                class="toggle-switch"
                [class.active]="preferences.ntfyEnabled"
                (click)="toggle('ntfyEnabled')"
                role="switch"
                [attr.aria-checked]="preferences.ntfyEnabled"
                aria-label="Toggle ntfy notifications"
              >
                <span class="toggle-knob"></span>
              </button>
            </div>
          </div>
        }
      </section>

      <section class="section">
        <h2 class="section-title">Change password</h2>
        <p class="section-desc">Update the password you use to sign in.</p>
        <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()" class="form-grid">
          <label class="field">
            <span class="field-label">Current password</span>
            <input
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
            />
          </label>
          <label class="field">
            <span class="field-label">New password</span>
            <input type="password" formControlName="newPassword" autocomplete="new-password" />
            @if (
              passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid
            ) {
              <span class="field-error">Use at least 8 characters.</span>
            }
          </label>
          <label class="field">
            <span class="field-label">Confirm new password</span>
            <input
              type="password"
              formControlName="confirmNewPassword"
              autocomplete="new-password"
            />
            @if (passwordForm.touched && passwordForm.hasError('mismatch')) {
              <span class="field-error">Passwords do not match.</span>
            }
          </label>
          <div>
            <button type="submit" class="primary-btn" [disabled]="savingPassword">
              {{ savingPassword ? 'Saving…' : 'Update password' }}
            </button>
          </div>
        </form>
      </section>

      <section class="section">
        <h2 class="section-title">Change email</h2>
        <p class="section-desc">
          We'll send a confirmation link to the new address; the change applies once you confirm it.
        </p>
        <form [formGroup]="emailForm" (ngSubmit)="submitEmail()" class="form-grid">
          <label class="field">
            <span class="field-label">New email</span>
            <input type="email" formControlName="newEmail" autocomplete="email" />
            @if (emailForm.controls.newEmail.touched && emailForm.controls.newEmail.invalid) {
              <span class="field-error">Enter a valid email address.</span>
            }
          </label>
          <label class="field">
            <span class="field-label">Current password</span>
            <input
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
            />
          </label>
          <div>
            <button type="submit" class="primary-btn" [disabled]="savingEmail">
              {{ savingEmail ? 'Sending…' : 'Send confirmation link' }}
            </button>
          </div>
        </form>
      </section>

      <section class="section danger-zone">
        <h2 class="section-title">Danger Zone</h2>
        <p class="section-desc">
          Permanently delete your account. This removes your organisation memberships and cannot be
          undone.
        </p>
        <button type="button" class="btn btn-danger" (click)="openDeleteAccount()">
          Account löschen
        </button>
      </section>
    </div>

    @if (showDeleteAccount) {
      <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm account deletion"
        tabindex="0"
        (click)="cancelDeleteAccount()"
        (keydown.escape)="cancelDeleteAccount()"
      >
        <div
          class="modal"
          role="document"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <h2>Account löschen</h2>
          <p>
            This permanently deletes your account and cannot be undone. Enter your current password
            to confirm.
          </p>
          <form
            [formGroup]="deleteAccountForm"
            (ngSubmit)="confirmDeleteAccount()"
            class="form-grid"
          >
            <label class="field">
              <span class="field-label">Current password</span>
              <input
                type="password"
                formControlName="currentPassword"
                autocomplete="current-password"
              />
            </label>
            @if (deleteAccountError) {
              <p class="error">{{ deleteAccountError }}</p>
            }
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="cancelDeleteAccount()"
                [disabled]="deletingAccount"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-danger" [disabled]="deletingAccount">
                {{ deletingAccount ? 'Deleting…' : 'Delete account' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: `
    .section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
      margin-bottom: 1.5rem;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
    }
    .section-desc {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 1.25rem;
    }

    .toggle-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 0;
      border-top: 1px solid var(--color-border);
    }
    .toggle-row:first-child {
      border-top: none;
      padding-top: 0;
    }
    .toggle-row:last-child {
      padding-bottom: 0;
    }
    .toggle-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .toggle-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary);
    }
    .toggle-desc {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }
    .toggle-note {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      font-style: italic;
      margin-top: 0.125rem;
    }

    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      border-radius: 12px;
      border: none;
      background: var(--color-bg-tertiary);
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
      padding: 0;
    }
    .toggle-switch.active {
      background: var(--color-accent);
    }
    .toggle-knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s;
    }
    .toggle-switch.active .toggle-knob {
      transform: translateX(20px);
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 24rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .field-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    .field input {
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid var(--color-border);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }
    .field input:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 1px var(--color-accent);
    }
    .field-error {
      font-size: 0.75rem;
      color: #f87171;
    }
    .field-note {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .field input:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .primary-btn {
      border-radius: 0.375rem;
      background: var(--color-accent);
      color: #fff;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border: none;
      cursor: pointer;
    }
    .primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .danger-zone {
      border-color: #991b1b;
    }
  `,
})
export class UserSettings implements OnInit, OnDestroy {
  private prefsService = inject(NotificationPreferencesService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private profile = inject(ProfileService);
  private toast = inject(ToastService);

  preferences: NotificationPreferences | null = null;
  loading = true;
  loadError = '';

  profileEmail = '';
  loadingProfile = true;
  savingProfile = false;

  savingPassword = false;
  savingEmail = false;

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.maxLength(255)]],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly emailForm = this.fb.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', [Validators.required]],
  });

  readonly deleteAccountForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
  });

  showDeleteAccount = false;
  deletingAccount = false;
  deleteAccountError = '';

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadProfile();
    this.loadPreferences();
  }

  private loadProfile(): void {
    this.loadingProfile = true;
    this.profile.getProfile().subscribe({
      next: (profile) => {
        this.profileEmail = profile.email;
        this.profileForm.setValue({ name: profile.name ?? '' });
        this.loadingProfile = false;
      },
      error: () => {
        this.loadingProfile = false;
      },
    });
  }

  async submitProfile(): Promise<void> {
    if (this.profileForm.invalid || this.savingProfile) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile = true;
    const { name } = this.profileForm.getRawValue();
    const trimmed = name.trim();
    try {
      const updated = await firstValueFrom(
        this.profile.updateProfile({ name: trimmed.length > 0 ? trimmed : null }),
      );
      this.profileForm.setValue({ name: updated.name ?? '' });
      this.showToast('Profile saved.', 'success');
    } catch {
      this.showToast('Could not save profile.', 'error');
    } finally {
      this.savingProfile = false;
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private loadPreferences(): void {
    this.loading = true;
    this.loadError = '';
    this.prefsService.getPreferences().subscribe({
      next: (prefs) => {
        this.preferences = prefs;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Failed to load notification preferences.';
        this.loading = false;
      },
    });
  }

  toggle(field: 'inAppEnabled' | 'emailEnabled' | 'ntfyEnabled'): void {
    if (!this.preferences) return;
    this.preferences = { ...this.preferences, [field]: !this.preferences[field] };
    this.debounceSave();
  }

  private debounceSave(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.savePreferences();
    }, 300);
  }

  private savePreferences(): void {
    if (!this.preferences) return;
    const { inAppEnabled, emailEnabled, ntfyEnabled } = this.preferences;
    this.prefsService.updatePreferences({ inAppEnabled, emailEnabled, ntfyEnabled }).subscribe({
      next: (updated) => {
        this.preferences = updated;
        this.showToast('Preferences saved.', 'success');
      },
      error: () => {
        this.showToast('Failed to save preferences.', 'error');
      },
    });
  }

  private showToast(message: string, type: 'error' | 'success'): void {
    this.toast.show(type, message);
  }

  async submitPassword(): Promise<void> {
    if (this.passwordForm.invalid || this.savingPassword) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword = true;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    try {
      await this.auth.changePassword(currentPassword, newPassword);
      this.passwordForm.reset();
      this.showToast('Password updated.', 'success');
    } catch {
      this.showToast('Could not update password. Check your current password.', 'error');
    } finally {
      this.savingPassword = false;
    }
  }

  async submitEmail(): Promise<void> {
    if (this.emailForm.invalid || this.savingEmail) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.savingEmail = true;
    const { newEmail, currentPassword } = this.emailForm.getRawValue();
    try {
      await this.auth.changeEmail(newEmail, currentPassword);
      this.emailForm.reset();
      this.showToast('Confirmation link sent to the new address.', 'success');
    } catch {
      this.showToast('Could not change email. Check your password.', 'error');
    } finally {
      this.savingEmail = false;
    }
  }

  openDeleteAccount(): void {
    this.deleteAccountError = '';
    this.deleteAccountForm.reset();
    this.showDeleteAccount = true;
  }

  cancelDeleteAccount(): void {
    if (this.deletingAccount) return;
    this.showDeleteAccount = false;
    this.deleteAccountError = '';
  }

  async confirmDeleteAccount(): Promise<void> {
    if (this.deleteAccountForm.invalid || this.deletingAccount) {
      this.deleteAccountForm.markAllAsTouched();
      return;
    }
    this.deletingAccount = true;
    this.deleteAccountError = '';
    const { currentPassword } = this.deleteAccountForm.getRawValue();
    try {
      await this.auth.deleteAccount(currentPassword);
      this.router.navigate(['/login'], { queryParams: { notice: 'account-deleted' } });
    } catch {
      this.deleteAccountError = 'Could not delete account. Check your current password.';
      this.deletingAccount = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
