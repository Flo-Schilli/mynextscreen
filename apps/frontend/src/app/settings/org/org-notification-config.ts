import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  OrgNotificationConfigService,
  OrgNotificationConfigFull,
} from './org-notification-config.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-org-notification-config',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Organisation Notification Settings</h1>
        </div>
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link" routerLink="/settings/users">User Management</a>
        <a class="settings-nav-link active">Notification Config</a>
      </nav>

      @if (loading) {
        <p class="loading-text">Loading configuration...</p>
      }

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (!loading && !loadError) {
        <section class="section">
          <h2 class="section-title">SMTP Email Settings</h2>
          <p class="section-desc">
            Configure SMTP to enable email notifications for your organisation.
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="smtpHost">Host</label>
              <input
                id="smtpHost"
                type="text"
                [(ngModel)]="smtpHost"
                placeholder="smtp.example.com"
              />
            </div>
            <div class="form-group">
              <label for="smtpPort">Port</label>
              <input id="smtpPort" type="number" [(ngModel)]="smtpPort" placeholder="587" />
            </div>
            <div class="form-group">
              <label for="smtpUser">Username</label>
              <input
                id="smtpUser"
                type="text"
                [(ngModel)]="smtpUser"
                placeholder="user@example.com"
              />
            </div>
            <div class="form-group">
              <label for="smtpPassword">Password</label>
              <input
                id="smtpPassword"
                type="password"
                [(ngModel)]="smtpPassword"
                [placeholder]="
                  hasSmtpPassword ? 'Saved — leave blank to keep current' : 'Enter password'
                "
              />
            </div>
            <div class="form-group">
              <label for="smtpFrom">From address</label>
              <input
                id="smtpFrom"
                type="text"
                [(ngModel)]="smtpFrom"
                placeholder="noreply@example.com"
              />
            </div>
            <div class="form-group form-group-checkbox">
              <label for="smtpSecure">
                <input id="smtpSecure" type="checkbox" [(ngModel)]="smtpSecure" />
                Secure (TLS)
              </label>
              <span class="form-hint">Uncheck for STARTTLS</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" (click)="saveSmtp()" [disabled]="savingSmtp">
              {{ savingSmtp ? 'Saving...' : 'Save SMTP Settings' }}
            </button>
            <button class="btn btn-secondary" (click)="testEmail()" [disabled]="testingEmail">
              {{ testingEmail ? 'Sending...' : 'Send test email' }}
            </button>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">ntfy Push Notifications</h2>
          <p class="section-desc">
            Configure ntfy to enable push notifications for your organisation.
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="ntfyUrl">ntfy URL</label>
              <input id="ntfyUrl" type="text" [(ngModel)]="ntfyUrl" placeholder="https://ntfy.sh" />
            </div>
            <div class="form-group">
              <label for="ntfyTopic">Topic</label>
              <input
                id="ntfyTopic"
                type="text"
                [(ngModel)]="ntfyTopic"
                placeholder="my-org-notifications"
              />
            </div>
            <div class="form-group">
              <label for="ntfyToken">Auth token (optional)</label>
              <input
                id="ntfyToken"
                type="password"
                [(ngModel)]="ntfyToken"
                [placeholder]="
                  hasNtfyToken ? 'Saved — leave blank to keep current' : 'Enter token (optional)'
                "
              />
            </div>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" (click)="saveNtfy()" [disabled]="savingNtfy">
              {{ savingNtfy ? 'Saving...' : 'Save ntfy Settings' }}
            </button>
            <button class="btn btn-secondary" (click)="testNtfy()" [disabled]="testingNtfy">
              {{ testingNtfy ? 'Sending...' : 'Send test notification' }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .settings-nav {
      display: flex;
      gap: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .settings-nav-link {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition:
        color 0.15s,
        border-color 0.15s;
    }
    .settings-nav-link:hover {
      color: var(--color-text-primary);
    }
    .settings-nav-link.active {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent);
      font-weight: 500;
    }

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

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 600px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .form-group label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    .form-group input[type='text'],
    .form-group input[type='number'],
    .form-group input[type='password'] {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      outline: none;
    }
    .form-group input:focus {
      border-color: var(--color-accent);
    }
    .form-group-checkbox {
      justify-content: center;
    }
    .form-group-checkbox label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--color-text-primary);
    }
    .form-group-checkbox input[type='checkbox'] {
      width: 1rem;
      height: 1rem;
      accent-color: var(--color-accent);
    }
    .form-hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .btn-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
  `,
})
export class OrgNotificationConfig implements OnInit {
  private configService = inject(OrgNotificationConfigService);
  private orgState = inject(OrganisationStateService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = true;
  loadError = '';

  smtpHost = '';
  smtpPort: number | null = null;
  smtpUser = '';
  smtpPassword = '';
  smtpFrom = '';
  smtpSecure = false;
  hasSmtpPassword = false;

  ntfyUrl = '';
  ntfyTopic = '';
  ntfyToken = '';
  hasNtfyToken = false;

  savingSmtp = false;
  savingNtfy = false;
  testingEmail = false;
  testingNtfy = false;

  ngOnInit(): void {
    this.loadConfig();
  }

  private get orgId(): string | null {
    return this.orgState.selectedOrgId();
  }

  private loadConfig(): void {
    const orgId = this.orgId;
    if (!orgId) {
      this.loadError = 'No organisation selected.';
      this.loading = false;
      return;
    }

    this.configService.getConfig(orgId).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Failed to load notification configuration.';
        this.loading = false;
      },
    });
  }

  private applyConfig(config: OrgNotificationConfigFull): void {
    this.smtpHost = config.smtpHost ?? '';
    this.smtpPort = config.smtpPort;
    this.smtpUser = config.smtpUser ?? '';
    this.smtpFrom = config.smtpFrom ?? '';
    this.smtpSecure = config.smtpSecure;
    // Password comes back as '••••••••' if saved
    this.hasSmtpPassword = config.smtpPassword === '••••••••';
    this.smtpPassword = '';

    this.ntfyUrl = config.ntfyUrl ?? '';
    this.ntfyTopic = config.ntfyTopic ?? '';
    this.hasNtfyToken = config.ntfyToken === '••••••••';
    this.ntfyToken = '';
  }

  saveSmtp(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.savingSmtp = true;

    const payload: Record<string, unknown> = {
      smtpHost: this.smtpHost || null,
      smtpPort: this.smtpPort,
      smtpUser: this.smtpUser || null,
      smtpFrom: this.smtpFrom || null,
      smtpSecure: this.smtpSecure,
    };
    // Only send password if the user typed a new one
    if (this.smtpPassword) {
      payload['smtpPassword'] = this.smtpPassword;
    }

    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingSmtp = false;
        this.showToast('SMTP settings saved.', 'success');
      },
      error: () => {
        this.savingSmtp = false;
        this.showToast('Failed to save SMTP settings.', 'error');
      },
    });
  }

  saveNtfy(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.savingNtfy = true;

    const payload: Record<string, unknown> = {
      ntfyUrl: this.ntfyUrl || null,
      ntfyTopic: this.ntfyTopic || null,
    };
    if (this.ntfyToken) {
      payload['ntfyToken'] = this.ntfyToken;
    }

    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingNtfy = false;
        this.showToast('ntfy settings saved.', 'success');
      },
      error: () => {
        this.savingNtfy = false;
        this.showToast('Failed to save ntfy settings.', 'error');
      },
    });
  }

  testEmail(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.testingEmail = true;

    this.configService.testEmail(orgId).subscribe({
      next: (res) => {
        this.testingEmail = false;
        this.showToast(res.message, 'success');
      },
      error: (err) => {
        this.testingEmail = false;
        const msg = err?.error?.message || 'Failed to send test email.';
        this.showToast(msg, 'error');
      },
    });
  }

  testNtfy(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.testingNtfy = true;

    this.configService.testNtfy(orgId).subscribe({
      next: (res) => {
        this.testingNtfy = false;
        this.showToast(res.message, 'success');
      },
      error: (err) => {
        this.testingNtfy = false;
        const msg = err?.error?.message || 'Failed to send test notification.';
        this.showToast(msg, 'error');
      },
    });
  }

  private showToast(message: string, type: 'error' | 'success'): void {
    this.toast.show(type, message);
  }

  goBack(): void {
    this.router.navigate(['/settings/users']);
  }
}
