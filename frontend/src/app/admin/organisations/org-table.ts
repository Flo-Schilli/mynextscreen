import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Organisation } from './organisation.model';

/**
 * Presentational organisations list table. Renders one clickable row per org
 * with time zone, member count, storage limits and created date; emits the
 * selected org. The parent owns data loading.
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
            <th>Original Limit</th>
            <th>Transcoded Limit</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          @for (org of organisations(); track org.id) {
            <tr class="clickable-row" (click)="selectOrg.emit(org)">
              <td>{{ org.name }}</td>
              <td>{{ org.timeZone }}</td>
              <td>{{ memberCounts()[org.id] ?? '...' }}</td>
              <td>{{ formatBytes(org.storageOriginalLimitBytes) }}</td>
              <td>{{ formatBytes(org.storageTranscodedLimitBytes) }}</td>
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
  `,
})
export class OrgTable {
  readonly organisations = input.required<Organisation[]>();
  readonly memberCounts = input.required<Record<string, number>>();

  readonly selectOrg = output<Organisation>();

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
