import { Component, inject, input, output } from '@angular/core';
import { Screen } from './screen.model';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';

/**
 * Presentational screen grid: select-all header, the card grid with online/
 * offline status dots, and the bulk-action toolbar. Reads the parent-provided
 * {@link SelectionService} instance and emits the clicked screen; the parent
 * owns data loading and the bulk-action handlers.
 */
@Component({
  selector: 'app-screen-grid',
  standalone: true,
  imports: [SelectionCheckboxComponent, SelectAllCheckboxComponent, BulkActionToolbarComponent],
  template: `
    <div class="select-all-row">
      <app-select-all-checkbox [allIds]="screenIds()" />
      <span class="select-all-label">Select all</span>
    </div>
    <div class="screen-grid">
      @for (screen of screens(); track screen.id; let i = $index) {
        <div
          class="screen-card"
          [class.selected]="selectionService.isSelected(screen.id)()"
          (click)="selectItem.emit(screen)"
          tabindex="0"
          role="button"
          (keydown.enter)="selectItem.emit(screen)"
          (keydown.space)="selectItem.emit(screen)"
        >
          <div class="card-header">
            <app-selection-checkbox
              [itemId]="screen.id"
              [itemIndex]="i"
              [orderedIds]="screenIds()"
              (click)="$event.stopPropagation()"
            />
            <span class="screen-name">{{ screen.name }}</span>
            <span
              class="status-dot"
              [class.online]="screen.isOnline"
              [class.offline]="!screen.isOnline"
              [attr.title]="screen.isOnline ? 'Online' : 'Offline'"
            ></span>
          </div>
          <div class="card-body">
            <div class="card-field">
              <span class="card-label">Location</span>
              <span class="card-value">{{ screen.location }}</span>
            </div>
            <div class="card-field">
              <span class="card-label">Resolution</span>
              <span class="card-value">{{ screen.resolution }}</span>
            </div>
            <div class="card-field">
              <span class="card-label">Status</span>
              <span
                class="card-value status-text"
                [class.online]="screen.isOnline"
                [class.offline]="!screen.isOnline"
              >
                {{ screen.isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
          </div>
        </div>
      }
    </div>

    <app-bulk-action-toolbar [actions]="bulkActions()" />
  `,
  styles: `
    /* Select All Row */
    .select-all-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      padding: 0.25rem 0;
    }
    .select-all-label {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    /* Screen Grid */
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .screen-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.25rem;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .screen-card:hover,
    .screen-card:focus {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
      outline: none;
    }
    .screen-card.selected {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 10%, var(--color-bg-secondary));
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .screen-name {
      font-size: 1rem;
      font-weight: 600;
      flex: 1;
    }
    .status-dot {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e80;
    }
    .status-dot.offline {
      background: #ef4444;
      box-shadow: 0 0 6px #ef444480;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card-field {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
    }
    .card-label {
      color: var(--color-text-secondary);
    }
    .card-value {
      color: var(--color-text-primary);
    }
    .status-text.online {
      color: #22c55e;
    }
    .status-text.offline {
      color: #ef4444;
    }
  `,
})
export class ScreenGrid {
  readonly screens = input.required<Screen[]>();
  readonly screenIds = input.required<string[]>();
  readonly bulkActions = input.required<BulkAction[]>();
  readonly selectItem = output<Screen>();

  protected readonly selectionService = inject(SelectionService);
}
