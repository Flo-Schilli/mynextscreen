import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  AlertRules,
  OrgNotificationConfigFull,
  OrgNotificationConfigService,
  UpdateOrgNotificationConfig,
} from './org-notification-config.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ToastService } from '../../shared/toast/toast.service';
import { SettingsTabsComponent } from '../settings-tabs.component';
import {
  CardComponent,
  CardHeadComponent,
  BtnComponent,
  PageHeaderComponent,
  SFieldComponent,
  SInputComponent,
  SwitchComponent,
  ToggleRowComponent,
} from '../../ui';

const DEFAULT_ALERT_RULES: AlertRules = {
  offline: true,
  recovered: true,
  transcodeFail: true,
  storage: false,
  weekly: false,
};

@Component({
  selector: 'app-org-notification-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SettingsTabsComponent,
    CardComponent,
    CardHeadComponent,
    BtnComponent,
    PageHeaderComponent,
    SFieldComponent,
    SInputComponent,
    SwitchComponent,
    ToggleRowComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <app-settings-tabs />

      <mns-page-header
        [title]="t('settings.org.notifications.page.title')"
        [sub]="t('settings.org.notifications.page.subtitle')"
        icon="Bell"
      />

      @if (loading()) {
        <p class="loading-text text-sm text-muted mt-6">
          {{ t('settings.org.notifications.loading') }}
        </p>
      }

      @if (loadError()) {
        <p class="error text-sm text-offline mt-3">{{ loadError() }}</p>
      }

      @if (!loading() && !loadError()) {
        <div
          class="grid gap-[var(--gap,1.5rem)] [grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] max-[700px]:[grid-template-columns:1fr] items-start"
        >
          <!-- SMTP card -->
          <mns-card [animate]="true">
            <mns-card-head
              [title]="t('settings.org.notifications.smtp.title')"
              [sub]="t('settings.org.notifications.smtp.subtitle')"
              icon="Mail"
            />

            <div class="grid grid-cols-2 gap-4 mb-4 max-[500px]:grid-cols-1">
              <mns-sfield [label]="t('settings.org.notifications.smtp.hostLabel')">
                <mns-sinput [(value)]="smtpHost" placeholder="smtp.example.com" [mono]="true" />
              </mns-sfield>
              <mns-sfield [label]="t('settings.org.notifications.smtp.portLabel')">
                <mns-sinput [(value)]="smtpPort" placeholder="587" [mono]="true" />
              </mns-sfield>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4 max-[500px]:grid-cols-1">
              <mns-sfield [label]="t('settings.org.notifications.smtp.userLabel')">
                <mns-sinput [(value)]="smtpUser" placeholder="user@example.com" />
              </mns-sfield>
              <mns-sfield [label]="t('settings.org.notifications.smtp.passwordLabel')">
                <mns-sinput
                  [(value)]="smtpPassword"
                  [placeholder]="
                    hasSmtpPassword()
                      ? t('settings.org.notifications.smtp.passwordSaved')
                      : t('settings.org.notifications.smtp.passwordEnter')
                  "
                  type="password"
                  icon="Lock"
                />
              </mns-sfield>
            </div>
            <mns-sfield [label]="t('settings.org.notifications.smtp.fromLabel')" class="mb-4 block">
              <mns-sinput [(value)]="smtpFrom" placeholder="noreply@example.com" />
            </mns-sfield>

            <!-- TLS toggle row -->
            <div
              class="flex items-center gap-3 mt-4 px-3.5 py-3 rounded-[12px] bg-surface-2 border border-border"
            >
              <mns-switch [(checked)]="smtpSecure" />
              <div class="flex-1">
                <div class="text-[13.5px] font-bold">
                  {{ t('settings.org.notifications.smtp.secureLabel') }}
                </div>
                <div class="text-xs text-muted">
                  {{ t('settings.org.notifications.smtp.secureDesc') }}
                </div>
              </div>
            </div>

            <div class="flex gap-2.5 mt-5">
              <mns-btn variant="primary" [disabled]="savingSmtp()" (mnsClick)="saveSmtp()">
                {{
                  savingSmtp()
                    ? t('settings.org.notifications.smtp.saving')
                    : t('settings.org.notifications.smtp.save')
                }}
              </mns-btn>
              <mns-btn
                variant="outline"
                icon="Mail"
                [disabled]="testingEmail()"
                (mnsClick)="testEmail()"
              >
                {{
                  testingEmail()
                    ? t('settings.org.notifications.smtp.testing')
                    : t('settings.org.notifications.smtp.test')
                }}
              </mns-btn>
            </div>
          </mns-card>

          <!-- ntfy card -->
          <mns-card [animate]="true" [delay]="0.05">
            <mns-card-head
              [title]="t('settings.org.notifications.ntfy.title')"
              [sub]="t('settings.org.notifications.ntfy.subtitle')"
              icon="Bell"
            />

            <div class="grid grid-cols-2 gap-4 mb-4 max-[500px]:grid-cols-1">
              <mns-sfield [label]="t('settings.org.notifications.ntfy.urlLabel')">
                <mns-sinput
                  [(value)]="ntfyUrl"
                  placeholder="https://ntfy.sh"
                  [mono]="true"
                  icon="Globe"
                />
              </mns-sfield>
              <mns-sfield [label]="t('settings.org.notifications.ntfy.topicLabel')">
                <mns-sinput
                  [(value)]="ntfyTopic"
                  [placeholder]="t('settings.org.notifications.ntfy.topicPlaceholder')"
                  [mono]="true"
                />
              </mns-sfield>
            </div>
            <mns-sfield
              [label]="t('settings.org.notifications.ntfy.tokenLabel')"
              [hint]="t('settings.org.notifications.ntfy.tokenHint')"
              class="block mb-4"
            >
              <mns-sinput
                [(value)]="ntfyToken"
                [placeholder]="
                  hasNtfyToken()
                    ? t('settings.org.notifications.ntfy.tokenSaved')
                    : t('settings.org.notifications.ntfy.tokenEnter')
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
              {{ t('settings.org.notifications.ntfy.infoPrefix') }}
              <strong class="text-text mx-0.5">{{
                t('settings.org.notifications.ntfy.infoApp')
              }}</strong>
              {{ t('settings.org.notifications.ntfy.infoSuffix') }}
            </div>

            <div class="flex gap-2.5 mt-5">
              <mns-btn variant="primary" [disabled]="savingNtfy()" (mnsClick)="saveNtfy()">
                {{
                  savingNtfy()
                    ? t('settings.org.notifications.ntfy.saving')
                    : t('settings.org.notifications.ntfy.save')
                }}
              </mns-btn>
              <mns-btn
                variant="outline"
                icon="Bell"
                [disabled]="testingNtfy()"
                (mnsClick)="testNtfy()"
              >
                {{
                  testingNtfy()
                    ? t('settings.org.notifications.ntfy.testing')
                    : t('settings.org.notifications.ntfy.test')
                }}
              </mns-btn>
            </div>
          </mns-card>

          <!-- Alert rules — full width -->
          <div class="col-span-2 max-[700px]:col-span-1">
            <mns-card [animate]="true" [delay]="0.1">
              <mns-card-head
                [title]="t('settings.org.notifications.rules.title')"
                [sub]="t('settings.org.notifications.rules.subtitle')"
                icon="Alert"
              />
              <div
                class="grid gap-x-8 gap-y-1 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]"
              >
                <mns-toggle-row
                  icon="WifiOff"
                  [label]="t('settings.org.notifications.rules.offlineLabel')"
                  [desc]="t('settings.org.notifications.rules.offlineDesc')"
                  [(checked)]="ruleOffline"
                />
                <mns-toggle-row
                  icon="Wifi"
                  [label]="t('settings.org.notifications.rules.recoveredLabel')"
                  [desc]="t('settings.org.notifications.rules.recoveredDesc')"
                  [(checked)]="ruleRecovered"
                />
                <mns-toggle-row
                  icon="Video"
                  [label]="t('settings.org.notifications.rules.transcodeFailLabel')"
                  [desc]="t('settings.org.notifications.rules.transcodeFailDesc')"
                  [(checked)]="ruleTranscodeFail"
                />
                <mns-toggle-row
                  icon="Storage"
                  [label]="t('settings.org.notifications.rules.storageLabel')"
                  [desc]="t('settings.org.notifications.rules.storageDesc')"
                  [(checked)]="ruleStorage"
                />
                <mns-toggle-row
                  icon="Calendar"
                  [label]="t('settings.org.notifications.rules.weeklyLabel')"
                  [desc]="t('settings.org.notifications.rules.weeklyDesc')"
                  [(checked)]="ruleWeekly"
                />
              </div>

              <div class="flex gap-2.5 mt-5">
                <mns-btn variant="primary" [disabled]="savingRules()" (mnsClick)="saveAlertRules()">
                  {{
                    savingRules()
                      ? t('settings.org.notifications.rules.saving')
                      : t('settings.org.notifications.rules.save')
                  }}
                </mns-btn>
              </div>
            </mns-card>
          </div>
        </div>
      }
    </ng-container>
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
export class OrgNotificationConfig implements OnInit {
  private configService = inject(OrgNotificationConfigService);
  private orgState = inject(OrganisationStateService);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  // OnPush + zone.js: HTTP callbacks that mutate plain fields do not mark this
  // component dirty, so all callback-set state lives in signals.
  readonly loading = signal(true);
  readonly loadError = signal('');

  // SMTP / ntfy form models use signal two-way binding via mns-sinput.
  readonly smtpHost = signal('');
  readonly smtpPort = signal('');
  readonly smtpUser = signal('');
  readonly smtpPassword = signal('');
  readonly smtpFrom = signal('');
  readonly smtpSecure = signal(false);
  readonly hasSmtpPassword = signal(false);

  readonly ntfyUrl = signal('');
  readonly ntfyTopic = signal('');
  readonly ntfyToken = signal('');
  readonly hasNtfyToken = signal(false);

  // Alert-rule toggles (persisted to the backend).
  readonly ruleOffline = signal(DEFAULT_ALERT_RULES.offline);
  readonly ruleRecovered = signal(DEFAULT_ALERT_RULES.recovered);
  readonly ruleTranscodeFail = signal(DEFAULT_ALERT_RULES.transcodeFail);
  readonly ruleStorage = signal(DEFAULT_ALERT_RULES.storage);
  readonly ruleWeekly = signal(DEFAULT_ALERT_RULES.weekly);

  readonly savingSmtp = signal(false);
  readonly savingNtfy = signal(false);
  readonly savingRules = signal(false);
  readonly testingEmail = signal(false);
  readonly testingNtfy = signal(false);

  ngOnInit(): void {
    this.loadConfig();
  }

  private get orgId(): string | null {
    return this.orgState.selectedOrgId();
  }

  private loadConfig(): void {
    const orgId = this.orgId;
    if (!orgId) {
      this.loadError.set(
        this.transloco.translate('settings.org.notifications.errors.noOrgSelected'),
      );
      this.loading.set(false);
      return;
    }

    this.configService.getConfig(orgId).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(
          this.transloco.translate('settings.org.notifications.errors.loadConfig'),
        );
        this.loading.set(false);
      },
    });
  }

  private applyConfig(config: OrgNotificationConfigFull): void {
    this.smtpHost.set(config.smtpHost ?? '');
    this.smtpPort.set(config.smtpPort != null ? String(config.smtpPort) : '');
    this.smtpUser.set(config.smtpUser ?? '');
    this.smtpFrom.set(config.smtpFrom ?? '');
    this.smtpSecure.set(config.smtpSecure);
    // Password comes back as '••••••••' if saved
    this.hasSmtpPassword.set(config.smtpPassword === '••••••••');
    this.smtpPassword.set('');

    this.ntfyUrl.set(config.ntfyUrl ?? '');
    this.ntfyTopic.set(config.ntfyTopic ?? '');
    this.hasNtfyToken.set(config.ntfyToken === '••••••••');
    this.ntfyToken.set('');

    const rules = config.alertRules ?? DEFAULT_ALERT_RULES;
    this.ruleOffline.set(rules.offline);
    this.ruleRecovered.set(rules.recovered);
    this.ruleTranscodeFail.set(rules.transcodeFail);
    this.ruleStorage.set(rules.storage);
    this.ruleWeekly.set(rules.weekly);
  }

  saveSmtp(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.savingSmtp.set(true);

    const portValue = Number(this.smtpPort());
    const payload: UpdateOrgNotificationConfig = {
      smtpHost: this.smtpHost() || null,
      smtpPort: this.smtpPort() && !Number.isNaN(portValue) ? portValue : null,
      smtpUser: this.smtpUser() || null,
      smtpFrom: this.smtpFrom() || null,
      smtpSecure: this.smtpSecure(),
    };
    // Only send password if the user typed a new one
    if (this.smtpPassword()) {
      payload.smtpPassword = this.smtpPassword();
    }

    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingSmtp.set(false);
        this.toast.success(this.transloco.translate('settings.org.notifications.toast.smtpSaved'));
      },
      error: () => {
        this.savingSmtp.set(false);
        this.toast.error(
          this.transloco.translate('settings.org.notifications.toast.smtpSaveFailed'),
        );
      },
    });
  }

  saveNtfy(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.savingNtfy.set(true);

    const payload: UpdateOrgNotificationConfig = {
      ntfyUrl: this.ntfyUrl() || null,
      ntfyTopic: this.ntfyTopic() || null,
    };
    if (this.ntfyToken()) {
      payload.ntfyToken = this.ntfyToken();
    }

    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingNtfy.set(false);
        this.toast.success(this.transloco.translate('settings.org.notifications.toast.ntfySaved'));
      },
      error: () => {
        this.savingNtfy.set(false);
        this.toast.error(
          this.transloco.translate('settings.org.notifications.toast.ntfySaveFailed'),
        );
      },
    });
  }

  saveAlertRules(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.savingRules.set(true);

    const payload: UpdateOrgNotificationConfig = {
      alertRules: {
        offline: this.ruleOffline(),
        recovered: this.ruleRecovered(),
        transcodeFail: this.ruleTranscodeFail(),
        storage: this.ruleStorage(),
        weekly: this.ruleWeekly(),
      },
    };

    this.configService.updateConfig(orgId, payload).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.savingRules.set(false);
        this.toast.success(this.transloco.translate('settings.org.notifications.toast.rulesSaved'));
      },
      error: () => {
        this.savingRules.set(false);
        this.toast.error(
          this.transloco.translate('settings.org.notifications.toast.rulesSaveFailed'),
        );
      },
    });
  }

  testEmail(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.testingEmail.set(true);

    this.configService.testEmail(orgId).subscribe({
      next: (res) => {
        this.testingEmail.set(false);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.testingEmail.set(false);
        const msg =
          err?.error?.message ||
          this.transloco.translate('settings.org.notifications.toast.testEmailFailed');
        this.toast.error(msg);
      },
    });
  }

  testNtfy(): void {
    const orgId = this.orgId;
    if (!orgId) return;
    this.testingNtfy.set(true);

    this.configService.testNtfy(orgId).subscribe({
      next: (res) => {
        this.testingNtfy.set(false);
        this.toast.success(res.message);
      },
      error: (err) => {
        this.testingNtfy.set(false);
        const msg =
          err?.error?.message ||
          this.transloco.translate('settings.org.notifications.toast.testNtfyFailed');
        this.toast.error(msg);
      },
    });
  }
}
