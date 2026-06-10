import { Component, input, output, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScreenGroup, ScreenGroupMode, UpdateScreenGroupRequest } from './screen-group.model';

/**
 * Edit-screen-group modal. Seeds its field state once from the `group` input on
 * open (the parent recreates the component per selection via `@if`), validates
 * required fields locally, and emits an {@link UpdateScreenGroupRequest} when
 * valid. The parent performs the HTTP request and feeds `saving`/`error` back in.
 */
@Component({
  selector: 'app-screen-group-edit-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Screen Group"
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
        <h2>Edit Screen Group</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="editName">Name</label>
            <input id="editName" type="text" [(ngModel)]="name" name="editName" required />
          </div>
          <div class="form-group">
            <label for="editMode">Mode</label>
            <select id="editMode" [(ngModel)]="mode" name="editMode" required>
              <option value="mirror">Mirror</option>
              <option value="split">Split (Video Wall)</option>
            </select>
          </div>
          @if (mode === 'split') {
            <div class="form-row">
              <div class="form-group">
                <label for="editGridColumns">Grid Columns</label>
                <input
                  id="editGridColumns"
                  type="number"
                  [(ngModel)]="gridColumns"
                  name="editGridColumns"
                  required
                  min="1"
                  max="10"
                />
              </div>
              <div class="form-group">
                <label for="editGridRows">Grid Rows</label>
                <input
                  id="editGridRows"
                  type="number"
                  [(ngModel)]="gridRows"
                  name="editGridRows"
                  required
                  min="1"
                  max="10"
                />
              </div>
            </div>
          }
          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Changes' }}
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
export class ScreenGroupEditModal implements OnInit {
  readonly group = input.required<ScreenGroup>();
  readonly saving = input.required<boolean>();
  readonly error = input.required<string>();

  readonly save = output<UpdateScreenGroupRequest>();
  readonly dismiss = output<void>();

  protected name = '';
  protected mode: ScreenGroupMode = 'mirror';
  protected gridColumns = 2;
  protected gridRows = 2;
  protected readonly localError = signal('');

  ngOnInit(): void {
    const group = this.group();
    this.name = group.name;
    this.mode = group.mode;
    this.gridColumns = group.gridColumns ?? 2;
    this.gridRows = group.gridRows ?? 2;
  }

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
    this.save.emit({
      name: this.name,
      mode: this.mode,
      ...(this.mode === 'split' ? { gridColumns: this.gridColumns, gridRows: this.gridRows } : {}),
    });
  }
}
