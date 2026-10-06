import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Membership } from '../settings/users/member.model';
import { DateInputComponent, IconComponent } from '../ui';

/**
 * Presentational audit-log filter bar. Owns the action/user/resource/date
 * filter values via two-way `model`s; emits `apply` whenever a value changes and
 * `clear` to reset. The parent reads the models when building the request.
 */
@Component({
  selector: 'app-audit-log-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TitleCasePipe, FormsModule, IconComponent, DateInputComponent, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
      <!-- search row -->
      <div class="relative mb-4">
        <span
          class="absolute left-3.5 top-1/2 -translate-y-1/2 flex text-faint pointer-events-none"
        >
          <mns-icon name="Search" [size]="17" />
        </span>
        <input
          type="search"
          [placeholder]="t('auditLog.filters.searchPlaceholder')"
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
            {{ t('auditLog.filters.reset') }}
          </button>
        }
      </div>

      <!-- filter controls -->
      <div class="flex flex-wrap gap-4 items-end">
        <!-- action -->
        <div class="filter-group flex flex-col gap-1.5">
          <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
            {{ t('auditLog.filters.action') }}
          </span>
          <div class="relative">
            <select
              id="filterAction"
              [(ngModel)]="action"
              (ngModelChange)="apply.emit()"
              class="appearance-none w-[210px] pl-3 pr-8 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] cursor-pointer"
            >
              <option value="">{{ t('auditLog.filters.allActions') }}</option>
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
            {{ t('auditLog.filters.user') }}
          </span>
          <div class="relative">
            <select
              id="filterUser"
              [(ngModel)]="userId"
              (ngModelChange)="apply.emit()"
              class="appearance-none w-[185px] pl-3 pr-8 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] cursor-pointer"
            >
              <option value="">{{ t('auditLog.filters.allUsers') }}</option>
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
            {{ t('auditLog.filters.resourceType') }}
          </span>
          <div class="relative">
            <select
              id="filterResource"
              [(ngModel)]="resourceType"
              (ngModelChange)="apply.emit()"
              class="appearance-none w-[175px] pl-3 pr-8 py-[10px] rounded-[10px] text-[13.5px] font-semibold bg-surface-2 border border-border-strong text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft transition-all duration-[180ms] cursor-pointer"
            >
              <option value="">{{ t('auditLog.filters.allTypes') }}</option>
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
            {{ t('auditLog.filters.from') }}
          </span>
          <mns-date-input
            inputId="filterFrom"
            tone="raised"
            class="w-[150px]"
            [(ngModel)]="from"
            (ngModelChange)="apply.emit()"
          />
        </div>

        <!-- to date -->
        <div class="filter-group flex flex-col gap-1.5">
          <span class="field-label text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">
            {{ t('auditLog.filters.to') }}
          </span>
          <mns-date-input
            inputId="filterTo"
            tone="raised"
            class="w-[150px]"
            [(ngModel)]="to"
            (ngModelChange)="apply.emit()"
          />
        </div>
      </div>
    </ng-container>
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

  private readonly transloco = inject(TranslocoService);

  protected actionLabel(action: string): string {
    const key = 'auditLog.actions.' + action;
    const label = this.transloco.translate(key);
    // Transloco echoes the key back when there is no translation; fall back to
    // the raw action id (e.g. a new backend action not yet in the catalogue).
    return label === key ? action : label;
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
