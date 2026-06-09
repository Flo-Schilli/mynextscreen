import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScreenGroup } from '../screen-groups/screen-group.model';

/**
 * Bulk "assign to group" modal. Presentational: the parent owns the group list,
 * loading/error flags and the selection count, and runs the bulk request on
 * `confirm`. The chosen group id is a two-way `model` so the parent can read it
 * when executing the assignment. An empty value means "remove from group".
 */
@Component({
  selector: 'app-screen-assign-group-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Assign to group"
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
        <h2>Assign to Group</h2>
        <p>
          Select a group to assign <strong>{{ count() }} screen(s)</strong> to:
        </p>
        <div class="form-group">
          <label for="groupSelect">Group</label>
          <select id="groupSelect" [(ngModel)]="selectedGroupId" name="groupSelect">
            <option value="">-- No group (remove from group) --</option>
            @for (group of groups(); track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
        </div>
        @if (loadError()) {
          <p class="error">{{ loadError() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="confirm.emit()" [disabled]="loading()">
            {{ loading() ? 'Loading...' : 'Assign' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ScreenAssignGroupModal {
  readonly groups = input.required<ScreenGroup[]>();
  readonly loading = input.required<boolean>();
  readonly loadError = input.required<string>();
  readonly count = input.required<number>();
  readonly selectedGroupId = model<string>('');

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
