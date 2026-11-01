import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MfaCodeInputComponent, TOTP_CODE_LENGTH } from '../mfa-code-input';
import { ToastService } from '../../shared/toast/toast.service';
import { BtnComponent, CopyButtonComponent, SFieldComponent, SInputComponent } from '../../ui';
import { ENROLMENT_STEPS, MfaEnrolmentStore } from './mfa-enrolment.store';
import { RecoveryCodesPanelComponent } from './recovery-codes-panel';

/**
 * TOTP enrolment wizard: password → QR code + manual secret → first code →
 * recovery codes (must be acknowledged). Used full-screen as the mandatory
 * enrolment and inside a dialog from the user settings (voluntary / device
 * change). All secret material lives in the component-scoped store and is
 * wiped with it.
 */
@Component({
  selector: 'app-mfa-enrolment-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MfaEnrolmentStore],
  imports: [
    BtnComponent,
    CopyButtonComponent,
    FormsModule,
    MfaCodeInputComponent,
    RecoveryCodesPanelComponent,
    SFieldComponent,
    SInputComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <!-- progress -->
      <ol class="mb-5 flex items-center gap-1.5" [attr.aria-label]="t('auth.mfa.enrol.progress')">
        @for (s of steps; track s; let i = $index) {
          <li
            class="h-1.5 flex-1 rounded-full transition-colors duration-[180ms]"
            [class.bg-accent]="i <= store.stepIndex()"
            [class.bg-track]="i > store.stepIndex()"
            [attr.aria-current]="i === store.stepIndex() ? 'step' : null"
          ></li>
        }
      </ol>

      @switch (store.step()) {
        @case ('password') {
          <h3 class="mb-1 text-[15px] font-bold">{{ t('auth.mfa.enrol.password.title') }}</h3>
          <p class="mb-4 text-[13px] text-muted">
            {{
              requireCurrentCode()
                ? t('auth.mfa.enrol.password.descDeviceChange')
                : t('auth.mfa.enrol.password.desc')
            }}
          </p>
          <form class="flex flex-col gap-4" (ngSubmit)="submitPassword()">
            <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
            <mns-sfield [label]="t('auth.mfa.enrol.password.label')">
              <mns-sinput
                type="password"
                icon="Lock"
                [value]="password()"
                (valueChange)="password.set($event)"
              />
            </mns-sfield>
            @if (requireCurrentCode()) {
              <div>
                <label
                  for="mfa-current-code"
                  class="mb-2 block text-[12.5px] font-semibold text-muted"
                >
                  {{ t('auth.mfa.enrol.password.currentCodeLabel') }}
                </label>
                <app-mfa-code-input
                  inputId="mfa-current-code"
                  [label]="t('auth.mfa.enrol.password.currentCodeLabel')"
                  [value]="currentCode()"
                  (valueChange)="currentCode.set($event)"
                />
              </div>
            }
            @if (store.fieldError()) {
              <p class="text-sm text-offline" role="alert">{{ store.fieldError() }}</p>
            }
            <div class="flex gap-2.5">
              @if (cancellable()) {
                <mns-btn variant="outline" [disabled]="store.busy()" (mnsClick)="cancel()">
                  {{ t('common.actions.cancel') }}
                </mns-btn>
              }
              <mns-btn
                variant="primary"
                class="continue"
                [disabled]="store.busy() || !canSubmitPassword()"
                (mnsClick)="submitPassword()"
              >
                {{ t('auth.mfa.enrol.continue') }}
              </mns-btn>
            </div>
          </form>
        }

        @case ('scan') {
          @if (store.setup(); as setup) {
            <h3 class="mb-1 text-[15px] font-bold">{{ t('auth.mfa.enrol.scan.title') }}</h3>
            <p class="mb-4 text-[13px] text-muted">{{ t('auth.mfa.enrol.scan.desc') }}</p>
            <div class="mb-4 flex justify-center">
              <img
                class="h-[200px] w-[200px] rounded-[12px] bg-white p-2"
                [src]="setup.qrDataUrl"
                [alt]="t('auth.mfa.enrol.scan.qrAlt')"
              />
            </div>
            <p class="mb-1.5 text-[12.5px] font-semibold text-muted">
              {{ t('auth.mfa.enrol.scan.manual') }}
            </p>
            <div
              class="mb-5 flex items-center gap-2 rounded-[10px] border border-border bg-surface-2 px-3 py-2"
            >
              <code class="secret min-w-0 flex-1 break-all font-mono text-[13px]">{{
                setup.secret
              }}</code>
              <mns-copy-button
                [text]="setup.secret"
                [label]="t('auth.mfa.enrol.scan.copySecret')"
                (copied)="onSecretCopied()"
                (copyFailed)="onCopyFailed()"
              />
            </div>
            <div class="flex gap-2.5">
              <mns-btn variant="outline" (mnsClick)="store.restart()">
                {{ t('auth.mfa.enrol.back') }}
              </mns-btn>
              <mns-btn variant="primary" class="continue" (mnsClick)="store.goToVerify()">
                {{ t('auth.mfa.enrol.continue') }}
              </mns-btn>
            </div>
          }
        }

        @case ('verify') {
          <h3 class="mb-1 text-[15px] font-bold">{{ t('auth.mfa.enrol.verify.title') }}</h3>
          <p class="mb-4 text-[13px] text-muted">{{ t('auth.mfa.enrol.verify.desc') }}</p>
          <form class="flex flex-col gap-4" (ngSubmit)="submitCode()">
            <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
            <app-mfa-code-input
              inputId="mfa-enrol-code"
              [label]="t('auth.mfa.enrol.verify.label')"
              [value]="code()"
              [disabled]="store.busy()"
              [invalid]="store.fieldError() !== null"
              (valueChange)="onCodeChange($event)"
              (completed)="submitCode()"
            />
            @if (store.fieldError()) {
              <p class="text-sm text-offline" role="alert">{{ store.fieldError() }}</p>
            }
            <div class="flex gap-2.5">
              <mns-btn variant="outline" [disabled]="store.busy()" (mnsClick)="store.backToScan()">
                {{ t('auth.mfa.enrol.back') }}
              </mns-btn>
              <mns-btn
                variant="primary"
                class="continue"
                [disabled]="store.busy() || code().length !== codeLength"
                (mnsClick)="submitCode()"
              >
                {{
                  store.busy()
                    ? t('auth.mfa.enrol.verify.verifying')
                    : t('auth.mfa.enrol.verify.submit')
                }}
              </mns-btn>
            </div>
          </form>
        }

        @case ('codes') {
          <h3 class="mb-1 text-[15px] font-bold">{{ t('auth.mfa.enrol.codes.title') }}</h3>
          <app-recovery-codes-panel
            [codes]="store.recoveryCodes()"
            [acknowledged]="store.acknowledged()"
            (acknowledgedChange)="store.setAcknowledged($event)"
          />
          <div class="mt-5">
            <mns-btn
              variant="primary"
              class="finish"
              [full]="true"
              [disabled]="!store.canFinish()"
              (mnsClick)="finish()"
            >
              {{ t('auth.mfa.enrol.codes.finish') }}
            </mns-btn>
          </div>
        }
      }
    </ng-container>
  `,
})
export class MfaEnrolmentWizardComponent {
  protected readonly store = inject(MfaEnrolmentStore);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Device change: TOTP is active, the backend wants a code from the old device too. */
  readonly requireCurrentCode = input<boolean>(false);
  /** Voluntary use (settings dialog) offers "Cancel" on the first step. */
  readonly cancellable = input<boolean>(false);

  /** Recovery codes acknowledged: the factor is active and saved. */
  readonly finished = output<void>();
  readonly cancelled = output<void>();

  protected readonly steps = ENROLMENT_STEPS;
  protected readonly codeLength = TOTP_CODE_LENGTH;
  protected readonly password = signal('');
  protected readonly currentCode = signal('');
  protected readonly code = signal('');

  protected readonly canSubmitPassword = computed(
    () =>
      this.password().length > 0 &&
      (!this.requireCurrentCode() || this.currentCode().length === TOTP_CODE_LENGTH),
  );

  /** False while the freshly issued recovery codes are not yet confirmed as saved. */
  canLeave(): boolean {
    return this.store.canLeave();
  }

  protected async submitPassword(): Promise<void> {
    if (!this.canSubmitPassword()) {
      return;
    }
    const ok = await this.store.start(
      this.password(),
      this.requireCurrentCode() ? this.currentCode() : undefined,
    );
    if (ok) {
      this.password.set('');
      this.currentCode.set('');
    }
  }

  protected onCodeChange(code: string): void {
    this.code.set(code);
    this.store.fieldError.set(null);
  }

  protected async submitCode(): Promise<void> {
    if (this.code().length !== TOTP_CODE_LENGTH) {
      return;
    }
    await this.store.confirm(this.code());
    this.code.set('');
  }

  protected finish(): void {
    if (!this.store.canFinish()) {
      return;
    }
    this.store.reset();
    this.finished.emit();
  }

  protected cancel(): void {
    this.password.set('');
    this.currentCode.set('');
    this.store.reset();
    this.cancelled.emit();
  }

  protected onSecretCopied(): void {
    this.toast.success(this.transloco.translate('auth.mfa.enrol.scan.secretCopied'));
  }

  protected onCopyFailed(): void {
    this.toast.error(this.transloco.translate('auth.mfa.codes.copyFailed'));
  }
}
