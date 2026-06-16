import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
  imports: [OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Delete Organisation" icon="Trash" (closed)="dismiss.emit()">
        <p class="text-sm text-muted leading-relaxed">
          Are you sure you want to delete <strong class="text-default">{{ org().name }}</strong
          >? This permanently deletes all of its screens, content, playlists and schedules. This
          action cannot be undone.
        </p>
        @if (error()) {
          <p class="text-offline text-sm mt-3">{{ error() }}</p>
        }
        <div slot="footer" class="flex justify-end gap-2 px-6 pb-5 pt-1">
          <mns-btn variant="outline" (mnsClick)="dismiss.emit()">Cancel</mns-btn>
          <mns-btn variant="danger" [disabled]="deleting()" (mnsClick)="confirm.emit()">
            {{ deleting() ? 'Deleting…' : 'Delete' }}
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
