import { Component, inject, OnInit } from '@angular/core';
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

/**
 * Smart container for the audit-log feature. Owns the org-admin gate, data
 * loading + pagination, the filter state and the resolved user map. Presentation
 * is delegated to the filter bar and the entries table; navigation to a resource
 * is handled here.
 */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [AuditLogFilters, AuditLogTable],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Audit Log</h1>
      </header>

      @if (!isOrgAdmin) {
        <p class="error">Access denied. Org Admin privileges required.</p>
      } @else {
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

        @if (loadError) {
          <p class="error">{{ loadError }}</p>
        }

        @if (loading && entries.length === 0) {
          <p class="loading-text">Loading audit log...</p>
        }

        @if (!loading && entries.length === 0 && !loadError) {
          <p class="empty-text">No audit log entries found.</p>
        }

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
    </div>
  `,
  styles: `
    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
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
