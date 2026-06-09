import { Component, input, output } from '@angular/core';
import { UploadItem } from './content.model';

/**
 * Presentational upload area: drag & drop zone, browse button, and the list of
 * in-progress uploads. Emits the picked files; the parent owns the actual
 * upload requests and the {@link UploadItem} progress state.
 */
@Component({
  selector: 'app-content-upload-zone',
  standalone: true,
  template: `
    <div
      class="upload-zone"
      [class.drag-over]="isDragOver"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="upload-content">
        <p class="upload-text">Drag & drop files here</p>
        <p class="upload-sub">or</p>
        <label class="btn btn-primary upload-btn">
          Browse Files
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
      border: 2px dashed var(--color-border);
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
      margin-bottom: 1.25rem;
      transition: all 0.15s;
      cursor: pointer;
    }
    .upload-zone.drag-over {
      border-color: var(--color-accent);
      background: rgba(59, 130, 246, 0.05);
    }
    .upload-text {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin: 0 0 0.25rem;
    }
    .upload-sub {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin: 0 0 0.75rem;
    }
    .upload-btn {
      cursor: pointer;
      display: inline-block;
    }

    /* Upload Progress List */
    .upload-list {
      margin-bottom: 1.25rem;
    }
    .upload-item {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
    }
    .upload-item-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }
    .upload-item-name {
      font-size: 0.8125rem;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 70%;
    }
    .upload-item-status {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    .upload-item-status.error {
      color: #ef4444;
    }

    /* Progress Bar */
    .progress-bar {
      height: 0.375rem;
      background: var(--color-bg-tertiary);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-accent);
      border-radius: 9999px;
      transition: width 0.2s;
    }
    .progress-fill.done {
      background: #22c55e;
    }
    .progress-fill.error {
      background: #ef4444;
    }
  `,
})
export class ContentUploadZone {
  readonly uploads = input.required<UploadItem[]>();
  readonly filesSelected = output<File[]>();

  protected isDragOver = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
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
