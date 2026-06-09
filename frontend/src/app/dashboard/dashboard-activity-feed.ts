import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivityEntry } from './dashboard.model';

/**
 * Presentational recent-activity feed for the dashboard. Renders the parent's
 * rolling list of SSE-derived activity entries with a category-coloured dot and
 * timestamp.
 */
@Component({
  selector: 'app-dashboard-activity-feed',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="activity-feed">
      @for (entry of entries(); track entry.timestamp) {
        <div class="activity-item">
          <span class="activity-dot" [class]="'activity-dot--' + entry.category"></span>
          <span class="activity-time">{{ entry.timestamp | date: 'HH:mm:ss' }}</span>
          <span class="activity-text">{{ entry.description }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 320px;
      overflow-y: auto;
    }
    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    .activity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .activity-dot--screen {
      background: #22c55e;
    }
    .activity-dot--schedule {
      background: #3b82f6;
    }
    .activity-dot--transcoding {
      background: #8b5cf6;
    }
    .activity-dot--info {
      background: #6b7280;
    }
    .activity-time {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      min-width: 56px;
      font-variant-numeric: tabular-nums;
    }
    .activity-text {
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class DashboardActivityFeed {
  readonly entries = input.required<ActivityEntry[]>();
}
