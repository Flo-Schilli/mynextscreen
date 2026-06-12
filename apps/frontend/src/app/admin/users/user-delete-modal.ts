import { Component, input, output } from '@angular/core';
import { AdminUser } from './admin-user.model';

/**
 * Delete-confirmation modal for a user. The parent performs the HTTP request and
 * feeds `deleting`/`error` back in.
 */
@Component({
  selector: 'app-user-delete-modal',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm user deletion"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Delete User</h2>
        <p>
          Are you sure you want to delete <strong>{{ user().email }}</strong
          >? This removes the user and all of their organisation memberships. This action cannot be
          undone.
        </p>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-danger" (click)="confirm.emit()" [disabled]="deleting()">
            {{ deleting() ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class UserDeleteModal {
  readonly user = input.required<AdminUser>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
