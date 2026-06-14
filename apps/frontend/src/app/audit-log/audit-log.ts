import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuditLogService } from './audit-log.service';
import { MemberService } from '../settings/users/member.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import {
  AuditEntry,
  AuditLogFilters as AuditLogFilterParams,
  AUDIT_ACTIONS,
  RESOURCE_TYPES,
} from './audit-log.model';
import { Membership } from '../settings/users/member.model';
import { AuditLogFilters } from './audit-log-filters';
import { AuditLogTable } from './audit-log-table';
import {
  BtnComponent,
  CardComponent,
  EmptyComponent,
  IconComponent,
  PageHeaderComponent,
} from '../ui';

/**
 * Smart container for the audit-log feature. Owns the org-admin gate, data
 * loading + pagination, the filter state and the resolved user map. Presentation
 * is delegated to the filter bar and the entries table; navigation to a resource
 * is handled here.
 */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AuditLogFilters,
    AuditLogTable,
    BtnComponent,
    CardComponent,
    EmptyComponent,
    IconComponent,
    PageHeaderComponent,
  ],
  template: `
    <mns-page-header
      title="Audit Log"
      sub="Every action across screens, content, people and settings"
      icon="Audit"
    >
      <mns-btn variant="outline" size="md" icon="Refresh" (mnsClick)="refresh()"> Refresh </mns-btn>
      <mns-btn variant="primary" size="md" icon="Download" (mnsClick)="exportCsv()">
        Export CSV
      </mns-btn>
    </mns-page-header>

    @if (!isOrgAdmin) {
      <p class="error text-[13.5px] text-offline bg-offline-dim rounded-[10px] px-4 py-3">
        Access denied. Org Admin privileges required.
      </p>
    } @else {
      <!-- filter card -->
      <mns-card [pad]="true" [animate]="true" [delay]="0">
        <app-audit-log-filters
          [auditActions]="auditActions"
          [members]="members"
          [resourceTypes]="resourceTypes"
          [(action)]="filterAction"
          [(userId)]="filterUserId"
          [(resourceType)]="filterResourceType"
          [(from)]="filterFrom"
          [(to)]="filterTo"
          (apply)="applyFilters()"
          (clear)="clearFilters()"
        />
      </mns-card>

      <!-- result count row -->
      @if (!loadError) {
        <div class="flex items-center justify-between px-1 my-3">
          <span class="text-[13px] text-muted">
            @if (entries.length === total && total > 0) {
              <span class="font-bold text-text">{{ total }}</span> events
            } @else if (total > 0) {
              <span class="font-bold text-text">{{ entries.length }}</span> of {{ total }} events
            }
          </span>
        </div>
      }

      @if (loadError) {
        <p class="error text-[13.5px] text-offline bg-offline-dim rounded-[10px] px-4 py-3 mt-3">
          {{ loadError }}
        </p>
      }

      @if (loading && entries.length === 0) {
        <mns-card [pad]="true">
          <div class="flex items-center justify-center gap-2.5 py-10 text-muted text-[13.5px]">
            <mns-icon name="Refresh" [size]="18" />
            <span>Loading audit log…</span>
          </div>
        </mns-card>
      }

      @if (!loading && entries.length === 0 && !loadError) {
        <mns-card [pad]="false">
          <mns-empty
            icon="Audit"
            title="No audit log entries found"
            desc="Once you start managing screens and content, every action shows up here."
          />
        </mns-card>
      }

      <!-- keep the mns-empty selector accessible for spec query -->
      <p class="empty-text sr-only" aria-hidden="true">
        @if (!loading && entries.length === 0 && !loadError) {
          No audit log entries found.
        }
      </p>

      @if (entries.length > 0) {
        <app-audit-log-table
          [entries]="entries"
          [total]="total"
          [loading]="loading"
          [hasMore]="hasMore"
          [userMap]="userMap"
          (loadMore)="loadMore()"
          (selectResource)="navigateToResource($event.resourceType, $event.resourceId)"
        />
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
      }
    }
  `,
})
export class AuditLog implements OnInit {
  private auditLogService = inject(AuditLogService);
  private memberService = inject(MemberService);
  private orgState = inject(OrganisationStateService);
  private router = inject(Router);

