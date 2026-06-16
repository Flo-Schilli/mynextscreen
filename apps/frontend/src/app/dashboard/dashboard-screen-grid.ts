import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ScreenListItem } from '../screens/screen.model';
import { ScreenTile } from '../screens/screen-tile';

/**
 * Presentational screen-status grid for the dashboard. Renders the shared
 * {@link ScreenTile} (without the delete action) in a compact grid and emits the
 * clicked screen id; the parent owns data loading and navigation.
 */
@Component({
  selector: 'app-dashboard-screen-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScreenTile],
  template: `
    <div class="screen-grid">
      @for (screen of screens(); track screen.id) {
        <app-screen-tile [screen]="screen" (open)="selectScreen.emit(screen.id)" />
      }
    </div>
  `,
  styles: `
    .screen-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 0.625rem;
    }
  `,
})
export class DashboardScreenGrid {
  readonly screens = input.required<ScreenListItem[]>();
  readonly selectScreen = output<string>();
}
