import { Component, input, output } from '@angular/core';
import { LiveStream } from './live-stream.model';

/**
 * Delete-confirmation modal for a live stream. The parent performs the HTTP
 * request and feeds `deleting`/`error` back in.
 */
@Component({
  selector: 'app-live-stream-delete-modal',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm deletion"
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
        <h2>Delete Live Stream</h2>
        <p>
          Are you sure you want to delete <strong>{{ stream().name }}</strong
          >? This action cannot be undone.
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
export class LiveStreamDeleteModal {
  readonly stream = input.required<LiveStream>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