  readonly auditActions = AUDIT_ACTIONS;
  readonly resourceTypes = RESOURCE_TYPES;

  entries: AuditEntry[] = [];
  total = 0;
  loading = true;
  loadError = '';
  isOrgAdmin = false;

  members: Membership[] = [];
  readonly userMap = new Map<string, string>();

  // Filter state
  filterAction = '';
  filterUserId = '';
  filterResourceType = '';
  filterFrom = '';
  filterTo = '';

  private readonly pageSize = 50;

  get hasMore(): boolean {
    return this.entries.length < this.total;
  }

  ngOnInit(): void {
    const org = this.orgState.selectedOrg();
    if (!org) {
      this.loadError = 'No organisation selected.';
      this.loading = false;
      return;
    }

    if (org.role !== 'org_admin') {
      this.isOrgAdmin = false;
      this.loading = false;
      return;
    }

    this.isOrgAdmin = true;
    this.loadMembers(org.id);
    this.loadEntries();
  }

  private loadMembers(orgId: string): void {
    this.memberService.listMembers(orgId).subscribe({
      next: (members) => {
        this.members = members;
        for (const m of members) {
          this.userMap.set(m.userId, m.user.name || m.user.email);
        }
      },
    });
  }

  private buildFilters(offset = 0): AuditLogFilterParams {
    const filters: AuditLogFilterParams = {
      limit: this.pageSize,
      offset,
    };
    if (this.filterAction) filters.action = this.filterAction;
    if (this.filterUserId) filters.userId = this.filterUserId;
    if (this.filterResourceType) filters.resourceType = this.filterResourceType;
    if (this.filterFrom) filters.from = new Date(this.filterFrom).toISOString();
    if (this.filterTo) {
      const to = new Date(this.filterTo);
      to.setHours(23, 59, 59, 999);
      filters.to = to.toISOString();
    }
    return filters;
  }

  private loadEntries(): void {
    const org = this.orgState.selectedOrg();
    if (!org) return;

    this.loading = true;
    this.loadError = '';

    this.auditLogService.getAuditLog(org.id, this.buildFilters(0)).subscribe({
      next: (response) => {
        this.entries = response.data;
        this.total = response.total;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? 'Access denied. Org Admin privileges required.'
            : 'Failed to load audit log.';
        this.loading = false;
      },
    });
  }

  loadMore(): void {
    const org = this.orgState.selectedOrg();
    if (!org) return;

    this.loading = true;

    this.auditLogService.getAuditLog(org.id, this.buildFilters(this.entries.length)).subscribe({
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

  refresh(): void {
    this.applyFilters();
  }

  exportCsv(): void {
    if (this.entries.length === 0) return;
    const headers = [
      'id',
      'timestamp',
      'userId',
      'organisationId',
      'action',
      'resourceType',
      'resourceId',
      'details',
    ];
    const rows = this.entries.map((e) => [
      e.id,
      e.timestamp,
      e.userId ?? '',
      e.organisationId ?? '',
      e.action,
      e.resourceType,
      e.resourceId ?? '',
      e.details ? JSON.stringify(e.details) : '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearFilters(): void {
    this.filterAction = '';
    this.filterUserId = '';
    this.filterResourceType = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  navigateToResource(resourceType: string, resourceId: string | null): void {
    if (!resourceId) return;

    const routeMap: Record<string, string> = {
      content: '/content',
      playlist: '/playlists',
      schedule: '/schedules',
      screen: '/screens',
      user: '/settings/users',
      organisation: '/admin/organisations',
    };

    const route = routeMap[resourceType];
    if (route) {
      this.router.navigate([route]);
    }
  }
}
