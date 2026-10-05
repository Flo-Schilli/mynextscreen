import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ActivityEntry } from './dashboard.model';
import { IconComponent, IconName } from '../ui';
import { LocaleDatePipe } from '../i18n/locale-format.pipes';

const CATEGORY_ICON: Record<ActivityEntry['category'], IconName> = {
  screen: 'Screens',
  schedule: 'Schedules',
  transcoding: 'Video',
  info: 'Bell',
};

const CATEGORY_BG: Record<ActivityEntry['category'], string> = {
  screen: 'var(--online-dim)',
  schedule: 'var(--accent-soft)',
  transcoding: 'var(--info-dim)',
  info: 'var(--surface-3)',
};

const CATEGORY_COLOR: Record<ActivityEntry['category'], string> = {
  screen: 'var(--color-online)',
  schedule: 'var(--accent)',
  transcoding: 'var(--color-info)',
  info: 'var(--text-muted)',
};

/**
 * Presentational recent-activity feed for the dashboard. Renders the parent's
 * rolling list of SSE-derived activity entries with a category-coloured icon
 * tile and timestamp.
 */
@Component({
  selector: 'app-dashboard-activity-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocaleDatePipe, IconComponent],
  template: `
    <div class="activity-feed">
      @for (entry of entries(); track entry.timestamp; let last = $last) {
        <div class="activity-item">
          <!-- icon column -->
          <div class="activity-icon-col">
            <span
              class="activity-dot"
              [class]="'activity-dot--' + entry.category"
              [style.background]="bg(entry.category)"
              [style.color]="color(entry.category)"
            >
              <mns-icon [name]="icon(entry.category)" [size]="14" />
            </span>
            @if (!last) {
              <span class="activity-connector"></span>
            }
          </div>
          <!-- text column -->
          <div class="activity-body">
            <span class="activity-text">{{ entry.description }}</span>
            <span class="activity-time">{{ entry.timestamp | localeDate: 'HH:mm:ss' }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .activity-feed {
      display: flex;
      flex-direction: column;
      max-height: 360px;
      overflow-y: auto;
    }
    .activity-item {
      display: flex;
      gap: 14px;
    }
    .activity-icon-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }
    .activity-dot {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      flex-shrink: 0;
    }
    .activity-connector {
      flex: 1;
      width: 2px;
      background: var(--border);
      margin: 6px 0;
      border-radius: 99px;
      min-height: 12px;
    }
    .activity-body {
      padding-top: 6px;
      padding-bottom: 18px;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .activity-text {
      font-size: 0.84375rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
    }
    .activity-time {
      font-size: 0.75rem;
      color: var(--text-faint);
      font-variant-numeric: tabular-nums;
    }

    @media (prefers-reduced-motion: reduce) {
      .activity-dot {
        animation: none !important;
      }
    }
  `,
})
export class DashboardActivityFeed {
  readonly entries = input.required<ActivityEntry[]>();

  icon(category: ActivityEntry['category']): IconName {
    return CATEGORY_ICON[category];
  }

  bg(category: ActivityEntry['category']): string {
    return CATEGORY_BG[category];
  }

  color(category: ActivityEntry['category']): string {
    return CATEGORY_COLOR[category];
  }
}
