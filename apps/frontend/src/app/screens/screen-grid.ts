import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Screen } from './screen.model';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';
import { IconComponent } from '../ui';

type StatusFilter = 'all' | 'online' | 'offline';

interface StatusCounts {
  all: number;
  online: number;
  offline: number;
}

/**
 * Presentational screen grid: status-filter pills, card grid with online/offline
 * status dots, and the bulk-action toolbar. Reads the parent-provided
 * {@link SelectionService} instance and emits the clicked screen; the parent
 * owns data loading and the bulk-action handlers.
 */
@Component({
  selector: 'app-screen-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SelectionCheckboxComponent,
    SelectAllCheckboxComponent,
    BulkActionToolbarComponent,
    IconComponent,
  ],
  template: `
    <!-- Filter pills -->
    <div class="flex flex-wrap gap-2 mb-5">
      @for (tab of filterTabs; track tab.value) {
        <button
          type="button"
          class="filter-pill"
          [class.active]="activeFilter() === tab.value"
          (click)="setFilter(tab.value)"
        >
          @if (tab.value !== 'all') {
            <span
              class="status-dot"
              [class.online]="tab.value === 'online'"
              [class.offline]="tab.value === 'offline'"
              [attr.title]="tab.value"
            ></span>
          }
          {{ tab.label }}
          <span class="pill-count">{{ counts()[tab.value] }}</span>
        </button>
      }
    </div>

    <!-- Select-all row -->
    <div class="flex items-center gap-2 mb-3">
      <app-select-all-checkbox [allIds]="filteredIds()" />
      <span class="text-[13px] text-muted">Select all</span>
    </div>

    <!-- Card grid -->
    <div class="screen-grid">
      @for (screen of filteredScreens(); track screen.id; let i = $index) {
        <div
          class="screen-card"
          [class.selected]="selectionService.isSelected(screen.id)()"
          (click)="selectItem.emit(screen)"
          tabindex="0"
          role="button"
          (keydown.enter)="selectItem.emit(screen)"
          (keydown.space)="selectItem.emit(screen)"
        >
          <!-- Thumbnail band -->
          <div class="thumb-band">
            <mns-icon name="Screens" [size]="28" class="text-faint" />
          </div>

          <!-- Card body -->
          <div class="card-body">
            <div class="card-header">
              <app-selection-checkbox
                [itemId]="screen.id"
                [itemIndex]="i"
                [orderedIds]="filteredIds()"
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

            <div class="card-meta">
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
        </div>
      }
    </div>

    <app-bulk-action-toolbar [actions]="bulkActions()" />
  `,
  styles: `
    /* Filter pills */
    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 99px;
      font-size: 13.5px;
      font-weight: 600;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      cursor: pointer;
      transition:
        border-color 150ms,
        background 150ms,
        color 150ms;
    }
    .filter-pill:hover {
      border-color: var(--border-strong);
      color: var(--text);
    }
    .filter-pill.active {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent);
    }
    .pill-count {
      font-family: var(--font-mono, monospace);
      opacity: 0.7;
      font-size: 12px;
    }

    /* Screen grid */
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
      gap: var(--gap, 1rem);
    }

    /* Screen card */
    .screen-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition:
        border-color 150ms,
        box-shadow 150ms;
      box-shadow: var(--shadow);
    }
    .screen-card:hover,
    .screen-card:focus-visible {
      border-color: var(--accent);
      box-shadow: var(--shadow-lg);
      outline: none;
    }
    .screen-card.selected {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 6%, var(--surface));
    }

    /* Thumb band (16:9 aspect) */
    .thumb-band {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--surface-2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Card body */
    .card-body {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .screen-name {
      font-size: 14.5px;
      font-weight: 700;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Status dot (shared: filter pills + card header) */
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: var(--color-online, #22c55e);
      box-shadow: 0 0 0 3px var(--online-dim, #22c55e26);
    }
    .status-dot.offline {
      background: var(--color-offline, #ef4444);
      box-shadow: 0 0 0 3px var(--offline-dim, #ef444426);
    }

    /* Card meta rows */
    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .card-field {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
    }
    .card-label {
      color: var(--text-muted);
    }
    .card-value {
      color: var(--text);
    }
    .status-text.online {
      color: var(--color-online, #22c55e);
    }
    .status-text.offline {
      color: var(--color-offline, #ef4444);
    }

    @media (prefers-reduced-motion: reduce) {
      .screen-card,
      .filter-pill {
        transition: none;
      }
    }
  `,
})
export class ScreenGrid {
  readonly screens = input.required<Screen[]>();
  readonly screenIds = input.required<string[]>();
  readonly bulkActions = input.required<BulkAction[]>();
  readonly selectItem = output<Screen>();

  protected readonly selectionService = inject(SelectionService);

  protected readonly filterTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
  ];

  protected readonly activeFilter = signal<StatusFilter>('all');

  protected readonly counts = computed<StatusCounts>(() => {
    const all = this.screens();
    return {
      all: all.length,
      online: all.filter((s) => s.isOnline).length,
      offline: all.filter((s) => !s.isOnline).length,
    };
  });

  protected readonly filteredScreens = computed<Screen[]>(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.screens();
    return this.screens().filter((s) => (f === 'online' ? s.isOnline : !s.isOnline));
  });

  protected readonly filteredIds = computed<string[]>(() =>
    this.filteredScreens().map((s) => s.id),
  );

  protected setFilter(value: StatusFilter): void {
    this.activeFilter.set(value);
  }
}
