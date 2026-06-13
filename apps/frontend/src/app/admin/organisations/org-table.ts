import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Organisation } from './organisation.model';
import { formatBytes } from '../../shared/format-bytes';

/**
 * Presentational organisations list table. Renders one clickable row per org
 * with time zone, member count, original/transcoded storage usage (compact
 * progress bars vs. each limit) and created date; emits the selected org. The
 * parent owns data loading.
 */
@Component({
  selector: 'app-org-table',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Time Zone</th>
            <th>Members</th>
            <th>Original</th>
            <th>Transcoded</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          @for (org of organisations(); track org.id) {
            <tr class="clickable-row" (click)="selectOrg.emit(org)">
              <td>{{ org.name }}</td>
              <td>{{ org.timeZone }}</td>
              <td>{{ memberCounts()[org.id] ?? '...' }}</td>
              <td>
                <div class="usage-cell">
                  <span class="usage-text"
                    >{{ formatBytes(org.storageOriginalUsedBytes) }} /
                    {{ formatBytes(org.storageOriginalLimitBytes) }}</span
                  >
                  <div
                    class="mini-bar"
                    [class.warning]="
                      isWarning(org.storageOriginalUsedBytes, org.storageOriginalLimitBytes)
                    "
                    [class.danger]="
                      isDanger(org.storageOriginalUsedBytes, org.storageOriginalLimitBytes)
                    "
                  >
                    <div
                      class="mini-fill accent"
                      [style.width.%]="
                        percent(org.storageOriginalUsedBytes, org.storageOriginalLimitBytes)
                      "
                    ></div>
                  </div>
                </div>
              </td>
              <td>
                <div class="usage-cell">
                  <span class="usage-text"
                    >{{ formatBytes(org.storageTranscodedUsedBytes) }} /
                    {{ formatBytes(org.storageTranscodedLimitBytes) }}</span
                  >
                  <div
                    class="mini-bar"
                    [class.warning]="
                      isWarning(org.storageTranscodedUsedBytes, org.storageTranscodedLimitBytes)
                    "
                    [class.danger]="
                      isDanger(org.storageTranscodedUsedBytes, org.storageTranscodedLimitBytes)
                    "
                  >
                    <div
                      class="mini-fill purple"
                      [style.width.%]="
                        percent(org.storageTranscodedUsedBytes, org.storageTranscodedLimitBytes)
                      "
                    ></div>
                  </div>
                </div>
              </td>
              <td>{{ org.createdAt | date: 'mediumDate' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    tr:hover td {
      background: var(--color-bg-tertiary);
    }
    .clickable-row {
      cursor: pointer;
    }
    .usage-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 9rem;
    }
    .usage-text {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      white-space: nowrap;
    }
    .mini-bar {
      height: 6px;
      background: var(--color-bg-tertiary);
      border-radius: 3px;
      overflow: hidden;
    }
    .mini-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .mini-fill.accent {
      background: var(--color-accent);
    }
    .mini-fill.purple {
      background: #8b5cf6;
    }
    .mini-bar.warning .mini-fill {
      background: #f59e0b;
    }
    .mini-bar.danger .mini-fill {
      background: #ef4444;
    }
  `,
})
export class OrgTable {
  readonly organisations = input.required<Organisation[]>();
  readonly memberCounts = input.required<Record<string, number>>();

  readonly selectOrg = output<Organisation>();

  protected readonly formatBytes = formatBytes;

  protected percent(used: number, limit: number): number {
    if (limit <= 0) return 0;
    return Math.min((used / limit) * 100, 100);
  }

  protected isWarning(used: number, limit: number): boolean {
    const p = this.percent(used, limit);
    return p > 80 && p <= 95;
  }

  protected isDanger(used: number, limit: number): boolean {
    return this.percent(used, limit) > 95;
  }
}
