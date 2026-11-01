import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { BtnComponent, ModalComponent, OverlayComponent } from '../ui';

/**
 * Confirmation for resetting someone's second factor (member list and
 * instance-admin user list). The parent performs the request.
 */
@Component({
  selector: 'app-mfa-reset-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, TranslocoDirective],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('mfaAdmin.reset.confirm.title')" icon="Lock" (closed)="dismiss.emit()">
        <p class="text-sm text-muted leading-relaxed">
          {{ t('mfaAdmin.reset.confirm.prefix') }}
          <strong class="text-text">{{ email() }}</strong>
          {{ t('mfaAdmin.reset.confirm.suffix') }}
        </p>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn
            class="confirm-reset"
            variant="danger"
            icon="Lock"
            [disabled]="busy()"
            (mnsClick)="confirm.emit()"
          >
            {{
              busy() ? t('mfaAdmin.reset.confirm.submitting') : t('mfaAdmin.reset.confirm.submit')
            }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class MfaResetConfirmModal {
  readonly email = input.required<string>();
  readonly busy = input<boolean>(false);

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
