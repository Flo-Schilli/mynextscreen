import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TargetOption } from './schedule.model';
import { ScheduleViewMode } from './schedule-calendar.service';

/**
 * Presentational toolbar for the schedules view: target selector, view-mode
 * toggle, date navigation, and the create button. Holds no state — emits the
 * user's intent and lets the parent own the data.
 */
@Component({
  selector: 'app-schedule-toolbar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="toolbar">
      <div class="target-selector">
        <label for="targetSelect">Target:</label>
        <select
          id="targetSelect"
          [ngModel]="selectedTargetId()"
          (ngModelChange)="targetChange.emit($event)"
          name="targetSelect"
        >
          @if (screenTargets().length === 0 && groupTargets().length === 0) {
            <option value="" disabled>No screens or groups</option>
          }
          @if (screenTargets().length > 0) {
            <optgroup label="Screens">
              @for (opt of screenTargets(); track opt.id) {
                <option [value]="'screen:' + opt.id">&#9633; {{ opt.name }}</option>
              }
            </optgroup>
          }
          @if (groupTargets().length > 0) {
            <optgroup label="Screen Groups">
              @for (opt of groupTargets(); track opt.id) {
                <option [value]="'group:' + opt.id">&#9638; {{ opt.name }} ({{ opt.mode }})</option>
              }
            </optgroup>
          }
        </select>
      </div>

      <div class="view-buttons">
        <button
          class="toggle-btn"
          [class.active]="viewMode() === 'day'"
          (click)="viewChange.emit('day')"
        >
          Day
        </button>
        <button
          class="toggle-btn"
          [class.active]="viewMode() === 'week'"
          (click)="viewChange.emit('week')"
        >
          Week
        </button>
        <button
          class="toggle-btn"
          [class.active]="viewMode() === 'month'"
          (click)="viewChange.emit('month')"
        >
          Month
        </button>
      </div>

      <div class="nav-buttons">
        <button class="btn btn-secondary btn-sm" (click)="prev.emit()">&#8592;</button>
        <button class="btn btn-secondary btn-sm" (click)="today.emit()">Today</button>
        <button class="btn btn-secondary btn-sm" (click)="next.emit()">&#8594;</button>
        <span class="current-range">{{ currentRangeLabel() }}</span>
      </div>

      <button class="btn btn-primary" (click)="create.emit()">+ Schedule</button>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .target-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .target-selector label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .target-selector select {
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
    }
    .view-buttons {
      display: flex;
      gap: 0.25rem;
    }
    .toggle-btn {
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.8125rem;
      transition: all 0.15s;
    }
    .toggle-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .toggle-btn.active {
      background: var(--color-accent);
      color: #fff;
      border-color: var(--color-accent);
    }
    .nav-buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .current-range {
      font-size: 0.875rem;
      font-weight: 500;
      min-width: 10rem;
    }
    .btn-sm {
      padding: 0.325rem 0.75rem;
      font-size: 0.8125rem;
    }
  `,
})
export class ScheduleToolbar {
  readonly screenTargets = input.required<TargetOption[]>();
  readonly groupTargets = input.required<TargetOption[]>();
  readonly selectedTargetId = input.required<string>();
  readonly viewMode = input.required<ScheduleViewMode>();
  readonly currentRangeLabel = input.required<string>();

  readonly targetChange = output<string>();
  readonly viewChange = output<ScheduleViewMode>();
  readonly prev = output<void>();
  readonly today = output<void>();
  readonly next = output<void>();
  readonly create = output<void>();
}
