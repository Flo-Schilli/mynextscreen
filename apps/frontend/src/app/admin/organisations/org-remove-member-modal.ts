import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  imports: [OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Remove Member" icon="Trash" (closed)="dismiss.emit()">
        <p class="text-sm text-muted leading-relaxed">
          Are you sure you want to remove
          <strong class="text-default">{{ member().user.email }}</strong> from this organisation?
        </p>
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn variant="danger" [disabled]="removing()" (mnsClick)="confirm.emit()">
            {{ removing() ? 'Removing…' : 'Remove' }}
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
