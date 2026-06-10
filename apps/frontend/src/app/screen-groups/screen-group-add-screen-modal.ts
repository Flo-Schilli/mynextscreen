import { Component, input, output } from '@angular/core';
import { Screen } from '../screens/screen.model';

/**
 * Mirror-mode "add screen to group" modal. Presentational: the parent supplies
 * the available screens, loading/error flags and the current group id, and runs
 * the assignment on `add`.
 */
@Component({
  selector: 'app-screen-group-add-screen-modal',
  standalone: true,
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add Screen"
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
        <h2>Add Screen to Group</h2>
        @if (loadingScreens()) {
          <p class="loading-text">Loading screens...</p>
        } @else if (availableScreens().length === 0) {
          <p class="sidebar-empty">No unassigned screens available.</p>
          <div class="form-actions">
            <button class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
          </div>
        } @else {
          <div class="add-screen-list">
            @for (screen of availableScreens(); track screen.id) {
              <div class="add-screen-item">
                <div class="add-screen-info">
                  <span class="add-screen-name">{{ screen.name }}</span>
                  @if (screen.groupId && screen.groupId !== groupId()) {
                    <span class="already-assigned-badge">Already in another group</span>
                  }
                </div>
                <button
                  class="btn btn-small btn-primary"
                  (click)="add.emit(screen)"
                  [disabled]="
                    operationInProgress() || !!(screen.groupId && screen.groupId !== groupId())
                  "
                >
                  Add
                </button>
              </div>
            }
          </div>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <div class="form-actions">
            <button class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .sidebar-empty {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }
    .already-assigned-badge {
      font-size: 0.6875rem;
      color: #f59e0b;
      background: #f59e0b18;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
    }

    /* Add Screen Modal */
    .add-screen-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 20rem;
      overflow-y: auto;
      margin-bottom: 1rem;
    }
    .add-screen-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
    }
    .add-screen-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .add-screen-name {
      font-size: 0.875rem;
      font-weight: 500;
    }
  `,
})
export class ScreenGroupAddScreenModal {
  readonly availableScreens = input.required<Screen[]>();
  readonly loadingScreens = input.required<boolean>();
  readonly error = input.required<string>();
  readonly groupId = input.required<string>();
  readonly operationInProgress = input.required<boolean>();

  readonly add = output<Screen>();
  readonly dismiss = output<void>();
}
