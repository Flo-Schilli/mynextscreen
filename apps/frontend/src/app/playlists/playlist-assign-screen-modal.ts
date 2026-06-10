import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Screen } from '../screens/screen.model';

/**
 * Presentational modal for bulk-assigning the selected playlists to a screen.
 * The chosen screen id is two-way bound via {@link model}; loading/error state
 * is fed in by the parent, which owns the fetch and the bulk-assign request.
 */
@Component({
  selector: 'app-playlist-assign-screen-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Assign to screens"
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
        <h2>Assign to Screen</h2>
        <p>
          Select a screen to assign <strong>{{ count() }} playlist(s)</strong> to:
        </p>
        <div class="form-group">
          <label for="screenSelect">Screen</label>
          <select id="screenSelect" [(ngModel)]="selectedScreenId" name="screenSelect">
            <option value="">-- Select a screen --</option>
            @for (screen of screens(); track screen.id) {
              <option [value]="screen.id">{{ screen.name }} ({{ screen.location }})</option>
            }
          </select>
        </div>
        @if (loadError()) {
          <p class="error">{{ loadError() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button
            class="btn btn-primary"
            (click)="confirm.emit()"
            [disabled]="loading() || !selectedScreenId()"
          >
            {{ loading() ? 'Loading...' : 'Assign' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PlaylistAssignScreenModal {
  readonly screens = input.required<Screen[]>();
  readonly loading = input.required<boolean>();
  readonly loadError = input.required<string>();
  readonly count = input.required<number>();
  readonly selectedScreenId = model.required<string>();
  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
