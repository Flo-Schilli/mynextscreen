import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { InstanceAuditLogService, InstanceAuditLogFilters } from './instance-audit-log.service';
import { AdminUserService } from '../users/admin-user.service';
import { OrganisationService } from '../organisations/organisation.service';
import {
  AuditEntry,
  AUDIT_ACTION_LABELS,
  INSTANCE_AUDIT_ACTIONS,
  INSTANCE_RESOURCE_TYPES,
} from '../../audit-log/audit-log.model';
import { AuditLogTable } from '../../audit-log/audit-log-table';
import {
  BtnComponent,
  IconComponent,
  EmptyComponent,
  SFieldComponent,
  SInputComponent,
  SelectComponent,
  SelectOption,
} from '../../ui';

interface UserOption {
  userId: string;
  label: string;
}

const titleCase = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Smart container for the instance-wide (super-admin) audit log. Spans every
 * organisation plus instance-level events (registrations, account changes, email
 * dispatch). Owns data loading + pagination and the filter state; resolves user
 * and organisation display names so the reused audit-log table can render an
 * Organisation column. Presentation of rows is delegated to {@link AuditLogTable}.
 */
@Component({
  selector: 'app-instance-audit-log',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    AuditLogTable,
    BtnComponent,
    IconComponent,
    EmptyComponent,
    SFieldComponent,
    SInputComponent,
    SelectComponent,
  ],
  template: `
    <div class="page">
      <!-- amber page header -->
      <div class="flex items-end justify-between gap-4 flex-wrap mb-[22px]">
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center gap-[13px] min-w-0">
            <span
              class="grid place-items-center w-11 h-11 rounded-[12px] flex-shrink-0 text-white"
              style="background:linear-gradient(135deg,var(--color-elevated),var(--color-elevated-2));box-shadow:0 8px 20px -10px var(--color-elevated)"
            >
              <mns-icon name="Audit" [size]="23" />
            </span>
            <div class="min-w-0">
              <h1 class="m-0 text-[27px] font-extrabold tracking-[-0.025em]">Instance Admin</h1>
              <div class="text-muted text-[14px] mt-[3px]">Audit Log</div>
            </div>
          </div>
        </div>
        <mns-btn variant="outline" size="md" icon="Download" (click)="exportCsv()"
          >Export CSV</mns-btn
        >
      </div>

      <!-- tab bar -->
      <div class="flex gap-1 border-b border-border mb-[var(--gap)] overflow-x-auto">
        @for (tab of tabs; track tab.route) {
          <a
            [routerLink]="tab.route"
            class="flex items-center gap-2 px-[14px] py-3 -mb-px text-[14px] font-semibold whitespace-nowrap border-b-2 border-transparent text-muted hover:text-default transition-colors no-underline"
            routerLinkActive="border-accent text-default"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <mns-icon [name]="tab.icon" [size]="16" />
            {{ tab.label }}
          </a>
        }
      </div>

      <div
        class="flex flex-wrap items-end gap-4 mb-6 p-4 bg-surface border border-border rounded-lg"
      >
        <div class="min-w-[10rem]">
          <mns-sfield label="Organisation">
            <mns-select
              [options]="orgSelectOptions()"
              [(value)]="filterOrg"
              (changed)="applyFilters()"
            />
          </mns-sfield>
        </div>

        <div class="min-w-[10rem]">
          <mns-sfield label="Action">
            <mns-select
              [options]="actionSelectOptions()"
              [(value)]="filterAction"
              (changed)="applyFilters()"
            />
          </mns-sfield>
        </div>

        <div class="min-w-[10rem]">
          <mns-sfield label="User">
            <mns-select
              [options]="userSelectOptions()"
              [(value)]="filterUserId"
              (changed)="applyFilters()"
            />
          </mns-sfield>
        </div>

        <div class="min-w-[10rem]">
          <mns-sfield label="Resource Type">
            <mns-select
              [options]="resourceSelectOptions()"
              [(value)]="filterResourceType"
              (changed)="applyFilters()"
            />
          </mns-sfield>
        </div>

        <div class="min-w-[9rem]">
          <mns-sfield label="From">
            <mns-sinput type="date" [(value)]="filterFrom" (valueChange)="applyFilters()" />
          </mns-sfield>
        </div>

        <div class="min-w-[9rem]">
          <mns-sfield label="To">
            <mns-sinput type="date" [(value)]="filterTo" (valueChange)="applyFilters()" />
          </mns-sfield>
        </div>

        @if (hasActiveFilters()) {
          <mns-btn variant="ghost" size="sm" (mnsClick)="clearFilters()">Clear filters</mns-btn>
        }
      </div>

      @if (loadError) {
        <p class="text-offline text-sm">{{ loadError }}</p>
      }

      @if (loading && entries.length === 0) {
        <p class="text-muted text-sm">Loading audit log…</p>
      }

      @if (!loading && entries.length === 0 && !loadError) {
        <mns-empty
          icon="Audit"
          title="No audit log entries found"
          desc="Instance-wide activity across every organisation will show up here."
        />
      }

      @if (entries.length > 0) {
        <app-audit-log-table
          [entries]="entries"
          [total]="total"
          [loading]="loading"
          [hasMore]="hasMore"
          [userMap]="userMap"
          [orgMap]="orgMap"
          [showOrganisation]="true"
          (loadMore)="loadMore()"
          (selectResource)="navigateToResource($event.resourceType)"
        />
      }
    </div>
  `,
  styles: ``,
})
export class InstanceAuditLog implements OnInit {
  private auditLogService = inject(InstanceAuditLogService);
  private userService = inject(AdminUserService);
  private orgService = inject(OrganisationService);
  private router = inject(Router);

