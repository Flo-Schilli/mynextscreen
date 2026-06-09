import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Presentational create-playlist form. Owns the name field via {@link model};
 * the parent performs the create request and feeds back `creating`/`error`.
 */
@Component({
  selector: 'app-playlist-create-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-card">
      <h2>Create Playlist</h2>
      <form (ngSubmit)="create.emit()">
        <div class="form-group">
          <label for="createName">Name</label>
          <input
            id="createName"
            type="text"
            [(ngModel)]="name"
            name="createName"
            required
            placeholder="e.g. Main Stage Loop"
          />
        </div>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="creating()">
            {{ creating() ? 'Creating...' : 'Create Playlist' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .form-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .form-card h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
  `,
})
export class PlaylistCreateForm {
  readonly name = model.required<string>();
  readonly error = input.required<string>();
  readonly creating = input.required<boolean>();
  readonly create = output<void>();
  readonly dismiss = output<void>();
}
