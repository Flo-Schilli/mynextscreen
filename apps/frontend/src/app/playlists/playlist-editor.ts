import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Playlist, PlaylistItem, TransitionType, TRANSITION_OPTIONS } from './playlist.model';
import { PlaylistFormatService } from './playlist-format.service';

/** A per-item field change emitted by the editor for the parent to persist. */
export interface ItemFieldChange<T> {
  item: PlaylistItem;
  value: T;
}

/**
 * Presentational playlist editor: header (inline rename, set-default, delete,
 * close), the drag-and-drop item list with per-item duration/transition
 * controls, total duration, and an inline media preview. Owns only the inline
 * rename UI state; every data mutation is emitted for the parent to persist
 * (which keeps the debounced PATCH and reorder orchestration in one place).
 */
@Component({
  selector: 'app-playlist-editor',
  standalone: true,
  imports: [FormsModule, DragDropModule],
  template: `
    <div class="editor-card">
      <div class="editor-header">
        <div class="editor-title-row">
          @if (editingName) {
            <input
              class="name-input"
              type="text"
              [(ngModel)]="editNameValue"
              (keydown.enter)="saveName()"
              (keydown.escape)="cancelEditName()"
            />
            <button class="btn btn-primary btn-sm" (click)="saveName()">Save</button>
            <button class="btn btn-secondary btn-sm" (click)="cancelEditName()">Cancel</button>
          } @else {
            <h2>{{ playlist().name }}</h2>
            <button class="btn btn-secondary btn-sm" (click)="startEditName()">Rename</button>
          }
        </div>
        <div class="editor-actions">
          @if (isOrgAdmin()) {
            <button
              class="btn btn-sm"
              [class.btn-primary]="!isDefault()"
              [class.btn-secondary]="isDefault()"
              (click)="toggleDefault.emit()"
              [disabled]="settingDefault()"
            >
              {{ isDefault() ? 'Default Playlist' : 'Set as Default' }}
            </button>
          }
          <button class="btn btn-danger btn-sm" (click)="deletePlaylist.emit()">Delete</button>
          <button class="btn btn-secondary btn-sm" (click)="dismiss.emit()">Close</button>
        </div>
      </div>

      @if (editorError()) {
        <p class="error">{{ editorError() }}</p>
      }

      <!-- Playlist Items -->
      <div class="items-section">
        <div class="items-header">
          <h3>Items</h3>
          <button class="btn btn-primary btn-sm" (click)="addContent.emit()">+ Add Content</button>
        </div>

        @if (playlist().items.length === 0) {
          <div class="empty-items">
            <p class="empty-text">No items in this playlist yet.</p>
            <button class="btn btn-primary" (click)="addContent.emit()">Add Your First Item</button>
          </div>
        } @else {
          <div cdkDropList class="item-list" (cdkDropListDropped)="reorder.emit($event)">
            @for (item of playlist().items; track item.id) {
              <div class="item-row" cdkDrag>
                <div class="drag-handle" cdkDragHandle>
                  <span class="drag-icon">&#9776;</span>
                </div>
                <div
                  class="item-thumbnail"
                  (click)="previewItem.emit(item)"
                  tabindex="0"
                  role="button"
                  (keydown.enter)="previewItem.emit(item)"
                  (keydown.space)="previewItem.emit(item)"
                >
                  @if (item.content?.type === 'image') {
                    <img [src]="thumbUrl()(item)" alt="" class="thumb-img" />
                  } @else {
                    <div class="thumb-video">
                      <span class="video-icon">&#9654;</span>
                    </div>
                  }
                </div>
                <div class="item-info">
                  <span class="item-title">{{ item.content?.title || 'Untitled' }}</span>
                  <span
                    class="item-type"
                    [class.type-image]="item.content?.type === 'image'"
                    [class.type-video]="item.content?.type === 'video'"
                  >
                    {{ item.content?.type || 'unknown' }}
                  </span>
                </div>
                <div class="item-duration">
                  <label class="duration-label" [attr.for]="'dur_' + item.id">
                    {{ item.content?.type === 'video' ? 'Video length' : 'Duration' }}
                  </label>
                  <div class="duration-input-group">
                    @if (item.content?.type === 'video' && item.content?.durationSeconds === null) {
                      <span class="duration-approx">~</span>
                    }
                    <input
                      type="number"
                      class="duration-input"
                      [id]="'dur_' + item.id"
                      [ngModel]="
                        item.content?.type === 'video'
                          ? (item.content?.durationSeconds ?? item.durationSeconds)
                          : item.durationSeconds
                      "
                      (ngModelChange)="durationChange.emit({ item, value: $event })"
                      min="1"
                      [name]="'dur_' + item.id"
                      [disabled]="item.content?.type === 'video'"
                    />
                    <span class="duration-unit">s</span>
                  </div>
                </div>
                <div class="item-transition">
                  <label class="duration-label" [attr.for]="'trans_' + item.id">Transition</label>
                  <select
                    class="transition-select"
                    [id]="'trans_' + item.id"
                    [ngModel]="item.transition"
                    (ngModelChange)="transitionChange.emit({ item, value: $event })"
                    [name]="'trans_' + item.id"
                  >
                    @for (opt of transitionOptions; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                </div>
                <div class="item-transition-duration">
                  <label class="duration-label" [attr.for]="'tdur_' + item.id">Trans. ms</label>
                  <div class="duration-input-group">
                    <input
                      type="number"
                      class="duration-input"
                      [id]="'tdur_' + item.id"
                      [ngModel]="item.transitionDurationMs"
                      (ngModelChange)="transitionDurationChange.emit({ item, value: $event })"
                      min="0"
                      max="3000"
                      [name]="'tdur_' + item.id"
                    />
                    <span class="duration-unit">ms</span>
                  </div>
                </div>
                <button class="btn-remove" (click)="removeItem.emit(item)" title="Remove item">
                  &#10005;
                </button>
              </div>
            }
          </div>

          <div class="total-duration">
            Total Duration:
            <strong>{{
              format.formatDuration(format.totalDurationSeconds(playlist().items))
            }}</strong>
          </div>
        }
      </div>

      <!-- Inline Preview -->
      @if (previewingItem()) {
        <div class="preview-section">
          <div class="preview-header">
            <h3>Preview: {{ previewingItem()!.content?.title || 'Untitled' }}</h3>
            <button class="btn btn-secondary btn-sm" (click)="closePreview.emit()">
              Close Preview
            </button>
          </div>
          <div class="preview-content">
            @if (previewingItem()!.content?.type === 'image') {
              <img [src]="previewUrl()(previewingItem()!)" alt="Preview" class="preview-media" />
            } @else {
              <video [src]="previewUrl()(previewingItem()!)" controls class="preview-media"></video>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .btn-sm {
      padding: 0.325rem 0.75rem;
      font-size: 0.8125rem;
    }

    .editor-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: var(--shadow);
    }
    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .editor-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .editor-title-row h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .name-input {
      padding: 0.375rem 0.75rem;
      background: var(--surface);
      border: 1px solid var(--accent);
      border-radius: 0.375rem;
      color: var(--text);
      font-size: 1.125rem;
      font-weight: 600;
    }
    .name-input:focus {
      outline: none;
    }
    .editor-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .items-section {
      border-top: 1px solid var(--color-border);
      padding-top: 1.25rem;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .items-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .empty-items {
      text-align: center;
      padding: 2rem;
    }

    .item-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      transition: border-color 0.15s;
    }
    .item-row:hover {
      border-color: var(--border-strong);
    }
    .drag-handle {
      cursor: grab;
      color: var(--text-muted);
      font-size: 1rem;
      padding: 0.25rem;
      user-select: none;
      display: flex;
      align-items: center;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .drag-icon {
      font-size: 0.875rem;
    }
    .item-thumbnail {
      width: 3.5rem;
      height: 2.5rem;
      border-radius: 0.25rem;
      overflow: hidden;
      flex-shrink: 0;
      cursor: pointer;
      background: var(--surface-3);
    }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .thumb-video {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-3);
      color: var(--text-muted);
      font-size: 1rem;
    }
    .item-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .item-title {
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-type {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .type-image {
      color: #22c55e;
    }
    .type-video {
      color: #a78bfa;
    }
    .item-duration {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      flex-shrink: 0;
    }
    .duration-label {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .duration-input-group {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .duration-input {
      width: 4rem;
      padding: 0.25rem 0.5rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      color: var(--text);
      font-size: 0.8125rem;
      text-align: right;
    }
    .duration-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .duration-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .duration-approx {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-right: -0.125rem;
    }
    .duration-unit {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .item-transition,
    .item-transition-duration {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      flex-shrink: 0;
    }
    .transition-select {
      padding: 0.25rem 0.5rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 0.25rem;
      color: var(--text);
      font-size: 0.8125rem;
    }
    .transition-select:focus {
      outline: none;
      border-color: var(--accent);
    }
    .btn-remove {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition:
        color 0.15s,
        background-color 0.15s;
    }
    .btn-remove:hover {
      color: #ef4444;
      background: #ef444420;
    }

    /* CDK Drag & Drop */
    .cdk-drag-preview {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-accent);
      border-radius: 0.375rem;
      padding: 0.625rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
    }
    .cdk-drag-animating {
      transition: transform 200ms ease;
    }
    .item-list.cdk-drop-list-dragging .item-row:not(.cdk-drag-placeholder) {
      transition: transform 200ms ease;
    }

    .total-duration {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      text-align: right;
    }
    .total-duration strong {
      color: var(--text);
    }

    .preview-section {
      margin-top: 1.5rem;
      border-top: 1px solid var(--color-border);
      padding-top: 1.25rem;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .preview-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    .preview-content {
      text-align: center;
    }
    .preview-media {
      max-width: 100%;
      max-height: 24rem;
      border-radius: 0.375rem;
      border: 1px solid var(--border);
    }
  `,
})
export class PlaylistEditor {
  readonly playlist = input.required<Playlist>();
  readonly isOrgAdmin = input.required<boolean>();
  readonly isDefault = input.required<boolean>();
  readonly settingDefault = input.required<boolean>();
  readonly editorError = input.required<string>();
  readonly previewingItem = input.required<PlaylistItem | null>();
  readonly thumbUrl = input.required<(item: PlaylistItem) => string>();
  readonly previewUrl = input.required<(item: PlaylistItem) => string>();

  readonly rename = output<string>();
  readonly toggleDefault = output<void>();
  readonly deletePlaylist = output<void>();
  readonly dismiss = output<void>();
  readonly addContent = output<void>();
  readonly removeItem = output<PlaylistItem>();
  readonly reorder = output<CdkDragDrop<PlaylistItem[]>>();
  readonly durationChange = output<ItemFieldChange<number>>();
  readonly transitionChange = output<ItemFieldChange<TransitionType>>();
  readonly transitionDurationChange = output<ItemFieldChange<number>>();
  readonly previewItem = output<PlaylistItem>();
  readonly closePreview = output<void>();

  protected readonly format = inject(PlaylistFormatService);
  protected readonly transitionOptions = TRANSITION_OPTIONS;

  protected editingName = false;
  protected editNameValue = '';

  startEditName(): void {
    this.editNameValue = this.playlist().name;
    this.editingName = true;
  }

  cancelEditName(): void {
    this.editingName = false;
  }

  saveName(): void {
    const name = this.editNameValue.trim();
    if (!name) return;
    this.rename.emit(name);
    this.editingName = false;
  }
}
