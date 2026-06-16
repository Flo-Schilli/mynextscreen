import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AdminUser } from './admin-user.model';
import { OverlayComponent, ModalComponent, BtnComponent } from '../../ui';

/**
 * Delete-confirmation modal for a user. The parent performs the HTTP request and
 * feeds `deleting`/`error` back in.
 */
@Component({
  selector: 'app-user-delete-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayComponent, ModalComponent, BtnComponent],
  template: `
    <mns-overlay (closed)="dismiss.emit()">
      <mns-modal title="Delete User" icon="Trash" (closed)="dismiss.emit()">
        <p class="text-sm text-muted leading-relaxed">
          Are you sure you want to delete <strong class="text-default">{{ user().email }}</strong
          >? This removes the user and all of their organisation memberships. This action cannot be
          undone.
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
export class UserDeleteModal {
  readonly user = input.required<AdminUser>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
