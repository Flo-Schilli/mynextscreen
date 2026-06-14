import { Component, input, output } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { LiveStream, TranscodingPreset, TRANSCODING_PRESET_LABELS } from './live-stream.model';

/**
 * Presentational live-streams table: name, source URL, protocol/quality badges,
 * status and health, plus per-row actions. Idle/error rows expose activate/edit/
 * delete; active rows expose deactivate. The parent owns data loading and the
 * handlers; this component only emits the clicked stream.
 */
@Component({
  selector: 'app-live-stream-table',
  standalone: true,
  imports: [UpperCasePipe],
  template: `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Source URL</th>
            <th>Protocol</th>
            <th>Quality</th>
            <th>Status</th>
            <th>Health</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (stream of streams(); track stream.id) {
            <tr>
              <td class="name-cell">{{ stream.name }}</td>
              <td class="url-cell" [title]="stream.sourceUrl">{{ stream.sourceUrl }}</td>
              <td>
                <span class="protocol-badge">{{ stream.protocol | uppercase }}</span>
              </td>
              <td>{{ presetLabel(stream.transcodingPreset) }}</td>
              <td>
                <span
                  class="status-badge"
                  [class.status-idle]="stream.status === 'idle'"
                  [class.status-active]="stream.status === 'active'"
                  [class.status-error]="stream.status === 'error'"
                >
                  {{ stream.status }}
                </span>
              </td>
              <td>
                @if (stream.status === 'active' && stream.health) {
                  <span
                    class="health-badge"
                    [class.health-healthy]="stream.health.health === 'healthy'"
                    [class.health-degraded]="stream.health.health === 'degraded'"
                    [class.health-stopped]="stream.health.health === 'stopped'"
                  >
                    {{ stream.health.health }}
                  </span>
                } @else {
                  <span class="text-muted">-</span>
                }
              </td>
              <td class="actions-cell">
                @if (stream.status === 'idle' || stream.status === 'error') {
                  <button class="btn btn-small btn-primary" (click)="activate.emit(stream)">
                    Activate
                  </button>
                  <button class="btn btn-small btn-secondary" (click)="edit.emit(stream)">
                    Edit
                  </button>
                  <button class="btn btn-small btn-danger" (click)="delete.emit(stream)">
                    Delete
                  </button>
                } @else {
                  <button class="btn btn-small btn-warning" (click)="deactivate.emit(stream)">
                    Deactivate
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .table-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-xl, 14px);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    thead {
      background: var(--surface-2);
      border-bottom: 1px solid var(--border);
    }
    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background 0.12s;
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    tbody tr:hover {
      background: var(--surface-2);
    }
    td {
      padding: 0.875rem 1rem;
      color: var(--text);
      vertical-align: middle;
    }
    .name-cell {
      font-weight: 600;
    }
    .url-cell {
      font-family: var(--mono, ui-monospace, monospace);
      font-size: 0.8125rem;
      color: var(--text-muted);
      max-width: 18rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Badges — class names preserved for specs */
    .protocol-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 99px;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: var(--surface-3);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.7rem;
      border-radius: 99px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .status-idle {
      background: var(--surface-3);
      color: var(--text-faint);
    }
    .status-active {
      background: var(--offline-dim);
      color: var(--offline);
      animation: pulse-border 2s ease-in-out infinite;
    }
    .status-error {
      background: var(--offline-dim);
      color: var(--offline);
    }
    .health-badge {
      display: inline-flex;
      padding: 0.2rem 0.6rem;
      border-radius: 99px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .health-healthy {
      background: var(--online-dim, color-mix(in srgb, var(--online) 15%, transparent));
      color: var(--online);
    }
    .health-degraded {
      background: var(--warn-dim);
      color: var(--warn);
    }
    .health-stopped {
      background: var(--surface-3);
      color: var(--text-faint);
    }
    .text-muted {
      color: var(--text-faint);
      font-size: 0.8125rem;
    }

    /* Actions */
    .actions-cell {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      border: none;
      border-radius: var(--r-md, 8px);
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
      white-space: nowrap;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-small {
      padding: 0.3rem 0.625rem;
      font-size: 0.75rem;
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.88;
    }
    .btn-secondary {
      background: var(--surface-2);
      color: var(--text);
      border: 1px solid var(--border-strong);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--surface-3);
    }
    .btn-danger {
      background: var(--offline);
      color: #fff;
    }
    .btn-danger:hover:not(:disabled) {
      opacity: 0.88;
    }
    .btn-warning {
      background: var(--warn);
      color: #fff;
    }
    .btn-warning:hover:not(:disabled) {
      opacity: 0.88;
    }

    @keyframes pulse-border {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
  `,
})
export class LiveStreamTable {
  readonly streams = input.required<LiveStream[]>();

  readonly activate = output<LiveStream>();
  readonly edit = output<LiveStream>();
  readonly delete = output<LiveStream>();
  readonly deactivate = output<LiveStream>();

  protected presetLabel(preset: TranscodingPreset): string {
    return TRANSCODING_PRESET_LABELS[preset] ?? preset;
  }
}
