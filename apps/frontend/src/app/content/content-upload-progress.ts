import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UploadItem } from './content.model';

/**
 * Presentational list of in-progress uploads. The drag & drop target and the
 * "Browse files" trigger now live in the {@link ContentLibrary} container
 * (page-wide drop zone + header button), so this component only renders the
 * per-file progress rows.
 *
 * The `.upload-list` and `.upload-item-status` hooks are load-bearing for specs
 * — keep them when re-skinning.
 */
@Component({
  selector: 'app-content-upload-progress',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (uploads().length > 0) {
      <div class="upload-list">
        @for (item of uploads(); track item.file.name) {
          <div class="upload-item">
            <div class="upload-item-info">
              <span class="upload-item-name">{{ item.file.name }}</span>
              <span class="upload-item-status" [class.error]="item.status === 'error'">
                @if (item.status === 'uploading') {
                  {{ item.progress }}%
                } @else if (item.status === 'done') {
                  Done
                } @else {
                  {{ item.error || 'Error' }}
                }
              </span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                [class.error]="item.status === 'error'"
                [class.done]="item.status === 'done'"
                [style.width.%]="item.progress"
              ></div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    /* Upload Progress List */
    .upload-list {
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .upload-item {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 0.625rem;
      padding: 0.75rem 1rem;
    }
    .upload-item-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }
    .upload-item-name {
      font-size: 0.8125rem;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 70%;
    }
    .upload-item-status {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .upload-item-status.error {
      color: var(--color-offline);
    }

    /* Progress Bar */
    .progress-bar {
      height: 0.375rem;
      background: var(--surface-3);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 9999px;
      transition: width 0.2s;
    }
    .progress-fill.done {
      background: var(--color-online);
    }
    .progress-fill.error {
      background: var(--color-offline);
    }

    @media (prefers-reduced-motion: reduce) {
      .progress-fill {
        transition: none;
      }
    }
  `,
})
export class ContentUploadProgress {
  readonly uploads = input.required<UploadItem[]>();
}
