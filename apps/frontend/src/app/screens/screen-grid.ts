import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ScreenListItem } from './screen.model';
import { ScreenTile } from './screen-tile';

type StatusFilter = 'all' | 'online' | 'offline';

interface StatusCounts {
  all: number;
  online: number;
  offline: number;
}

/**
 * Presentational screen grid: status-filter pills with counts plus a card grid
 * built from the shared {@link ScreenTile}. Each tile exposes a top-right delete
 * action; the grid forwards the tile `open`/`delete` outputs to the parent, which
 * owns data loading and all HTTP work.
 */
@Component({
  selector: 'app-screen-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScreenTile],
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

    <!-- Card grid -->
    <div class="screen-grid">
      @for (screen of filteredScreens(); track screen.id) {
        <app-screen-tile
          [screen]="screen"
          [showActions]="true"
          (open)="selectItem.emit(screen)"
          (delete)="remove.emit(screen)"
        />
      }
    </div>
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
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.online {
      background: var(--online);
      box-shadow: 0 0 0 3px var(--online-dim);
    }
    .status-dot.offline {
      background: var(--offline);
      box-shadow: 0 0 0 3px var(--offline-dim);
    }

    /* Screen grid */
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
      gap: var(--gap, 1rem);
    }

    @media (prefers-reduced-motion: reduce) {
      .filter-pill {
        transition: none;
      }
    }
  `,
})
export class ScreenGrid {
  readonly screens = input.required<ScreenListItem[]>();

  readonly selectItem = output<ScreenListItem>();
  readonly remove = output<ScreenListItem>();

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

  protected readonly filteredScreens = computed<ScreenListItem[]>(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.screens();
    return this.screens().filter((s) => (f === 'online' ? s.isOnline : !s.isOnline));
  });

  protected setFilter(value: StatusFilter): void {
    this.activeFilter.set(value);
  }
}
