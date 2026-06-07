import { Component, input } from '@angular/core';
import { DayTimeline } from './schedule-calendar.service';

/**
 * Presentational side panel listing the schedule entries that occur on the
 * currently selected day.
 */
@Component({
  selector: 'app-schedule-side-panel',
  standalone: true,
  template: `
    <div class="side-panel">
      <h3>{{ dateLabel() }}</h3>
      @if (timeline().length === 0) {
        <p class="empty-text">No schedule entries for this day.</p>
      }
      @for (item of timeline(); track $index) {
        <div class="timeline-item">
          <div class="timeline-colour" [style.background]="item.colour"></div>
          <div class="timeline-info">
            <span class="timeline-name">
              @if (item.isGroup) {
                <span class="group-badge-inline">G</span>
              }
              {{ item.playlistName }}
              @if (item.isRecurring) {
                <span class="repeat-icon-sm">&#8634;</span>
              }
            </span>
            <span class="timeline-target">{{ item.targetName }}</span>
            <span class="timeline-time">{{ item.startTime }} - {{ item.endTime }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .side-panel {
      width: 16rem;
      flex-shrink: 0;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1rem;
      max-height: calc(100vh - 14rem);
      overflow-y: auto;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .side-panel h3 {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .timeline-item {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .timeline-item:last-child {
      border-bottom: none;
    }
    .timeline-colour {
      width: 0.25rem;
      border-radius: 0.125rem;
      flex-shrink: 0;
    }
    .timeline-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }
    .timeline-name {
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timeline-target {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timeline-time {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
    .group-badge-inline {
      display: inline-block;
      font-size: 0.5625rem;
      font-weight: 700;
      background: var(--color-accent);
      color: #fff;
      padding: 0 0.1875rem;
      border-radius: 0.125rem;
      margin-right: 0.25rem;
      line-height: 1.3;
    }
    .repeat-icon-sm {
      font-size: 0.625rem;
      color: var(--color-text-muted);
    }
  `,
})
export class ScheduleSidePanel {
  readonly dateLabel = input.required<string>();
  readonly timeline = input.required<DayTimeline[]>();
}
