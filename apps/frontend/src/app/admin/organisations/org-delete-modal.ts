import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Organisation } from './organisation.model';
import { OverlayComponent, ModalComponent, BtnComponent } from '../../ui';

/**
 * Delete-confirmation modal for an organisation. Deleting an org is irreversible
 * and cascades to every screen, content item, playlist and schedule it owns, so
 * the warning is explicit. The parent performs the HTTP request and feeds
 * `deleting`/`error` back in.
 */
@Component({
  selector: 'app-org-delete-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent, TranslocoDirective],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="t('admin.deleteOrgModal.title')" icon="Trash" (closed)="dismiss.emit()">
        <p class="text-sm text-muted leading-relaxed">
          {{ t('admin.deleteOrgModal.confirmPrefix') }}
          <strong class="text-text">{{ org().name }}</strong
          >{{ t('admin.deleteOrgModal.confirmSuffix') }}
        </p>
        @if (error()) {
          <p class="text-offline text-sm mt-3">{{ error() }}</p>
        }
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">{{
            t('common.actions.cancel')
          }}</mns-btn>
          <mns-btn variant="danger" [disabled]="deleting()" (mnsClick)="confirm.emit()">
            {{ deleting() ? t('admin.deleteOrgModal.deleting') : t('common.actions.delete') }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class OrgDeleteModal {
  readonly org = input.required<Organisation>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
