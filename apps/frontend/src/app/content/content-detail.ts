import { ChangeDetectionStrategy, Component, inject, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Content } from './content.model';
import { ContentFormatService } from './content-format.service';
import { BtnComponent } from '../ui';

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
 *
 * Stable IDs (#editTitle, #editDescription, #editTags) and the "Close" button
 * label are load-bearing for specs — keep them when re-skinning.
 */
@Component({
  selector: 'app-content-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BtnComponent],
  template: `
    <div class="detail-card">
      <div class="detail-header">
        <h2>{{ content().title }}</h2>
        <div class="detail-actions">
          <label class="reupload-btn">
            Re-upload
            <input
              type="file"
              accept="image/*,video/*"
              (change)="onReUpload($event)"
              style="display:none"
            />
          </label>
          <mns-btn variant="outline" size="sm" icon="Copy" (mnsClick)="copyLink.emit()"
            >Copy link</mns-btn
          >
          <mns-btn variant="danger" size="sm" icon="Trash" (mnsClick)="remove.emit()"
            >Delete</mns-btn
          >
          <mns-btn variant="outline" size="sm" (mnsClick)="dismiss.emit()">Close</mns-btn>
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
        <span class="status-pill" [attr.data-status]="content().transcodingStatus">
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
        <div class="field">
          <label for="editTitle">Title</label>
          <input id="editTitle" type="text" [(ngModel)]="editTitle" name="editTitle" />
        </div>
        <div class="field">
          <label for="editDescription">Description</label>
          <textarea
            id="editDescription"
            [(ngModel)]="editDescription"
            name="editDescription"
            rows="3"
          ></textarea>
        </div>
        <div class="field">
          <label for="editTags">Tags (comma-separated)</label>
          <input id="editTags" type="text" [(ngModel)]="editTagsStr" name="editTags" />
        </div>
        <div class="metadata-actions">
          <mns-btn variant="primary" [disabled]="savingMetadata()" (mnsClick)="onSave()">
            {{ savingMetadata() ? 'Saving...' : 'Save Changes' }}
          </mns-btn>
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
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--r-xl, 16px);
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .detail-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .detail-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .reupload-btn {
      display: inline-flex;
      align-items: center;
      padding: 7px 12px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      border: 1px solid var(--border-strong);
      color: var(--text);
      transition: filter 0.15s;
    }
    .reupload-btn:hover {
      filter: brightness(1.06);
    }

    /* Preview */
    .preview-area {
      margin-bottom: 1.5rem;
      background: #000;
      border-radius: 0.625rem;
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
    .status-pill {
      width: fit-content;
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      background: var(--surface-3);
      color: var(--text-muted);
    }
    .status-pill[data-status='completed'] {
      background: var(--online-dim);
      color: var(--color-online);
    }
    .status-pill[data-status='pending'],
    .status-pill[data-status='processing'] {
      background: var(--warn-dim);
      color: var(--color-warn);
    }
    .status-pill[data-status='failed'] {
      background: var(--offline-dim);
      color: var(--color-offline);
    }

    /* Progress Bar (transcoding) */
    .progress-bar {
      height: 0.375rem;
      background: var(--surface-3);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.2s;
    }
    .progress-fill.processing {
      background: var(--color-warn);
    }
    .transcoding-bar {
      margin-top: 0.5rem;
    }

    /* Metadata Section */
    .metadata-section {
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .field label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .field input[type='text'],
    .field textarea {
      width: 100%;
      padding: 11px 13px;
      background: var(--surface-2);
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      color: var(--text);
      font-size: 14px;
      box-sizing: border-box;
      font-family: inherit;
      outline: none;
      transition:
        border-color 150ms,
        box-shadow 150ms;
    }
    .field input[type='text']:focus,
    .field textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .metadata-actions {
      display: flex;
      gap: 0.5rem;
    }

    /* File Info Grid */
    .file-info-grid {
      border-top: 1px solid var(--border);
      padding-top: 1.25rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 13.5px;
      color: var(--text);
    }
    .detail-label {
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .error {
      color: var(--color-offline);
      font-size: 0.875rem;
      margin: 0;
    }
    .success {
      color: var(--color-online);
      font-size: 0.875rem;
      margin: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .reupload-btn,
      .field input[type='text'],
      .field textarea,
      .progress-fill {
        transition: none;
      }
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
  readonly copyLink = output<void>();
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
