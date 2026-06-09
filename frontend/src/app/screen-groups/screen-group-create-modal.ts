import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreateScreenGroupRequest, ScreenGroupMode } from './screen-group.model';

/**
 * Create-screen-group modal. Owns its own field state (name, mode, grid
 * dimensions) and validates required fields locally, emitting a resolved
 * {@link CreateScreenGroupRequest} only when valid. The parent performs the
 * HTTP request and feeds `creating`/`error` back in.
 */
@Component({
  selector: 'app-screen-group-create-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Create Screen Group"
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
        <h2>Create Screen Group</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="createName">Name</label>
            <input
              id="createName"
              type="text"
              [(ngModel)]="name"
              name="createName"
              required
              placeholder="e.g. Lobby Video Wall"
            />
          </div>
          <div class="form-group">
            <label for="createMode">Mode</label>
            <select id="createMode" [(ngModel)]="mode" name="createMode" required>
              <option value="mirror">Mirror</option>
              <option value="split">Split (Video Wall)</option>
            </select>
          </div>
          @if (mode === 'split') {
            <div class="form-row">
              <div class="form-group">
                <label for="createGridColumns">Grid Columns</label>
                <input
                  id="createGridColumns"
                  type="number"
                  [(ngModel)]="gridColumns"
                  name="createGridColumns"
                  required
                  min="1"
                  max="10"
                  placeholder="e.g. 2"
                />
              </div>
              <div class="form-group">
                <label for="createGridRows">Grid Rows</label>
                <input
                  id="createGridRows"
                  type="number"
                  [(ngModel)]="gridRows"
                  name="createGridRows"
                  required
                  min="1"
                  max="10"
                  placeholder="e.g. 2"
                />
              </div>
            </div>
          }
          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="creating()">
              {{ creating() ? 'Creating...' : 'Create Group' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    /* Two-column form layout */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ScreenGroupCreateModal {
  readonly creating = input.required<boolean>();
  readonly error = input.required<string>();

  readonly create = output<CreateScreenGroupRequest>();
  readonly dismiss = output<void>();

  protected name = '';
  protected mode: ScreenGroupMode = 'mirror';
  protected gridColumns = 2;
  protected gridRows = 2;
  protected readonly localError = signal('');

  onSubmit(): void {
    if (!this.name) {
      this.localError.set('Name is required.');
      return;
    }
    if (this.mode === 'split' && (!this.gridColumns || !this.gridRows)) {
      this.localError.set('Grid columns and rows are required for split mode.');
      return;
    }

    this.localError.set('');
    this.create.emit({
      name: this.name,
      mode: this.mode,
      ...(this.mode === 'split' ? { gridColumns: this.gridColumns, gridRows: this.gridRows } : {}),
    });
  }
}
