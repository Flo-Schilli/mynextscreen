import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { MfaCodeInputComponent, TOTP_CODE_LENGTH } from '../../auth/mfa-code-input';
import { MfaEnrolmentWizardComponent } from '../../auth/mfa-enrolment/mfa-enrolment-wizard';
import { RecoveryCodesPanelComponent } from '../../auth/mfa-enrolment/recovery-codes-panel';
import { LocaleDatePipe } from '../../i18n/locale-format.pipes';
import {
  BadgeComponent,
  BtnComponent,
  CardComponent,
  CardHeadComponent,
  ModalComponent,
  OverlayComponent,
  SFieldComponent,
  SInputComponent,
} from '../../ui';
import { SecuritySettingsStore } from './security-settings.store';

/**
 * "Security" card of the user settings: MFA status, voluntary set-up, device
 * change, recovery-code regeneration and — only while MFA is not mandatory —
 * switching it off.
 */
@Component({
  selector: 'app-security-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SecuritySettingsStore],
  imports: [
    BadgeComponent,
    BtnComponent,
    CardComponent,
    CardHeadComponent,
    LocaleDatePipe,
    MfaCodeInputComponent,
    MfaEnrolmentWizardComponent,
    ModalComponent,
    OverlayComponent,
    RecoveryCodesPanelComponent,
    SFieldComponent,
    SInputComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <mns-card [animate]="true" [delay]="0.09" class="block mb-5 max-w-[760px]">
        <mns-card-head
          [title]="t('settings.user.security.title')"
          [sub]="t('settings.user.security.subtitle')"
          icon="Lock"
        />

        @if (store.loading() && !store.status()) {
          <p class="text-sm text-muted">{{ t('settings.user.security.loading') }}</p>
        } @else if (store.loadFailed() && !store.status()) {
          <p class="text-sm text-offline">{{ t('settings.user.security.loadError') }}</p>
        } @else if (store.status(); as status) {
          <div class="mb-4 flex flex-wrap items-center gap-3">
            @if (status.totpEnabled) {
              <mns-badge tone="online" icon="CheckCircle">{{
                t('settings.user.security.statusEnabled')
              }}</mns-badge>
              @if (status.enabledAt) {
                <span class="text-[12.5px] text-muted">{{
                  t('settings.user.security.enabledSince', {
                    date: status.enabledAt | localeDate: 'mediumDate',
                  })
                }}</span>
              }
            } @else {
              <mns-badge tone="neutral">{{ t('settings.user.security.statusDisabled') }}</mns-badge>
            }
          </div>

          @if (status.totpEnabled) {
            <p class="recovery-remaining mb-3 text-[13px] text-muted">
              {{
                t('settings.user.security.recoveryRemaining', {
                  count: status.recoveryCodesRemaining,
                })
              }}
            </p>
            @if (store.lowRecoveryCodes()) {
              <p
                class="low-codes-warning mb-4 rounded-[10px] border border-warn/40 bg-warn-dim px-3 py-2 text-[13px]"
                role="status"
              >
                {{ t('settings.user.security.lowRecoveryCodes') }}
              </p>
            }
          } @else {
            <p class="mb-4 text-[13px] text-muted">{{ t('settings.user.security.intro') }}</p>
          }

          @if (store.requiredReason(); as reason) {
            <p class="required-note mb-4 text-[12.5px] text-muted">
              {{ t(reason.key, reason.params) }}
            </p>
          }

          <div class="flex flex-wrap gap-2.5">
            @if (status.totpEnabled) {
              <mns-btn variant="outline" class="change-device" (mnsClick)="store.open('device')">
                {{ t('settings.user.security.changeDevice') }}
              </mns-btn>
              <mns-btn variant="outline" class="regenerate" (mnsClick)="store.open('regenerate')">
                {{ t('settings.user.security.regenerate') }}
              </mns-btn>
              @if (!store.isRequired()) {
                <mns-btn variant="danger" class="disable" (mnsClick)="store.open('disable')">
                  {{ t('settings.user.security.disable') }}
                </mns-btn>
              }
            } @else {
              <mns-btn variant="primary" class="enable" (mnsClick)="store.open('enrol')">
                {{ t('settings.user.security.enable') }}
              </mns-btn>
            }
          </div>
        }
      </mns-card>

      @switch (store.dialog()) {
        @case ('enrol') {
          <mns-overlay (closed)="closeWizard()">
            <mns-modal
              [title]="t('settings.user.security.enrolTitle')"
              icon="Lock"
              (closed)="closeWizard()"
            >
              <app-mfa-enrolment-wizard
                [cancellable]="true"
                (cancelled)="store.close()"
                (finished)="store.onEnrolmentFinished()"
              />
            </mns-modal>
          </mns-overlay>
        }
        @case ('device') {
          <mns-overlay (closed)="closeWizard()">
            <mns-modal
              [title]="t('settings.user.security.changeDeviceTitle')"
              icon="Lock"
              (closed)="closeWizard()"
            >
              <app-mfa-enrolment-wizard
                [cancellable]="true"
                [requireCurrentCode]="true"
                (cancelled)="store.close()"
                (finished)="store.onEnrolmentFinished()"
              />
            </mns-modal>
          </mns-overlay>
        }
        @case ('regenerate') {
          <mns-overlay (closed)="store.close()">
            <mns-modal
              [title]="t('settings.user.security.regenerateTitle')"
              icon="Refresh"
              (closed)="store.close()"
            >
              @if (store.regeneratedCodes().length > 0) {
                <app-recovery-codes-panel
                  [codes]="store.regeneratedCodes()"
                  [acknowledged]="store.codesAcknowledged()"
                  (acknowledgedChange)="store.setCodesAcknowledged($event)"
                />
                <div class="mt-5">
                  <mns-btn
                    variant="primary"
                    class="done"
                    [full]="true"
                    [disabled]="!store.codesAcknowledged()"
                    (mnsClick)="store.close()"
                  >
                    {{ t('settings.user.security.done') }}
                  </mns-btn>
                </div>
              } @else {
                <p class="mb-4 text-[13px] text-muted">
                  {{ t('settings.user.security.regenerateDesc') }}
                </p>
                <app-mfa-code-input
                  inputId="mfa-regenerate-code"
                  [label]="t('settings.user.security.codeLabel')"
                  [value]="code()"
                  [disabled]="store.busy()"
                  [invalid]="store.fieldError() !== null"
                  (valueChange)="onCodeChange($event)"
                  (completed)="regenerate()"
                />
                @if (store.fieldError()) {
                  <p class="mt-2 text-sm text-offline" role="alert">{{ store.fieldError() }}</p>
                }
                <div class="mt-5 flex gap-2.5">
                  <mns-btn variant="outline" [full]="true" (mnsClick)="store.close()">
                    {{ t('common.actions.cancel') }}
                  </mns-btn>
                  <mns-btn
                    variant="primary"
                    [full]="true"
                    [disabled]="store.busy() || code().length !== codeLength"
                    (mnsClick)="regenerate()"
                  >
                    {{ t('settings.user.security.regenerateConfirm') }}
                  </mns-btn>
                </div>
              }
            </mns-modal>
          </mns-overlay>
        }
        @case ('disable') {
          <mns-overlay (closed)="closeDisable()">
            <mns-modal
              [title]="t('settings.user.security.disableTitle')"
              icon="Alert"
              (closed)="closeDisable()"
            >
              <p class="mb-4 text-[13px] text-muted">
                {{ t('settings.user.security.disableDesc') }}
              </p>
              <div class="flex flex-col gap-4">
                <mns-sfield [label]="t('settings.user.security.passwordLabel')">
                  <mns-sinput
                    type="password"
                    icon="Lock"
                    [value]="password()"
                    (valueChange)="password.set($event)"
                  />
                </mns-sfield>
                <div>
                  <label
                    for="mfa-disable-code"
                    class="mb-2 block text-[12.5px] font-semibold text-muted"
                    >{{ t('settings.user.security.codeLabel') }}</label
                  >
                  <app-mfa-code-input
                    inputId="mfa-disable-code"
                    [label]="t('settings.user.security.codeLabel')"
                    [value]="code()"
                    [disabled]="store.busy()"
                    [invalid]="store.fieldError() !== null"
                    (valueChange)="onCodeChange($event)"
                  />
                </div>
                @if (store.fieldError()) {
                  <p class="text-sm text-offline" role="alert">{{ store.fieldError() }}</p>
                }
              </div>
              <div class="mt-5 flex gap-2.5">
                <mns-btn variant="outline" [full]="true" (mnsClick)="closeDisable()">
                  {{ t('common.actions.cancel') }}
                </mns-btn>
                <mns-btn
                  variant="danger"
                  class="confirm-disable"
                  [full]="true"
                  [disabled]="store.busy() || !canDisable()"
                  (mnsClick)="disable()"
                >
                  {{ t('settings.user.security.disableConfirm') }}
                </mns-btn>
              </div>
            </mns-modal>
          </mns-overlay>
        }
      }
    </ng-container>
  `,
  host: { style: 'display:block' },
})
export class SecuritySectionComponent implements OnInit {
  protected readonly store = inject(SecuritySettingsStore);
  private readonly wizard = viewChild(MfaEnrolmentWizardComponent);

  protected readonly codeLength = TOTP_CODE_LENGTH;
  protected readonly password = signal('');
  protected readonly code = signal('');

  protected readonly canDisable = computed(
    () => this.password().length > 0 && this.code().length === TOTP_CODE_LENGTH,
  );

  ngOnInit(): void {
    void this.store.load();
  }

  protected onCodeChange(code: string): void {
    this.code.set(code);
    this.store.fieldError.set(null);
  }

  protected async regenerate(): Promise<void> {
    if (this.code().length !== TOTP_CODE_LENGTH) {
      return;
    }
    await this.store.regenerate(this.code());
    this.code.set('');
  }

  protected async disable(): Promise<void> {
    if (!this.canDisable()) {
      return;
    }
    await this.store.disable(this.password(), this.code());
    this.code.set('');
    if (this.store.dialog() === null) {
      this.password.set('');
    }
  }

  protected closeDisable(): void {
    this.password.set('');
    this.code.set('');
    this.store.close();
  }

  /** The wizard's recovery codes must be confirmed as saved before the dialog may close. */
  protected closeWizard(): void {
    this.store.close(this.wizard()?.canLeave() ?? true);
  }
}