  readonly tabs = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'Dashboard' as const },
    { label: 'Organisations', route: '/admin/organisations', icon: 'Building' as const },
    { label: 'Users', route: '/admin/users', icon: 'User' as const },
    { label: 'Audit Log', route: '/admin/audit-log', icon: 'Audit' as const },
  ];

  exportCsv(): void {
    // Placeholder — backend CSV export endpoint wired when available
  }

  readonly auditActions = INSTANCE_AUDIT_ACTIONS;
  readonly resourceTypes = INSTANCE_RESOURCE_TYPES;

  entries: AuditEntry[] = [];
  total = 0;
  loading = true;
  loadError = '';

  readonly orgOptions = signal<{ id: string; name: string }[]>([]);
  readonly userOptions = signal<UserOption[]>([]);
  readonly userMap = new Map<string, string>();
  readonly orgMap = new Map<string, string>();

  // Filter state. Empty filterOrg = all orgs (instance-level events included,
  // shown as "Instance" in the org column).
  readonly filterOrg = signal('');
  readonly filterAction = signal('');
  readonly filterUserId = signal('');
  readonly filterResourceType = signal('');
  readonly filterFrom = signal('');
  readonly filterTo = signal('');

  // ── Select options for the filter bar (mns-select) ──
  readonly orgSelectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All organisations' },
    ...this.orgOptions().map((o) => ({ value: o.id, label: o.name })),
  ]);
  readonly actionSelectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All actions' },
    ...this.auditActions.map((a) => ({ value: a, label: this.actionLabel(a) })),
  ]);
  readonly userSelectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All users' },
    ...this.userOptions().map((u) => ({ value: u.userId, label: u.label })),
  ]);
  readonly resourceSelectOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'All types' },
    ...this.resourceTypes.map((t) => ({ value: t, label: titleCase(t) })),
  ]);

  private readonly pageSize = 50;

  get hasMore(): boolean {
    return this.entries.length < this.total;
  }

  ngOnInit(): void {
    this.loadOrganisations();
    this.loadUsers();
    this.loadEntries();
  }

  private loadOrganisations(): void {
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        this.orgOptions.set(orgs.map((o) => ({ id: o.id, name: o.name })));
        for (const o of orgs) {
          this.orgMap.set(o.id, o.name);
        }
      },
    });
  }

  private loadUsers(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.userOptions.set(users.map((u) => ({ userId: u.id, label: u.name || u.email })));
        for (const u of users) {
          this.userMap.set(u.id, u.name || u.email);
        }
      },
    });
  }

  private buildFilters(offset = 0): InstanceAuditLogFilters {
    const filters: InstanceAuditLogFilters = {
      limit: this.pageSize,
      offset,
    };
    if (this.filterOrg()) {
      filters.organisationId = this.filterOrg();
    }
    if (this.filterAction()) filters.action = this.filterAction();
    if (this.filterUserId()) filters.userId = this.filterUserId();
    if (this.filterResourceType()) filters.resourceType = this.filterResourceType();
    if (this.filterFrom()) filters.from = new Date(this.filterFrom()).toISOString();
    if (this.filterTo()) {
      const to = new Date(this.filterTo());
      to.setHours(23, 59, 59, 999);
      filters.to = to.toISOString();
    }
    return filters;
  }

  private loadEntries(): void {
    this.loading = true;
    this.loadError = '';

    this.auditLogService.getAuditLog(this.buildFilters(0)).subscribe({
      next: (response) => {
        this.entries = response.data;
        this.total = response.total;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? 'Access denied. Instance Admin privileges required.'
            : 'Failed to load audit log.';
        this.loading = false;
      },
    });
  }

  loadMore(): void {
    this.loading = true;
    this.auditLogService.getAuditLog(this.buildFilters(this.entries.length)).subscribe({
      next: (response) => {
        this.entries = [...this.entries, ...response.data];
        this.total = response.total;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Failed to load more entries.';
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.entries = [];
    this.total = 0;
    this.loadEntries();
  }

  clearFilters(): void {
    this.filterOrg.set('');
    this.filterAction.set('');
    this.filterUserId.set('');
    this.filterResourceType.set('');
    this.filterFrom.set('');
    this.filterTo.set('');
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filterOrg() ||
      this.filterAction() ||
      this.filterUserId() ||
      this.filterResourceType() ||
      this.filterFrom() ||
      this.filterTo()
    );
  }

  navigateToResource(resourceType: string): void {
    const routeMap: Record<string, string> = {
      account: '/admin/users',
      organisation: '/admin/organisations',
    };
    const route = routeMap[resourceType];
    if (route) {
      this.router.navigate([route]);
    }
  }

  protected actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }
}
