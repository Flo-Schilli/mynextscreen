import { Component, input, output } from '@angular/core';
import { Screen } from '../screens/screen.model';

/**
 * Presentational screen-status grid for the dashboard. Renders one tile per
 * screen with an online/offline/never-seen status dot and emits the clicked
 * screen id; the parent owns data loading and navigation.
 */
@Component({
  selector: 'app-dashboard-screen-grid',
  standalone: true,
  template: `
    <div class="screen-grid">
      @for (screen of screens(); track screen.id) {
        <button
          class="screen-tile"
          [class.online]="screen.isOnline"
          [class.offline]="!screen.isOnline && screen.lastHeartbeat"
          [class.never]="!screen.isOnline && !screen.lastHeartbeat"
          (click)="selectScreen.emit(screen.id)"
        >
          <span class="screen-dot"></span>
          <span class="screen-name">{{ screen.name }}</span>
          <span class="screen-location">{{ screen.location || 'No location' }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.625rem;
    }
    .screen-tile {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--color-border);
      background: var(--color-bg-tertiary);
      cursor: pointer;
      text-align: left;
      color: var(--color-text-primary);
      transition:
        border-color 0.15s,
        transform 0.1s;
    }
    .screen-tile:hover {
      border-color: var(--color-accent);
      transform: translateY(-1px);
    }
    .screen-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-bottom: 0.25rem;
    }
    .screen-tile.online .screen-dot {
      background: #22c55e;
    }
    .screen-tile.offline .screen-dot {
      background: #ef4444;
    }
    .screen-tile.never .screen-dot {
      background: #6b7280;
    }
    .screen-name {
      font-size: 0.8125rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .screen-location {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class DashboardScreenGrid {
  readonly screens = input.required<Screen[]>();
  readonly selectScreen = output<string>();
}
