import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  NotificationPreferencesService,
  NotificationPreferences,
} from './notification-preferences.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>User Settings</h1>
        </div>
      </header>

      <section class="section">
        <h2 class="section-title">Notification Channels</h2>
        <p class="section-desc">Choose how you receive notifications for this organisation.</p>

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
                @if (!orgSmtpConfigured) {
                  <span class="toggle-note">Configure email in Organisation Settings</span>
                }
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
                @if (!orgNtfyConfigured) {
                  <span class="toggle-note">Configure ntfy in Organisation Settings</span>
                }
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

        @if (toastMessage) {
          <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'">
            {{ toastMessage }}
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 2rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .back-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .back-btn:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
    }

    .section {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
      box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);
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

    .toast {
      margin-top: 1rem;
      padding: 0.625rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
    }
    .toast-success {
      background: #065f46;
      color: #d1fae5;
    }
    .toast-error {
      background: #991b1b;
      color: #fecaca;
    }

    .error {
      color: #ef4444;
      font-size: 0.875rem;
    }
    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `,
})
export class UserSettings implements OnInit, OnDestroy {
  private prefsService = inject(NotificationPreferencesService);
  private orgState = inject(OrganisationStateService);
  private router = inject(Router);

  preferences: NotificationPreferences | null = null;
  loading = true;
  loadError = '';

  orgSmtpConfigured = false;
  orgNtfyConfigured = false;

  toastMessage = '';
  toastType: 'error' | 'success' = 'success';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadPreferences();
    this.loadOrgConfig();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
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

  private loadOrgConfig(): void {
    const orgId = this.orgState.selectedOrgId();
    if (!orgId) return;
    this.prefsService.getOrgNotificationConfig(orgId).subscribe({
      next: (config) => {
        this.orgSmtpConfigured = !!config.smtpHost;
        this.orgNtfyConfigured = !!config.ntfyUrl;
      },
      error: () => {
        // Non-admins may get 403 — silently assume not configured
        this.orgSmtpConfigured = false;
        this.orgNtfyConfigured = false;
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
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
