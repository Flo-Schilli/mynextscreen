import { Component, input } from '@angular/core';
import { TimelineRow } from './dashboard.model';

/**
 * Presentational 24-hour schedule timeline for the dashboard. Renders the hour
 * axis plus one track per screen/group with positioned playlist blocks; the
 * parent computes the rows/hours from schedule entries.
 */
@Component({
  selector: 'app-dashboard-schedule-timeline',
  standalone: true,
  template: `
    <div class="timeline">
      <div class="timeline-header">
        <span class="timeline-screen-label"></span>
        <div class="timeline-hours">
          @for (hour of hours(); track hour) {
            <span class="timeline-hour">{{ hour }}</span>
          }
        </div>
      </div>
      @for (row of rows(); track row.screenName) {
        <div class="timeline-row">
          <span class="timeline-screen-label" [title]="row.screenName">{{ row.screenName }}</span>
          <div class="timeline-track">
            @for (entry of row.entries; track entry.startPercent) {
              <div
                class="timeline-block"
                [style.left.%]="entry.startPercent"
                [style.width.%]="entry.widthPercent"
                [style.background]="entry.colour"
                [title]="entry.playlistName + ' (' + entry.startTime + ' - ' + entry.endTime + ')'"
              ></div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .timeline {
      overflow-x: auto;
    }
    .timeline-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .timeline-hours {
      flex: 1;
      display: flex;
      justify-content: space-between;
      padding: 0 2px;
    }
    .timeline-hour {
      font-size: 0.625rem;
      color: var(--color-text-muted);
      width: 0;
      text-align: center;
    }
    .timeline-row {
      display: flex;
      align-items: center;
      margin-bottom: 0.375rem;
    }
    .timeline-screen-label {
      width: 90px;
      min-width: 90px;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 0.5rem;
    }
    .timeline-track {
      flex: 1;
      height: 20px;
      background: var(--color-bg-tertiary);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
    }
    .timeline-block {
      position: absolute;
      top: 2px;
      bottom: 2px;
      border-radius: 2px;
      min-width: 2px;
      opacity: 0.85;
    }
  `,
})
export class DashboardScheduleTimeline {
  readonly rows = input.required<TimelineRow[]>();
  readonly hours = input.required<string[]>();
}
