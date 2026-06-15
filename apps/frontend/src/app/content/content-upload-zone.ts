import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { UploadItem } from './content.model';

/**
 * Presentational upload area: drag & drop zone, browse button, and the list of
 * in-progress uploads. Emits the picked files; the parent owns the actual
 * upload requests and the {@link UploadItem} progress state.
 *
 * The `.upload-zone`, `.drag-over`, `.upload-list` and `.upload-item-status`
 * hooks are load-bearing for specs — keep them when re-skinning.
 */
@Component({
  selector: 'app-content-upload-zone',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="upload-zone"
      [class.drag-over]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="upload-content">
        <p class="upload-text">Drag &amp; drop files here</p>
        <p class="upload-sub">or</p>
        <label class="upload-btn">
          Browse files
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            (change)="onFileSelect($event)"
            style="display:none"
          />
        </label>
      </div>
    </div>

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
    /* Upload Zone */
    .upload-zone {
      border: 2px dashed var(--border-strong);
      border-radius: 0.75rem;
      padding: 2rem;
      text-align: center;
      margin-bottom: 1.25rem;
      background: var(--surface-2);
      transition:
        border-color 0.18s,
        background-color 0.18s;
      cursor: pointer;
    }
    .upload-zone.drag-over {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .upload-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      margin: 0 0 0.25rem;
    }
    .upload-sub {
      font-size: 0.75rem;
      color: var(--text-faint);
      margin: 0 0 0.75rem;
    }
    .upload-btn {
      display: inline-block;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 0.625rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 8px 20px -10px var(--accent-ring);
      transition: filter 0.15s;
    }
    .upload-btn:hover {
      filter: brightness(1.06);
    }

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
      .upload-zone,
      .upload-btn,
      .progress-fill {
        transition: none;
      }
    }
  `,
})
export class ContentUploadZone {
  readonly uploads = input.required<UploadItem[]>();
  readonly filesSelected = output<File[]>();

  protected readonly isDragOver = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files) {
      this.filesSelected.emit(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.filesSelected.emit(Array.from(input.files));
      input.value = '';
    }
  }
}
