import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Screen } from '../screens/screen.model';
import { IconComponent } from '../ui';

/**
 * Presentational screen-status grid for the dashboard. Renders one tile per
 * screen with an online/offline/never-seen status dot and emits the clicked
 * screen id; the parent owns data loading and navigation.
 */
@Component({
  selector: 'app-dashboard-screen-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
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
          <span class="screen-location">
            <mns-icon name="MapPin" [size]="11" />
            {{ screen.location || 'No location' }}
          </span>
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
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      cursor: pointer;
      text-align: left;
      color: var(--text);
      transition:
        border-color 0.18s,
        transform 0.1s,
        box-shadow 0.18s;
    }
    .screen-tile:hover {
      border-color: var(--accent);
      transform: translateY(-1px);
      box-shadow: var(--shadow);
    }
    .screen-tile:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .screen-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-bottom: 0.25rem;
      flex-shrink: 0;
    }
    .screen-tile.online .screen-dot {
      background: var(--online);
      box-shadow: 0 0 0 3px var(--online-dim);
    }
    .screen-tile.offline .screen-dot {
      background: var(--offline);
      box-shadow: 0 0 0 3px var(--offline-dim);
    }
    .screen-tile.never .screen-dot {
      background: var(--text-faint);
    }
    .screen-name {
      font-size: 0.8125rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .screen-location {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 0.6875rem;
      color: var(--text-muted);
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
