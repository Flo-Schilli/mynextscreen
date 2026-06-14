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
      <!-- Target selector — id="targetSelect" preserved for specs -->
      <div class="target-selector">
        <label for="targetSelect" class="text-sm font-semibold text-muted">Target</label>
        <select
          id="targetSelect"
          class="sel"
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

      <!-- View-mode segmented control -->
      <div class="view-seg">
        @for (v of viewOptions; track v.value) {
          <button
            class="seg-btn"
            [class.active]="viewMode() === v.value"
            (click)="viewChange.emit(v.value)"
          >
            {{ v.label }}
          </button>
        }
      </div>

      <!-- Navigation -->
      <div class="nav-buttons">
        <button class="nav-btn" title="Previous" (click)="prev.emit()">&#8592;</button>
        <button class="nav-btn today-btn" (click)="today.emit()">Today</button>
        <button class="nav-btn" title="Next" (click)="next.emit()">&#8594;</button>
        <span class="current-range">{{ currentRangeLabel() }}</span>
      </div>

      <button class="create-btn" (click)="create.emit()">+ Schedule</button>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .target-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .sel {
      padding: 0.5rem 0.75rem;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      border-radius: var(--r-md, 8px);
      color: var(--text);
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
    }
    .sel:focus {
      border-color: var(--accent);
    }
    .view-seg {
      display: flex;
      padding: 3px;
      border-radius: var(--r-lg, 11px);
      background: var(--surface-2);
      border: 1px solid var(--border);
      gap: 2px;
    }
    .seg-btn {
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s,
        box-shadow 0.15s;
    }
    .seg-btn:hover {
      color: var(--text);
    }
    .seg-btn.active {
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow);
    }
    .nav-buttons {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .nav-btn {
      display: grid;
      place-items: center;
      padding: 0.375rem 0.625rem;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s;
    }
    .nav-btn:hover {
      background: var(--surface-3);
      color: var(--text);
    }
    .today-btn {
      padding: 0.375rem 0.875rem;
    }
    .current-range {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      min-width: 10rem;
      margin-left: 0.25rem;
    }
    .create-btn {
      margin-left: auto;
      padding: 0.5rem 1rem;
      border-radius: var(--r-lg, 10px);
      border: none;
      background: var(--accent);
      color: #fff;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .create-btn:hover {
      opacity: 0.88;
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

  readonly viewOptions: { value: ScheduleViewMode; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];
}
