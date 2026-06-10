import { Component, inject, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Content } from './content.model';
import { ContentFormatService } from './content-format.service';

/** Payload emitted when the user saves edited metadata. */
export interface MetadataUpdate {
  title: string;
  description: string;
  tags: string[];
}

/**
 * Content detail view: preview, transcoding status, an editable metadata form
 * (owning its own form state), and the file-info grid. The parent feeds
 * `submitting`/`error`/`saved` flags back in and performs the HTTP work in
 * response to the emitted intents.
 */
@Component({
  selector: 'app-content-detail',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="detail-card wide">
      <div class="detail-header">
        <h2>{{ content().title }}</h2>
        <div class="detail-actions">
          <label class="btn btn-secondary">
            Re-upload
            <input
              type="file"
              accept="image/*,video/*"
              (change)="onReUpload($event)"
              style="display:none"
            />
          </label>
          <button class="btn btn-danger" (click)="remove.emit()">Delete</button>
          <button class="btn btn-secondary" (click)="dismiss.emit()">Close</button>
        </div>
      </div>

      <!-- Preview -->
      <div class="preview-area">
        @if (content().type === 'image') {
          <img [src]="previewUrl()(content())" alt="Preview" class="preview-img" />
        } @else {
          <video [src]="previewUrl()(content())" controls class="preview-video"></video>
        }
      </div>

      <!-- Transcoding Status -->
      <div class="transcoding-status">
        <span class="detail-label">Transcoding</span>
        <span class="status-badge" [attr.data-status]="content().transcodingStatus">
          @if (content().transcodingStatus === 'processing') {
            Processing {{ transcodingProgress()[content().id] ?? 0 }}%
          } @else {
            {{ content().transcodingStatus }}
          }
        </span>
        @if (content().transcodingStatus === 'processing') {
          <div class="progress-bar transcoding-bar">
            <div
              class="progress-fill processing"
              [style.width.%]="transcodingProgress()[content().id] ?? 0"
            ></div>
          </div>
        }
        @if (content().transcodingStatus === 'failed' && content().transcodingError) {
          <p class="error">{{ content().transcodingError }}</p>
        }
      </div>

      <!-- Metadata Editing -->
      <div class="metadata-section">
        <div class="form-group">
          <label for="editTitle">Title</label>
          <input id="editTitle" type="text" [(ngModel)]="editTitle" name="editTitle" />
        </div>
        <div class="form-group">
          <label for="editDescription">Description</label>
          <textarea
            id="editDescription"
            [(ngModel)]="editDescription"
            name="editDescription"
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="editTags">Tags (comma-separated)</label>
          <input id="editTags" type="text" [(ngModel)]="editTagsStr" name="editTags" />
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" (click)="onSave()" [disabled]="savingMetadata()">
            {{ savingMetadata() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
        @if (metadataError()) {
          <p class="error">{{ metadataError() }}</p>
        }
        @if (metadataSaved()) {
          <p class="success">Changes saved.</p>
        }
      </div>

      <!-- File Info -->
      <div class="file-info-grid">
        <div class="detail-item">
          <span class="detail-label">Type</span>
          <span>{{ content().type }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Original File</span>
          <span>{{ content().originalFilename }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Original Size</span>
          <span>{{ format.formatBytes(content().originalSizeBytes) }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Transcoded Size</span>
          <span>{{
            content().transcodedSizeBytes !== null
              ? format.formatBytes(content().transcodedSizeBytes!)
              : '—'
          }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">MIME Type</span>
          <span>{{ content().originalMimeType }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Uploaded</span>
          <span>{{ format.formatDate(content().createdAt) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    /* Detail Card */
    .detail-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 52rem;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .detail-card.wide {
      max-width: 52rem;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .detail-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .detail-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* Preview */
    .preview-area {
      margin-bottom: 1.5rem;
      background: #000;
      border-radius: 0.375rem;
      overflow: hidden;
      max-height: 28rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-img {
      max-width: 100%;
      max-height: 28rem;
      object-fit: contain;
    }
    .preview-video {
      max-width: 100%;
      max-height: 28rem;
    }

    /* Transcoding Status */
    .transcoding-status {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .status-badge[data-status='completed'] {
      background: #22c55e20;
      color: #22c55e;
    }
    .status-badge[data-status='pending'] {
      background: #f59e0b20;
      color: #f59e0b;
    }
    .status-badge[data-status='processing'] {
      background: #f59e0b20;
      color: #f59e0b;
    }
    .status-badge[data-status='failed'] {
      background: #ef444420;
      color: #ef4444;
    }

    /* Progress Bar (transcoding) */
    .progress-bar {
      height: 0.375rem;
      background: var(--color-bg-tertiary);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.2s;
    }
    .progress-fill.processing {
      background: #f59e0b;
    }
    .transcoding-bar {
      margin-top: 0.5rem;
    }

    /* Metadata Section */
    .metadata-section {
      border-top: 1px solid var(--color-border);
      padding-top: 1.25rem;
      margin-bottom: 1.25rem;
    }

    /* File Info Grid */
    .file-info-grid {
      border-top: 1px solid var(--color-border);
      padding-top: 1.25rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .detail-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }

    /* Form: textarea styling (not covered by shared input-only rules) */
    .form-group textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      box-sizing: border-box;
      font-family: inherit;
    }
    .form-group textarea:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    .success {
      color: #22c55e;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
  `,
})
export class ContentDetail implements OnInit {
  readonly content = input.required<Content>();
  readonly transcodingProgress = input.required<Record<string, number | undefined>>();
  readonly previewUrl = input.required<(content: Content) => string>();
  readonly savingMetadata = input.required<boolean>();
  readonly metadataError = input.required<string>();
  readonly metadataSaved = input.required<boolean>();

  readonly save = output<MetadataUpdate>();
  readonly remove = output<void>();
  readonly reupload = output<File>();
  readonly dismiss = output<void>();

  protected readonly format = inject(ContentFormatService);

  protected editTitle = '';
  protected editDescription = '';
  protected editTagsStr = '';

  ngOnInit(): void {
    // Seed the editable form once, on open. The parent shows this view via
    // `@if (selectedContent)`, so a fresh content item always recreates the
    // component (re-running ngOnInit). Do NOT re-seed on `content` changes:
    // the parent replaces `selectedContent` in place on save and on
    // transcoding SSE events, and re-seeding there would clobber the user's
    // unsaved edits — matching the original component, which only seeded the
    // fields when a new item was selected.
    const content = this.content();
    this.editTitle = content.title;
    this.editDescription = content.description || '';
    this.editTagsStr = content.tags.join(', ');
  }

  onSave(): void {
    const tags = this.editTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    this.save.emit({
      title: this.editTitle,
      description: this.editDescription,
      tags,
    });
  }

  onReUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    input.value = '';
    this.reupload.emit(file);
  }
}
