import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditEntry, AUDIT_ACTION_LABELS } from './audit-log.model';

/**
 * Presentational audit-log table with a "load more" footer. Renders each entry
 * with action badge, resolved user/resource display and a details tooltip;
 * emits `loadMore` and `selectResource`. The parent owns data loading and
 * navigation, and feeds the resolved `userMap` in.
 */
@Component({
  selector: 'app-audit-log-table',
  standalone: true,
  imports: [DatePipe],
  template: `
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
          @for (entry of entries(); track entry.id) {
            <tr>
              <td class="timestamp-cell">{{ entry.timestamp | date: 'medium' }}</td>
              <td>{{ getUserDisplay(entry.userId) }}</td>
              <td>
                <span class="action-badge" [attr.data-category]="actionCategory(entry.action)">
                  {{ actionLabel(entry.action) }}
                </span>
              </td>
              <td class="resource-type-cell">{{ entry.resourceType }}</td>
              <td>
                @if (entry.resourceId) {
                  <a
                    class="resource-link"
                    (click)="
                      selectResource.emit({
                        resourceType: entry.resourceType,
                        resourceId: entry.resourceId,
                      })
                    "
                    (keydown.enter)="
                      selectResource.emit({
                        resourceType: entry.resourceType,
                        resourceId: entry.resourceId,
                      })
                    "
                    tabindex="0"
                  >
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

    @if (hasMore()) {
      <div class="load-more-container">
        <button class="btn btn-secondary" (click)="loadMore.emit()" [disabled]="loading()">
          {{ loading() ? 'Loading...' : 'Load more' }}
        </button>
        <span class="count-text">Showing {{ entries().length }} of {{ total() }} entries</span>
      </div>
    }
  `,
  styles: `
    th {
      white-space: nowrap;
    }
    td {
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
    .action-badge[data-category='content'] {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
    }
    .action-badge[data-category='playlist'] {
      background: rgba(168, 85, 247, 0.15);
      color: #d8b4fe;
    }
    .action-badge[data-category='schedule'] {
      background: rgba(34, 197, 94, 0.15);
      color: #86efac;
    }
    .action-badge[data-category='screen'] {
      background: rgba(234, 179, 8, 0.15);
      color: #fde047;
    }
    .action-badge[data-category='user'] {
      background: rgba(244, 63, 94, 0.15);
      color: #fda4af;
    }
    .action-badge[data-category='organisation'] {
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
  `,
})
export class AuditLogTable {
  readonly entries = input.required<AuditEntry[]>();
  readonly total = input.required<number>();
  readonly loading = input.required<boolean>();
  readonly hasMore = input.required<boolean>();
  readonly userMap = input.required<Map<string, string>>();

  readonly loadMore = output<void>();
  readonly selectResource = output<{ resourceType: string; resourceId: string | null }>();

  protected actionLabel(action: string): string {
    return AUDIT_ACTION_LABELS[action] ?? action;
  }

  protected actionCategory(action: string): string {
    return action.split('.')[0];
  }

  protected getUserDisplay(userId: string | null): string {
    if (!userId) return 'System';
    return this.userMap().get(userId) ?? userId.substring(0, 8) + '...';
  }

  protected getResourceDisplay(entry: AuditEntry): string {
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

  protected hasDetails(details: Record<string, unknown>): boolean {
    return Object.keys(details).length > 0;
  }

  protected formatDetails(details: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === 'name' || key === 'title' || key === 'filename' || key === 'email') continue;
      parts.push(`${key}: ${value}`);
    }
    return parts.join(', ') || '—';
  }

  protected formatDetailsTooltip(details: Record<string, unknown>): string {
    return JSON.stringify(details, null, 2);
  }
}
