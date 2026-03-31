import { Component, inject, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuditLogService } from './audit-log.service';
import { MemberService } from '../settings/users/member.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import {
  AuditEntry,
  AuditLogFilters,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  RESOURCE_TYPES,
} from './audit-log.model';
import { Membership } from '../settings/users/member.model';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Audit Log</h1>
      </header>

      @if (!isOrgAdmin) {
        <p class="error">Access denied. Org Admin privileges required.</p>
      } @else {
        <!-- Filter bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <label for="filterAction">Action</label>
            <select id="filterAction" [(ngModel)]="filterAction" (ngModelChange)="applyFilters()">
              <option value="">All actions</option>
              @for (action of auditActions; track action) {
                <option [value]="action">{{ actionLabel(action) }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filterUser">User</label>
            <select id="filterUser" [(ngModel)]="filterUserId" (ngModelChange)="applyFilters()">
              <option value="">All users</option>
              @for (member of members; track member.userId) {
                <option [value]="member.userId">{{ member.user.name || member.user.email }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filterResource">Resource Type</label>
            <select id="filterResource" [(ngModel)]="filterResourceType" (ngModelChange)="applyFilters()">
              <option value="">All types</option>
              @for (type of resourceTypes; track type) {
                <option [value]="type">{{ type | titlecase }}</option>
              }
            </select>
          </div>

          <div class="filter-group">
            <label for="filterFrom">From</label>
            <input id="filterFrom" type="date" [(ngModel)]="filterFrom" (ngModelChange)="applyFilters()" />
          </div>

          <div class="filter-group">
            <label for="filterTo">To</label>
            <input id="filterTo" type="date" [(ngModel)]="filterTo" (ngModelChange)="applyFilters()" />
          </div>

          @if (hasActiveFilters()) {
            <button class="btn btn-secondary btn-small clear-btn" (click)="clearFilters()">Clear filters</button>
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
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource Type</th>
                  <th>Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries; track entry.id) {
                  <tr>
                    <td class="timestamp-cell">{{ entry.timestamp | date:'medium' }}</td>
                    <td>{{ getUserDisplay(entry.userId) }}</td>
                    <td>
                      <span class="action-badge" [attr.data-category]="actionCategory(entry.action)">
                        {{ actionLabel(entry.action) }}
                      </span>
                    </td>
                    <td class="resource-type-cell">{{ entry.resourceType }}</td>
                    <td>
                      @if (entry.resourceId) {
                        <a class="resource-link" (click)="navigateToResource(entry.resourceType, entry.resourceId)" (keydown.enter)="navigateToResource(entry.resourceType, entry.resourceId)" tabindex="0">
                          {{ getResourceDisplay(entry) }}
                        </a>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td class="details-cell">
                      @if (entry.details && hasDetails(entry.details)) {
                        <span class="details-text" [title]="formatDetailsTooltip(entry.details)">
                          {{ formatDetails(entry.details) }}
                        </span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (hasMore) {
            <div class="load-more-container">
              <button class="btn btn-secondary" (click)="loadMore()" [disabled]="loading">
                {{ loading ? 'Loading...' : 'Load more' }}
              </button>
              <span class="count-text">Showing {{ entries.length }} of {{ total }} entries</span>
            </div>
          }
        }
      }
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 2rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }

    /* Filter bar */
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
    .filter-group input[type="date"] {
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

    /* Buttons */
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--color-border);
    }
    .btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-bg-secondary);
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);
    }
    thead {
      background: var(--color-bg-tertiary);
    }
    th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }
    td {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      border-top: 1px solid var(--color-border);
      vertical-align: top;
    }
    tr:hover td {
      background: var(--color-bg-tertiary);
    }
    .timestamp-cell {
      white-space: nowrap;
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
    }
    .resource-type-cell {
      text-transform: capitalize;
    }

    /* Action badges */
    .action-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .action-badge[data-category="content"] {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
    }
    .action-badge[data-category="playlist"] {
      background: rgba(168, 85, 247, 0.15);
      color: #d8b4fe;
    }
    .action-badge[data-category="schedule"] {
      background: rgba(34, 197, 94, 0.15);
      color: #86efac;
    }
    .action-badge[data-category="screen"] {
      background: rgba(234, 179, 8, 0.15);
      color: #fde047;
    }
    .action-badge[data-category="user"] {
      background: rgba(244, 63, 94, 0.15);
      color: #fda4af;
    }
    .action-badge[data-category="organisation"] {
      background: rgba(20, 184, 166, 0.15);
      color: #5eead4;
    }

    /* Resource link */
    .resource-link {
      color: var(--color-accent);
      cursor: pointer;
      text-decoration: none;
      font-size: 0.8125rem;
      font-family: monospace;
    }
    .resource-link:hover {
      text-decoration: underline;
    }

    /* Details */
    .details-cell {
      max-width: 20rem;
    }
    .details-text {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
      max-width: 20rem;
      cursor: help;
    }

    .text-muted {
      color: var(--color-text-muted);
    }

    /* Load more */
    .load-more-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
      justify-content: center;
    }
    .count-text {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text, .empty-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    /* Titlecase pipe polyfill via CSS */
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
  private userMap = new Map<string, string>();

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

  private buildFilters(offset = 0): AuditLogFilters {
    const filters: AuditLogFilters = {
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

    this.auditLogService
      .getAuditLog(org.id, this.buildFilters(this.entries.length))
      .subscribe({
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

  hasActiveFilters(): boolean {
    return !!(
      this.filterAction ||
      this.filterUserId ||
      this.filterResourceType ||
      this.filterFrom ||
      this.filterTo
    );
  }

  actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }

  actionCategory(action: string): string {
    return action.split('.')[0];
  }

  getUserDisplay(userId: string | null): string {
    if (!userId) return 'System';
    return this.userMap.get(userId) ?? userId.substring(0, 8) + '...';
  }

  getResourceDisplay(entry: AuditEntry): string {
    if (!entry.resourceId) return '—';
    const details = entry.details;
    if (details) {
      const name =
        (details['name'] as string) ??
        (details['title'] as string) ??
        (details['filename'] as string) ??
        (details['email'] as string);
      if (name) return name;
    }
    return entry.resourceId.substring(0, 8) + '...';
  }

  hasDetails(details: Record<string, unknown>): boolean {
    return Object.keys(details).length > 0;
  }

  formatDetails(details: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === 'name' || key === 'title' || key === 'filename' || key === 'email') continue;
      parts.push(`${key}: ${value}`);
    }
    return parts.join(', ') || '—';
  }

  formatDetailsTooltip(details: Record<string, unknown>): string {
    return JSON.stringify(details, null, 2);
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
