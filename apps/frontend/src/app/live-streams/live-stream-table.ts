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
