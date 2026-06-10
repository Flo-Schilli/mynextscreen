import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScreenGroupMode } from './screen-group.model';

/**
 * Switch-mode confirmation modal. Switching split → mirror warns that grid
 * positions are cleared; switching mirror → split collects the grid dimensions
 * (two-way `model`s the parent reads when executing). The parent performs the
 * update and feeds `switching`/`error` back in.
 */
@Component({
  selector: 'app-screen-group-switch-mode-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Switch mode"
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
        <h2>Switch Mode</h2>
        @if (mode() === 'split') {
          <div class="warning-box">
            Switching from Split to Mirror will clear all grid positions for assigned screens. This
            action cannot be undone.
          </div>
        }
        @if (mode() === 'mirror') {
          <div class="form-row">
            <div class="form-group">
              <label for="switchGridColumns">Grid Columns</label>
              <input
                id="switchGridColumns"
                type="number"
                [(ngModel)]="gridColumns"
                name="switchGridColumns"
                required
                min="1"
                max="10"
              />
            </div>
            <div class="form-group">
              <label for="switchGridRows">Grid Rows</label>
              <input
                id="switchGridRows"
                type="number"
                [(ngModel)]="gridRows"
                name="switchGridRows"
                required
                min="1"
                max="10"
              />
            </div>
          </div>
        }
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="form-actions">
          <button class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="confirm.emit()" [disabled]="switching()">
            {{ switching() ? 'Switching...' : 'Confirm Switch' }}
          </button>
        </div>
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

    /* Warning */
    .warning-box {
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: #fbbf24;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ScreenGroupSwitchModeModal {
  readonly mode = input.required<ScreenGroupMode>();
  readonly switching = input.required<boolean>();
  readonly error = input.required<string>();
  readonly gridColumns = model<number>(2);
  readonly gridRows = model<number>(2);

  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
