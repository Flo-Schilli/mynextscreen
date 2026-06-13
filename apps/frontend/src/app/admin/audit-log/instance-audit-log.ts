import { Component, inject, OnInit } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

interface UserOption {
  userId: string;
  label: string;
}

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
  imports: [TitleCasePipe, FormsModule, RouterLink, AuditLogTable],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Instance Admin</h1>
        </div>
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link" routerLink="/admin/dashboard">Dashboard</a>
        <a class="settings-nav-link" routerLink="/admin/organisations">Organisations</a>
        <a class="settings-nav-link" routerLink="/admin/users">Users</a>
        <a class="settings-nav-link active">Audit Log</a>
      </nav>

      <div class="filter-bar">
        <div class="filter-group">
          <label for="filterOrg">Organisation</label>
          <select id="filterOrg" [(ngModel)]="filterOrg" (ngModelChange)="applyFilters()">
            <option value="">All organisations</option>
            @for (org of orgOptions; track org.id) {
              <option [value]="org.id">{{ org.name }}</option>
            }
          </select>
        </div>

        <div class="filter-group">
          <label for="filterAction">Action</label>
          <select id="filterAction" [(ngModel)]="filterAction" (ngModelChange)="applyFilters()">
            <option value="">All actions</option>
            @for (a of auditActions; track a) {
              <option [value]="a">{{ actionLabel(a) }}</option>
            }
          </select>
        </div>

        <div class="filter-group">
          <label for="filterUser">User</label>
          <select id="filterUser" [(ngModel)]="filterUserId" (ngModelChange)="applyFilters()">
            <option value="">All users</option>
            @for (u of userOptions; track u.userId) {
              <option [value]="u.userId">{{ u.label }}</option>
            }
          </select>
        </div>

        <div class="filter-group">
          <label for="filterResource">Resource Type</label>
          <select
            id="filterResource"
            [(ngModel)]="filterResourceType"
            (ngModelChange)="applyFilters()"
          >
            <option value="">All types</option>
            @for (type of resourceTypes; track type) {
              <option [value]="type">{{ type | titlecase }}</option>
            }
          </select>
        </div>

        <div class="filter-group">
          <label for="filterFrom">From</label>
          <input
            id="filterFrom"
            type="date"
            [(ngModel)]="filterFrom"
            (ngModelChange)="applyFilters()"
          />
        </div>

        <div class="filter-group">
          <label for="filterTo">To</label>
          <input
            id="filterTo"
            type="date"
            [(ngModel)]="filterTo"
            (ngModelChange)="applyFilters()"
          />
        </div>

        @if (hasActiveFilters()) {
          <button class="btn btn-secondary btn-small clear-btn" (click)="clearFilters()">
            Clear filters
          </button>
        }
      </div>

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
          [orgMap]="orgMap"
          [showOrganisation]="true"
          (loadMore)="loadMore()"
          (selectResource)="navigateToResource($event.resourceType)"
        />
      }
    </div>
  `,
  styles: `
    .settings-nav {
      display: flex;
      gap: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .settings-nav-link {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition:
        color 0.15s,
        border-color 0.15s;
    }
    .settings-nav-link:hover {
      color: var(--color-text-primary);
    }
    .settings-nav-link.active {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent);
      font-weight: 500;
    }

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
export class InstanceAuditLog implements OnInit {
  private auditLogService = inject(InstanceAuditLogService);
  private userService = inject(AdminUserService);
  private orgService = inject(OrganisationService);
  private router = inject(Router);

  readonly auditActions = INSTANCE_AUDIT_ACTIONS;
  readonly resourceTypes = INSTANCE_RESOURCE_TYPES;

  entries: AuditEntry[] = [];
  total = 0;
  loading = true;
  loadError = '';

  orgOptions: { id: string; name: string }[] = [];
  userOptions: UserOption[] = [];
  readonly userMap = new Map<string, string>();
  readonly orgMap = new Map<string, string>();

  // Filter state. Empty filterOrg = all orgs (instance-level events included,
  // shown as "Instance" in the org column).
  filterOrg = '';
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
    this.loadOrganisations();
    this.loadUsers();
    this.loadEntries();
  }

  private loadOrganisations(): void {
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        this.orgOptions = orgs.map((o) => ({ id: o.id, name: o.name }));
        for (const o of orgs) {
          this.orgMap.set(o.id, o.name);
        }
      },
    });
  }

  private loadUsers(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.userOptions = users.map((u) => ({ userId: u.id, label: u.name || u.email }));
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
    if (this.filterOrg) {
      filters.organisationId = this.filterOrg;
    }
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
    this.filterOrg = '';
    this.filterAction = '';
    this.filterUserId = '';
    this.filterResourceType = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filterOrg ||
      this.filterAction ||
      this.filterUserId ||
      this.filterResourceType ||
      this.filterFrom ||
      this.filterTo
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

  goBack(): void {
    this.router.navigate(['/']);
  }

  protected actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }
}
