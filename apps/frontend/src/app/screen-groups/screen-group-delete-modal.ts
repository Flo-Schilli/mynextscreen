import { Component, input, output } from '@angular/core';
import { ScreenGroup } from './screen-group.model';

/**
 * Delete-confirmation modal for a screen group. Blocks deletion while the group
 * still has assigned screens; otherwise asks for confirmation. The parent
 * performs the HTTP request and feeds `deleting`/`error` back in.
 */
@Component({
  selector: 'app-screen-group-delete-modal',
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
        <h2>Delete Screen Group</h2>
        @if (group().screens.length > 0) {
          <div class="delete-blocked">
            Cannot delete "{{ group().name }}" because it still has
            {{ group().screens.length }} assigned screen(s). Remove all screens from the group
            before deleting it.
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
          </div>
        } @else {
          <p>
            Are you sure you want to delete the screen group
            <strong>{{ group().name }}</strong
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
        }
      </div>
    </div>
  `,
  styles: `
    /* Delete blocked notice */
    .delete-blocked {
      background: color-mix(in srgb, #92400e 15%, transparent);
      border: 1px solid color-mix(in srgb, #92400e 50%, transparent);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: #fbbf24;
      line-height: 1.5;
    }
  `,
})
export class ScreenGroupDeleteModal {
  readonly group = input.required<ScreenGroup>();
  readonly deleting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
