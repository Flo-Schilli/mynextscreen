import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core';
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
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ThemeService, Accent, Density } from '../../shell/theme.service';
import {
  CardComponent,
  CardHeadComponent,
  BtnComponent,
  OverlayComponent,
  PageHeaderComponent,
  SFieldComponent,
  SInputComponent,
  SwitchComponent,
  ToggleRowComponent,
} from '../../ui';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const next = control.get('newPassword')?.value;
  const confirm = control.get('confirmNewPassword')?.value;
  return next === confirm ? null : { mismatch: true };
}

const ACCENT_OPTIONS: { value: Accent; label: string; color: string }[] = [
  { value: 'indigo', label: 'Indigo', color: '#6d6cf6' },
  { value: 'teal', label: 'Teal', color: '#0d9488' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
];

const DENSITY_OPTIONS: { value: Density; label: string; desc: string }[] = [
  { value: 'compact', label: 'Compact', desc: 'Tighter spacing' },
  { value: 'regular', label: 'Regular', desc: 'Default spacing' },
  { value: 'comfy', label: 'Comfy', desc: 'More breathing room' },
];

@Component({
  selector: 'app-user-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardHeadComponent,
    BtnComponent,
    OverlayComponent,
    PageHeaderComponent,
    SFieldComponent,
    SInputComponent,
    SwitchComponent,
    ToggleRowComponent,
  ],
  template: `
    <mns-page-header
      title="User Settings"
      sub="Manage your personal account across every organisation."
      icon="Settings"
    />

    <!-- Profile & display name -->
    <mns-card [animate]="true" class="block mb-5 max-w-[760px]">
      <mns-card-head title="Profile" sub="Your account details and display name." icon="User" />

      <!-- Gravatar row -->
      <div class="flex items-center gap-4 pb-5 mb-5 border-b border-border">
        <span
          class="w-12 h-12 flex-shrink-0 rounded-full bg-surface-3 text-muted border border-border overflow-hidden flex items-center justify-center"
        >
          @if (gravatarEnabled && avatarUrl) {
            <img
              class="w-full h-full object-cover"
              [src]="avatarUrl"
              alt="Your avatar"
              referrerpolicy="no-referrer"
            />
          } @else {
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          }
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold">Use Gravatar</div>
          <div class="text-[12.5px] text-muted">
            Show the avatar linked to your email via Gravatar
          </div>
          <div class="text-[11.5px] text-faint italic mt-0.5">
            When off, no email hash is sent to gravatar.com
          </div>
        </div>
        <mns-switch
          [checked]="gravatarEnabled"
          [disabled]="savingGravatar || loadingProfile"
          (toggled)="onGravatarToggle()"
        />
      </div>

      <!-- Profile form -->
      <form
        [formGroup]="profileForm"
        (ngSubmit)="submitProfile()"
        class="flex flex-col gap-4 max-w-sm"
      >
        <mns-sfield
          label="Email"
          hint="Change your email below; we'll send a confirmation link first."
        >
          <mns-sinput [value]="profileEmail" [disabled]="true" />
        </mns-sfield>
        <mns-sfield label="Display name">
          <mns-sinput
            [value]="profileForm.controls.name.value"
            (valueChange)="profileForm.controls.name.setValue($event)"
            placeholder="Your name"
          />
          @if (profileForm.controls.name.touched && profileForm.controls.name.invalid) {
            <span class="text-xs text-offline mt-1 block"
              >Name must be 255 characters or fewer.</span
            >
          }
        </mns-sfield>
        <div>
          <mns-btn
            variant="primary"
            [disabled]="savingProfile || loadingProfile"
            (mnsClick)="submitProfile()"
          >
            {{ savingProfile ? 'Saving…' : 'Save profile' }}
          </mns-btn>
        </div>
      </form>
    </mns-card>

    <!-- Notification preferences -->
    <mns-card [animate]="true" [delay]="0.05" class="block mb-5 max-w-[760px]">
      <mns-card-head
        title="Notification Channels"
        sub="Choose how you receive notifications. These apply across all organisations you belong to."
        icon="Bell"
      />

      @if (loading) {
        <p class="loading-text text-sm text-muted">Loading preferences...</p>
      }
      @if (loadError) {
        <p class="error text-sm text-offline">{{ loadError }}</p>
      }
      @if (!loading && !loadError && preferences) {
        <div class="divide-y divide-border">
          <mns-toggle-row
            icon="Bell"
            label="In-app"
            desc="Receive notifications in the dashboard"
            [checked]="preferences.inAppEnabled"
            (toggled)="toggle('inAppEnabled')"
          />
          <mns-toggle-row
            icon="Mail"
            label="Email"
            desc="Receive notifications by email — sent for orgs that have email configured"
            [checked]="preferences.emailEnabled"
            (toggled)="toggle('emailEnabled')"
          />
          <mns-toggle-row
            icon="Cast"
            label="ntfy"
            desc="Receive notifications via ntfy — sent for orgs that have ntfy configured"
            [checked]="preferences.ntfyEnabled"
            (toggled)="toggle('ntfyEnabled')"
          />
        </div>
      }
    </mns-card>

    <!-- Appearance: accent + density -->
    <mns-card [animate]="true" [delay]="0.08" class="block mb-5 max-w-[760px]">
      <mns-card-head
        title="Appearance"
        sub="Customise the colour accent and interface density."
        icon="Settings"
      />

      <!-- Accent picker -->
      <div class="mb-5">
        <div class="text-[12.5px] font-semibold text-muted mb-3">Accent colour</div>
        <div class="flex gap-3 flex-wrap">
          @for (opt of accentOptions; track opt.value) {
            <button
              type="button"
              class="flex items-center gap-2.5 px-3 py-2 rounded-[10px] border text-[13px] font-semibold transition-all duration-[180ms] cursor-pointer"
              [style.borderColor]="currentAccent() === opt.value ? opt.color : 'var(--border)'"
              [style.background]="
                currentAccent() === opt.value ? opt.color + '22' : 'var(--surface-2)'
              "
              [style.color]="currentAccent() === opt.value ? opt.color : 'var(--text-muted)'"
              [attr.aria-pressed]="currentAccent() === opt.value"
              (click)="setAccent(opt.value)"
            >
              <span
                class="w-4 h-4 rounded-full flex-shrink-0"
                [style.background]="opt.color"
              ></span>
              {{ opt.label }}
            </button>
          }
        </div>
      </div>

      <!-- Density picker -->
      <div>
        <div class="text-[12.5px] font-semibold text-muted mb-3">Interface density</div>
        <div class="flex gap-3 flex-wrap">
          @for (opt of densityOptions; track opt.value) {
            <button
              type="button"
              class="flex flex-col items-start px-3.5 py-2.5 rounded-[10px] border text-left transition-all duration-[180ms] cursor-pointer"
              [class.border-accent]="currentDensity() === opt.value"
              [class.bg-accent-soft]="currentDensity() === opt.value"
              [class.border-border]="currentDensity() !== opt.value"
              [class.bg-surface-2]="currentDensity() !== opt.value"
              [attr.aria-pressed]="currentDensity() === opt.value"
              (click)="setDensity(opt.value)"
            >
              <span
                class="text-[13px] font-semibold"
                [class.text-accent]="currentDensity() === opt.value"
                >{{ opt.label }}</span
              >
              <span class="text-[11.5px] text-muted mt-0.5">{{ opt.desc }}</span>
            </button>
          }
        </div>
      </div>
    </mns-card>

    <!-- Change password -->
    <mns-card [animate]="true" [delay]="0.1" class="block mb-5 max-w-[760px]">
      <mns-card-head
        title="Change password"
        sub="Update the password you use to sign in."
        icon="Lock"
      />
      <form
        [formGroup]="passwordForm"
        (ngSubmit)="submitPassword()"
        class="flex flex-col gap-4 max-w-sm"
      >
        <mns-sfield label="Current password">
          <mns-sinput
            [value]="passwordForm.controls.currentPassword.value"
            (valueChange)="passwordForm.controls.currentPassword.setValue($event)"
            type="password"
            icon="Lock"
          />
        </mns-sfield>
        <mns-sfield label="New password">
          <mns-sinput
            [value]="passwordForm.controls.newPassword.value"
            (valueChange)="passwordForm.controls.newPassword.setValue($event)"
            type="password"
            icon="Lock"
          />
          @if (
            passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid
          ) {
            <span class="text-xs text-offline mt-1 block">Use at least 8 characters.</span>
          }
        </mns-sfield>
        <mns-sfield label="Confirm new password">
          <mns-sinput
            [value]="passwordForm.controls.confirmNewPassword.value"
            (valueChange)="passwordForm.controls.confirmNewPassword.setValue($event)"
            type="password"
            icon="Lock"
          />
          @if (passwordForm.touched && passwordForm.hasError('mismatch')) {
            <span class="text-xs text-offline mt-1 block">Passwords do not match.</span>
          }
        </mns-sfield>
        <div>
          <mns-btn variant="primary" [disabled]="savingPassword" (mnsClick)="submitPassword()">
            {{ savingPassword ? 'Saving…' : 'Update password' }}
          </mns-btn>
        </div>
      </form>
    </mns-card>

    <!-- Change email -->
    <mns-card [animate]="true" [delay]="0.12" class="block mb-5 max-w-[760px]">
      <mns-card-head
        title="Change email"
        sub="We'll send a confirmation link to the new address; the change applies once you confirm it."
        icon="Mail"
      />
      <form [formGroup]="emailForm" (ngSubmit)="submitEmail()" class="flex flex-col gap-4 max-w-sm">
        <mns-sfield label="New email">
          <mns-sinput
            [value]="emailForm.controls.newEmail.value"
            (valueChange)="emailForm.controls.newEmail.setValue($event)"
            type="email"
            icon="Mail"
            placeholder="new@example.com"
          />
          @if (emailForm.controls.newEmail.touched && emailForm.controls.newEmail.invalid) {
            <span class="text-xs text-offline mt-1 block">Enter a valid email address.</span>
          }
        </mns-sfield>
        <mns-sfield label="Current password">
          <mns-sinput
            [value]="emailForm.controls.currentPassword.value"
            (valueChange)="emailForm.controls.currentPassword.setValue($event)"
            type="password"
            icon="Lock"
          />
        </mns-sfield>
        <div>
          <mns-btn variant="primary" [disabled]="savingEmail" (mnsClick)="submitEmail()">
            {{ savingEmail ? 'Sending…' : 'Send confirmation link' }}
          </mns-btn>
        </div>
      </form>
    </mns-card>

    <!-- Danger zone -->
    <mns-card
      [animate]="true"
      [delay]="0.14"
      class="block mb-5 max-w-[760px] border-offline/40 shadow-[0_0_0_1px_var(--offline-dim)]"
    >
      <mns-card-head
        title="Danger Zone"
        sub="Permanently delete your account. This removes your organisation memberships and cannot be undone."
      />
      <mns-btn variant="danger" icon="Trash" (mnsClick)="openDeleteAccount()">
        Delete account
      </mns-btn>
    </mns-card>

    <!-- Delete account modal -->
    @if (showDeleteAccount) {
      <mns-overlay (closed)="cancelDeleteAccount()">
        <div
          class="relative w-full max-w-[420px] bg-surface border border-border-strong rounded-xl p-6"
          style="box-shadow: var(--shadow-lg); animation: fadeUp .3s cubic-bezier(.22,.61,.36,1) both"
          tabindex="0"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <h2 class="text-[17px] font-bold mb-2">Delete account</h2>
          <p class="text-[13.5px] text-muted mb-5">
            This permanently deletes your account and cannot be undone. Enter your current password
            to confirm.
          </p>
          <form
            [formGroup]="deleteAccountForm"
            (ngSubmit)="confirmDeleteAccount()"
            class="flex flex-col gap-4"
          >
            <mns-sfield label="Current password">
              <mns-sinput
                [value]="deleteAccountForm.controls.currentPassword.value"
                (valueChange)="deleteAccountForm.controls.currentPassword.setValue($event)"
                type="password"
                icon="Lock"
              />
            </mns-sfield>
            @if (deleteAccountError) {
              <p class="error text-sm text-offline">{{ deleteAccountError }}</p>
            }
            <div class="form-actions flex gap-2.5 mt-1">
              <mns-btn
                variant="outline"
                [full]="true"
                [disabled]="deletingAccount"
                (mnsClick)="cancelDeleteAccount()"
              >
                Cancel
              </mns-btn>
              <mns-btn
                variant="danger"
                [full]="true"
                [disabled]="deletingAccount"
                (mnsClick)="confirmDeleteAccount()"
              >
                {{ deletingAccount ? 'Deleting…' : 'Delete account' }}
              </mns-btn>
            </div>
          </form>
        </div>
      </mns-overlay>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
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
  private orgState = inject(OrganisationStateService);
  private themeService = inject(ThemeService);

  readonly accentOptions = ACCENT_OPTIONS;
  readonly densityOptions = DENSITY_OPTIONS;
  readonly currentAccent = this.themeService.accent;
  readonly currentDensity = this.themeService.density;

  setAccent(a: Accent): void {
    this.themeService.setAccent(a);
  }

  setDensity(d: Density): void {
    this.themeService.setDensity(d);
  }

  preferences: NotificationPreferences | null = null;
  loading = true;
  loadError = '';

  profileEmail = '';
  loadingProfile = true;
  savingProfile = false;

  gravatarEnabled = true;
  avatarUrl: string | null = null;
  savingGravatar = false;

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
        this.gravatarEnabled = profile.gravatarEnabled;
        this.avatarUrl = profile.avatarUrl;
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

  onGravatarToggle(): void {
    void this.toggleGravatar();
  }

  async toggleGravatar(): Promise<void> {
    if (this.savingGravatar || this.loadingProfile) return;
    const next = !this.gravatarEnabled;
    this.savingGravatar = true;
    try {
      const updated = await firstValueFrom(this.profile.updateProfile({ gravatarEnabled: next }));
      this.gravatarEnabled = updated.gravatarEnabled;
      this.avatarUrl = updated.avatarUrl;
      // Keep the top-bar avatar in sync without a full reload.
      this.orgState.avatarUrl.set(updated.avatarUrl);
      this.showToast('Profile saved.', 'success');
    } catch {
      this.showToast('Could not save profile.', 'error');
    } finally {
      this.savingGravatar = false;
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
