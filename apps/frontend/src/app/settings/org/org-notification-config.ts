import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  OrgNotificationConfigService,
  OrgNotificationConfigFull,
} from './org-notification-config.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ToastService } from '../../shared/toast/toast.service';
import {
  CardComponent,
  CardHeadComponent,
  BtnComponent,
  SFieldComponent,
  SInputComponent,
  SwitchComponent,
  ToggleRowComponent,
} from '../../ui';

@Component({
  selector: 'app-org-notification-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    CardComponent,
    CardHeadComponent,
    BtnComponent,
    SFieldComponent,
    SInputComponent,
    SwitchComponent,
    ToggleRowComponent,
  ],
  template: `
    <!-- Tab bar -->
    <div class="flex gap-1 border-b border-border mb-[var(--gap,1.5rem)]">
      <a class="settings-tab" routerLink="/settings/users">User Management</a>
      <a class="settings-tab settings-tab--active" aria-current="page">Notification Config</a>
      <a class="settings-tab" routerLink="/settings/org/storage">Storage</a>
    </div>

    @if (loading) {
      <p class="loading-text text-sm text-muted mt-6">Loading configuration...</p>
    }

    @if (loadError) {
      <p class="error text-sm text-offline mt-3">{{ loadError }}</p>
    }

    @if (!loading && !loadError) {
      <div
        class="grid gap-[var(--gap,1.5rem)] [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] max-[700px]:[grid-template-columns:1fr] items-start"
      >
        <!-- SMTP card -->
        <mns-card [animate]="true">
          <mns-card-head
            title="SMTP Email Settings"
            sub="Configure SMTP to enable email notifications for your organisation."
            icon="Mail"
          />

          <div class="grid grid-cols-2 gap-4 mb-4 max-[500px]:grid-cols-1">
            <mns-sfield label="Host">
              <mns-sinput [(value)]="smtpHost" placeholder="smtp.example.com" [mono]="true" />
            </mns-sfield>
            <mns-sfield label="Port">
              <input
                class="w-full px-3 py-2 rounded-[10px] bg-surface border border-border-strong text-sm font-mono text-text placeholder:text-faint focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms]"
                type="number"
                [(ngModel)]="smtpPort"
                placeholder="587"
              />
            </mns-sfield>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4 max-[500px]:grid-cols-1">
            <mns-sfield label="Username">
              <mns-sinput [(value)]="smtpUser" placeholder="user@example.com" />
            </mns-sfield>
            <mns-sfield label="Password">
              <mns-sinput
                [(value)]="smtpPassword"
                [placeholder]="
                  hasSmtpPassword ? 'Saved — leave blank to keep current' : 'Enter password'
                "
                type="password"
                icon="Lock"
              />
            </mns-sfield>
          </div>
          <mns-sfield label="From address" class="mb-4 block">
            <mns-sinput [(value)]="smtpFrom" placeholder="noreply@example.com" />
          </mns-sfield>

          <!-- TLS toggle row -->
          <div
            class="flex items-center gap-3 mt-4 px-3.5 py-3 rounded-[12px] bg-surface-2 border border-border"
          >
            <mns-switch [(checked)]="smtpSecure" />
            <div class="flex-1">
              <div class="text-[13.5px] font-bold">Secure (TLS)</div>
              <div class="text-xs text-muted">Turn off to use STARTTLS instead</div>
            </div>
          </div>

          <div class="flex gap-2.5 mt-5">
            <mns-btn variant="primary" [disabled]="savingSmtp" (mnsClick)="saveSmtp()">
              {{ savingSmtp ? 'Saving...' : 'Save SMTP settings' }}
            </mns-btn>
            <mns-btn
              variant="outline"
              icon="Mail"
              [disabled]="testingEmail"
              (mnsClick)="testEmail()"
            >
              {{ testingEmail ? 'Sending...' : 'Send test email' }}
            </mns-btn>
          </div>
        </mns-card>

        <!-- ntfy card -->
        <mns-card [animate]="true" [delay]="0.05">
          <mns-card-head
            title="ntfy Push Notifications"
            sub="Configure ntfy to enable push notifications for your organisation."
            icon="Bell"
          />

          <div class="grid grid-cols-2 gap-4 mb-4 max-[500px]:grid-cols-1">
            <mns-sfield label="ntfy URL">
              <mns-sinput
                [(value)]="ntfyUrl"
                placeholder="https://ntfy.sh"
                [mono]="true"
                icon="Globe"
              />
            </mns-sfield>
            <mns-sfield label="Topic">
              <mns-sinput [(value)]="ntfyTopic" placeholder="my-org-notifications" [mono]="true" />
            </mns-sfield>
          </div>
          <mns-sfield
            label="Auth token"
            hint="Optional — only required for protected topics."
            class="block mb-4"
          >
            <mns-sinput
              [(value)]="ntfyToken"
              [placeholder]="
                hasNtfyToken ? 'Saved — leave blank to keep current' : 'Enter token (optional)'
              "
              type="password"
              [mono]="true"
              icon="Lock"
            />
          </mns-sfield>

          <!-- Info hint -->
          <div
            class="flex items-center gap-3 mt-4 px-3.5 py-3 rounded-[12px] bg-accent-soft border border-border text-[12.5px] text-muted leading-relaxed"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              class="text-accent flex-shrink-0"
            >
              <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M10 9v5M10 7h.01"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            Install the <strong class="text-text mx-0.5">ntfy</strong> app and subscribe to your
            topic to receive alerts on mobile.
          </div>

          <div class="flex gap-2.5 mt-5">
            <mns-btn variant="primary" [disabled]="savingNtfy" (mnsClick)="saveNtfy()">
              {{ savingNtfy ? 'Saving...' : 'Save push settings' }}
            </mns-btn>
            <mns-btn variant="outline" icon="Bell" [disabled]="testingNtfy" (mnsClick)="testNtfy()">
              {{ testingNtfy ? 'Sending...' : 'Send test push' }}
            </mns-btn>
          </div>
        </mns-card>

        <!-- Alert rules — full width -->
        <div class="col-span-2 max-[700px]:col-span-1">
          <mns-card [animate]="true" [delay]="0.1">
            <mns-card-head
              title="Alert rules"
              sub="Choose which events trigger a notification across email and push."
              icon="Alert"
            />
            <div
              class="grid gap-x-8 gap-y-1 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"
            >
              <mns-toggle-row
                icon="WifiOff"
                label="Screen goes offline"
                desc="Alert after a display is unreachable for 5 minutes"
              />
              <mns-toggle-row
                icon="Wifi"
                label="Screen recovers"
                desc="Notify when an offline display comes back online"
              />
              <mns-toggle-row
                icon="Video"
                label="Transcode failure"
                desc="Alert when uploaded media fails to process"
              />
              <mns-toggle-row
                icon="Storage"
                label="Storage near limit"
                desc="Warn when usage passes 90% of the allocation"
              />
              <mns-toggle-row
                icon="Calendar"
                label="Weekly summary"
                desc="A digest of uptime and activity every Monday"
              />
            </div>
          </mns-card>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .settings-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      margin-bottom: -1px;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s;
    }
    .settings-tab:hover {
      color: var(--text);
    }
    .settings-tab--active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
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
