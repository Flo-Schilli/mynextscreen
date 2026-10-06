import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { OrgMember } from './organisation.model';
import { OverlayComponent, ModalComponent, BtnComponent } from '../../ui';

/**
 * Remove-member confirmation modal. The parent performs the HTTP request and
 * feeds `removing` back in to disable the confirm button.
 */
@Component({
  selector: 'app-org-remove-member-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, TranslocoDirective],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="t('admin.removeMemberModal.title')"
        icon="Trash"
        (closed)="dismiss.emit()"
      >
        <p class="text-sm text-muted leading-relaxed">
          {{ t('admin.removeMemberModal.confirmPrefix') }}
          <strong class="text-text">{{ member().user.email }}</strong
          >{{ t('admin.removeMemberModal.confirmSuffix') }}
        </p>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn variant="danger" [disabled]="removing()" (mnsClick)="confirm.emit()">
            {{ removing() ? t('admin.removeMemberModal.removing') : t('common.actions.remove') }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class OrgRemoveMemberModal {
  readonly member = input.required<OrgMember>();
  readonly removing = input.required<boolean>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
