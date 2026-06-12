import { Component, input, output } from '@angular/core';
import { Organisation } from './organisation.model';

/**
 * Delete-confirmation modal for an organisation. Deleting an org is irreversible
 * and cascades to every screen, content item, playlist and schedule it owns, so
 * the warning is explicit. The parent performs the HTTP request and feeds
 * `deleting`/`error` back in.
 */
@Component({
  selector: 'app-org-delete-modal',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm organisation deletion"
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
        <h2>Delete Organisation</h2>
        <p>
          Are you sure you want to delete <strong>{{ org().name }}</strong
          >? This permanently deletes all of its screens, content, playlists and schedules. This
          action cannot be undone.
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
export class OrgDeleteModal {
  readonly org = input.required<Organisation>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
