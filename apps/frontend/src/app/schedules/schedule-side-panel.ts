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
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-xl, 14px);
      padding: 1rem;
      max-height: calc(100vh - 14rem);
      overflow-y: auto;
      box-shadow: var(--shadow);
    }
    .side-panel h3 {
      margin: 0 0 0.875rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .empty-text {
      font-size: 0.8125rem;
      color: var(--text-faint);
      padding: 0.5rem 0;
    }
    .timeline-item {
      display: flex;
      gap: 0.625rem;
      padding: 0.625rem 0;
      border-bottom: 1px solid var(--border);
    }
    .timeline-item:last-child {
      border-bottom: none;
    }
    .timeline-colour {
      width: 3px;
      border-radius: 2px;
      flex-shrink: 0;
      align-self: stretch;
    }
    .timeline-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }
    .timeline-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timeline-target {
      font-size: 0.6875rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timeline-time {
      font-size: 0.6875rem;
      font-family: var(--mono, ui-monospace, monospace);
      font-weight: 600;
      color: var(--text-faint);
    }
    .group-badge-inline {
      display: inline-block;
      font-size: 0.5625rem;
      font-weight: 800;
      background: var(--accent);
      color: #fff;
      padding: 0 0.2rem;
      border-radius: 3px;
      margin-right: 0.25rem;
      line-height: 1.3;
    }
    .repeat-icon-sm {
      font-size: 0.625rem;
      color: var(--text-faint);
    }
  `,
})
export class ScheduleSidePanel {
  readonly dateLabel = input.required<string>();
  readonly timeline = input.required<DayTimeline[]>();
}
