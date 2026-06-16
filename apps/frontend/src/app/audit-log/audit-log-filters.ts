import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AUDIT_ACTION_LABELS } from './audit-log.model';
import { Membership } from '../settings/users/member.model';
import { IconComponent } from '../ui';

/**
 * Presentational audit-log filter bar. Owns the action/user/resource/date
 * filter values via two-way `model`s; emits `apply` whenever a value changes and
 * `clear` to reset. The parent reads the models when building the request.
 */
@Component({
  selector: 'app-audit-log-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TitleCasePipe, FormsModule, IconComponent],
  template: `
    <!-- search row -->
    <div class="relative mb-4">
      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 flex text-faint pointer-events-none">
        <mns-icon name="Search" [size]="17" />
      </span>
      <input
        type="search"
        placeholder="Search resources, people, details…"
        class="w-full pl-10 pr-4 py-[11px] rounded-[10px] text-sm bg-surface-2 border border-border-strong text-text placeholder:text-faint focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms]"
        [ngModel]="searchQuery()"
        (ngModelChange)="searchQuery.set($event)"
      />
      @if (hasActiveFilters()) {
        <button
          class="clear-btn absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-xs font-semibold text-muted hover:text-text transition-colors duration-[150ms]"
          (click)="clear.emit()"
          type="button"
        >
          <span class="flex rotate-45">
            <mns-icon name="Plus" [size]="13" />
          </span>
          Reset
        </button>
      }
    </div>

    <!-- filter controls -->
    <div class="flex flex-wrap gap-4 items-end">
      <!-- action -->
      <div class="filter-group flex flex-col gap-1.5">
        <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
          Action
        </span>
        <div class="relative">
          <select
            id="filterAction"
            [(ngModel)]="action"
            (ngModelChange)="apply.emit()"
            class="appearance-none w-[210px] pl-3 pr-8 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] cursor-pointer"
          >
            <option value="">All actions</option>
            @for (a of auditActions(); track a) {
              <option [value]="a">{{ actionLabel(a) }}</option>
            }
          </select>
          <span
            class="absolute right-2.5 top-1/2 -translate-y-1/2 flex text-faint pointer-events-none rotate-90"
          >
            <mns-icon name="Chevron" [size]="14" />
          </span>
        </div>
      </div>

      <!-- user -->
      <div class="filter-group flex flex-col gap-1.5">
        <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
          User
        </span>
        <div class="relative">
          <select
            id="filterUser"
            [(ngModel)]="userId"
            (ngModelChange)="apply.emit()"
            class="appearance-none w-[185px] pl-3 pr-8 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] cursor-pointer"
          >
            <option value="">All users</option>
            @for (member of members(); track member.userId) {
              <option [value]="member.userId">{{ member.user.name || member.user.email }}</option>
            }
          </select>
          <span
            class="absolute right-2.5 top-1/2 -translate-y-1/2 flex text-faint pointer-events-none rotate-90"
          >
            <mns-icon name="Chevron" [size]="14" />
          </span>
        </div>
      </div>

      <!-- resource type -->
      <div class="filter-group flex flex-col gap-1.5">
        <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
          Resource type
        </span>
        <div class="relative">
          <select
            id="filterResource"
            [(ngModel)]="resourceType"
            (ngModelChange)="apply.emit()"
            class="appearance-none w-[175px] pl-3 pr-8 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] cursor-pointer"
          >
            <option value="">All types</option>
            @for (type of resourceTypes(); track type) {
              <option [value]="type">{{ type | titlecase }}</option>
            }
          </select>
          <span
            class="absolute right-2.5 top-1/2 -translate-y-1/2 flex text-faint pointer-events-none rotate-90"
          >
            <mns-icon name="Chevron" [size]="14" />
          </span>
        </div>
      </div>

      <!-- from date -->
      <div class="filter-group flex flex-col gap-1.5">
        <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
          From
        </span>
        <input
          id="filterFrom"
          type="date"
          [(ngModel)]="from"
          (ngModelChange)="apply.emit()"
          class="w-[150px] px-3 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] [color-scheme:inherit]"
        />
      </div>

      <!-- to date -->
      <div class="filter-group flex flex-col gap-1.5">
        <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
          To
        </span>
        <input
          id="filterTo"
          type="date"
          [(ngModel)]="to"
          (ngModelChange)="apply.emit()"
          class="w-[150px] px-3 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] [color-scheme:inherit]"
        />
      </div>
    </div>
  `,
  styles: `
    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
      }
    }
    /* keep the select option text legible in both themes */
    select option {
      background: var(--surface);
      color: var(--text);
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
  /** Local search query — parent may wire this to its own filter logic. */
  readonly searchQuery = model('');

  readonly apply = output<void>();
  readonly clear = output<void>();

  protected actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }

  protected hasActiveFilters(): boolean {
    return !!(
      this.action() ||
      this.userId() ||
      this.resourceType() ||
      this.from() ||
      this.to() ||
      this.searchQuery()
    );
  }
}
