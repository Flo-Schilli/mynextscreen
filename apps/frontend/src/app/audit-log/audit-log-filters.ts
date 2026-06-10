import { Component, input, model, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AUDIT_ACTION_LABELS } from './audit-log.model';
import { Membership } from '../settings/users/member.model';

/**
 * Presentational audit-log filter bar. Owns the action/user/resource/date
 * filter values via two-way `model`s; emits `apply` whenever a value changes and
 * `clear` to reset. The parent reads the models when building the request.
 */
@Component({
  selector: 'app-audit-log-filters',
  standalone: true,
  imports: [TitleCasePipe, FormsModule],
  template: `
    <div class="filter-bar">
      <div class="filter-group">
        <label for="filterAction">Action</label>
        <select id="filterAction" [(ngModel)]="action" (ngModelChange)="apply.emit()">
          <option value="">All actions</option>
          @for (a of auditActions(); track a) {
            <option [value]="a">{{ actionLabel(a) }}</option>
          }
        </select>
      </div>

      <div class="filter-group">
        <label for="filterUser">User</label>
        <select id="filterUser" [(ngModel)]="userId" (ngModelChange)="apply.emit()">
          <option value="">All users</option>
          @for (member of members(); track member.userId) {
            <option [value]="member.userId">{{ member.user.name || member.user.email }}</option>
          }
        </select>
      </div>

      <div class="filter-group">
        <label for="filterResource">Resource Type</label>
        <select id="filterResource" [(ngModel)]="resourceType" (ngModelChange)="apply.emit()">
          <option value="">All types</option>
          @for (type of resourceTypes(); track type) {
            <option [value]="type">{{ type | titlecase }}</option>
          }
        </select>
      </div>

      <div class="filter-group">
        <label for="filterFrom">From</label>
        <input id="filterFrom" type="date" [(ngModel)]="from" (ngModelChange)="apply.emit()" />
      </div>

      <div class="filter-group">
        <label for="filterTo">To</label>
        <input id="filterTo" type="date" [(ngModel)]="to" (ngModelChange)="apply.emit()" />
      </div>

      @if (hasActiveFilters()) {
        <button class="btn btn-secondary btn-small clear-btn" (click)="clear.emit()">
          Clear filters
        </button>
      }
    </div>
  `,
  styles: `
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .filter-group label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    .filter-group select,
    .filter-group input {
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      min-width: 10rem;
    }
    .filter-group input[type='date'] {
      min-width: 9rem;
    }
    .filter-group select:focus,
    .filter-group input:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .clear-btn {
      align-self: flex-end;
    }

    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
      }
      .filter-group select,
      .filter-group input {
        min-width: 100%;
      }
    }
  `,
})
export class AuditLogFilters {
  readonly auditActions = input.required<readonly string[]>();
  readonly members = input.required<Membership[]>();
  readonly resourceTypes = input.required<readonly string[]>();

  readonly action = model('');
  readonly userId = model('');
  readonly resourceType = model('');
  readonly from = model('');
  readonly to = model('');

  readonly apply = output<void>();
  readonly clear = output<void>();

  protected actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }

  protected hasActiveFilters(): boolean {
    return !!(this.action() || this.userId() || this.resourceType() || this.from() || this.to());
  }
}
