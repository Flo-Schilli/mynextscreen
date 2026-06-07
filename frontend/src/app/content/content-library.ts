import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ContentService, UploadProgress } from './content.service';
import { Content, StorageInfo } from './content.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { SelectionService } from '../shared/selection/selection.service';
import { SelectionCheckboxComponent } from '../shared/selection/selection-checkbox';
import { SelectAllCheckboxComponent } from '../shared/selection/select-all-checkbox';
import { BulkActionToolbarComponent, BulkAction } from '../shared/selection/bulk-action-toolbar';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';

interface UploadItem {
  file: File;
  title: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [
    FormsModule,
    SelectionCheckboxComponent,
    SelectAllCheckboxComponent,
    BulkActionToolbarComponent,
  ],
  providers: [SelectionService],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Content Library</h1>
        </div>
        @if (!selectedContent) {
          <div class="header-right">
            <div class="type-toggle">
              <button
                class="toggle-btn"
                [class.active]="!filterType"
                (click)="setTypeFilter(undefined)"
              >
                All
              </button>
              <button
                class="toggle-btn"
                [class.active]="filterType === 'image'"
                (click)="setTypeFilter('image')"
              >
                Images
              </button>
              <button
                class="toggle-btn"
                [class.active]="filterType === 'video'"
                (click)="setTypeFilter('video')"
              >
                Videos
              </button>
            </div>
          </div>
        }
      </header>

      <!-- Storage Usage -->
      @if (storage && !selectedContent) {
        <div class="storage-bar-container">
          <div class="storage-info">
            <span class="storage-label">Storage</span>
            <span class="storage-values">
              {{ formatBytes(storage.originalUsedBytes + storage.transcodedUsedBytes) }}
              @if (storage.originalLimitBytes > 0 || storage.transcodedLimitBytes > 0) {
                /
                {{
                  formatBytes(
                    (storage.originalLimitBytes || Infinity) +
                      (storage.transcodedLimitBytes || Infinity)
                  )
                }}
              }
            </span>
          </div>
          <div class="storage-bar">
            <div class="storage-bar-original" [style.width.%]="getOriginalPercent()"></div>
            <div
              class="storage-bar-transcoded"
              [style.width.%]="getTranscodedPercent()"
              [style.left.%]="getOriginalPercent()"
            ></div>
          </div>
          <div class="storage-legend">
            <span class="legend-item"
              ><span class="legend-dot original"></span> Original ({{
                formatBytes(storage.originalUsedBytes)
              }})</span
            >
            <span class="legend-item"
              ><span class="legend-dot transcoded"></span> Transcoded ({{
                formatBytes(storage.transcodedUsedBytes)
              }})</span
            >
          </div>
        </div>
      }

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading content...</p>
      }

      <!-- Tag Filter -->
      @if (!loading && !selectedContent && allTags.length > 0) {
        <div class="tag-filter">
          @for (tag of allTags; track tag) {
            <button
              class="tag-chip"
              [class.active]="filterTags.includes(tag)"
              (click)="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          }
          @if (filterTags.length > 0) {
            <button class="tag-chip clear" (click)="clearTags()">Clear</button>
          }
        </div>
      }

      <!-- Upload Area -->
      @if (!selectedContent) {
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
      }

      <!-- Upload Progress -->
      @if (uploads.length > 0 && !selectedContent) {
        <div class="upload-list">
          @for (item of uploads; track item.file.name) {
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

      <!-- Content Detail View -->
      @if (selectedContent) {
        <div class="detail-card wide">
          <div class="detail-header">
            <h2>{{ selectedContent.title }}</h2>
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
              <button class="btn btn-danger" (click)="confirmDelete()">Delete</button>
              <button class="btn btn-secondary" (click)="closeDetail()">Close</button>
            </div>
          </div>

          <!-- Preview -->
          <div class="preview-area">
            @if (selectedContent.type === 'image') {
              <img [src]="getPreviewUrl(selectedContent)" alt="Preview" class="preview-img" />
            } @else {
              <video [src]="getPreviewUrl(selectedContent)" controls class="preview-video"></video>
            }
          </div>

          <!-- Transcoding Status -->
          <div class="transcoding-status">
            <span class="detail-label">Transcoding</span>
            <span class="status-badge" [attr.data-status]="selectedContent.transcodingStatus">
              @if (selectedContent.transcodingStatus === 'processing') {
                Processing {{ transcodingProgress[selectedContent.id] ?? 0 }}%
              } @else {
                {{ selectedContent.transcodingStatus }}
              }
            </span>
            @if (selectedContent.transcodingStatus === 'processing') {
              <div class="progress-bar transcoding-bar">
                <div
                  class="progress-fill processing"
                  [style.width.%]="transcodingProgress[selectedContent.id] ?? 0"
                ></div>
              </div>
            }
            @if (
              selectedContent.transcodingStatus === 'failed' && selectedContent.transcodingError
            ) {
              <p class="error">{{ selectedContent.transcodingError }}</p>
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
              <button class="btn btn-primary" (click)="saveMetadata()" [disabled]="savingMetadata">
                {{ savingMetadata ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
            @if (metadataError) {
              <p class="error">{{ metadataError }}</p>
            }
            @if (metadataSaved) {
              <p class="success">Changes saved.</p>
            }
          </div>

          <!-- File Info -->
          <div class="file-info-grid">
            <div class="detail-item">
              <span class="detail-label">Type</span>
              <span>{{ selectedContent.type }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Original File</span>
              <span>{{ selectedContent.originalFilename }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Original Size</span>
              <span>{{ formatBytes(selectedContent.originalSizeBytes) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Transcoded Size</span>
              <span>{{
                selectedContent.transcodedSizeBytes !== null
                  ? formatBytes(selectedContent.transcodedSizeBytes)
                  : '—'
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">MIME Type</span>
              <span>{{ selectedContent.originalMimeType }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Uploaded</span>
              <span>{{ formatDate(selectedContent.createdAt) }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Content Grid -->
      @if (!loading && !selectedContent && filteredContent.length > 0) {
        <div class="grid-header">
          <app-select-all-checkbox [allIds]="contentIds" />
        </div>
        <div class="content-grid">
          @for (item of filteredContent; track item.id; let i = $index) {
            <div
              class="content-card"
              [class.selected]="selectionService.isSelected(item.id)()"
              (click)="selectContent(item)"
              tabindex="0"
              role="button"
              (keydown.enter)="selectContent(item)"
              (keydown.space)="selectContent(item)"
            >
              <div class="card-thumbnail">
                <div class="card-checkbox" [class.any-selected]="selectionService.hasSelection()">
                  <app-selection-checkbox
                    [itemId]="item.id"
                    [itemIndex]="i"
                    [orderedIds]="contentIds"
                    (click)="$event.stopPropagation()"
                  />
                </div>
                @if (item.type === 'image' && item.transcodingStatus === 'completed') {
                  <img [src]="getPreviewUrl(item)" alt="" class="thumb-img" loading="lazy" />
                } @else if (item.type === 'video') {
                  <div class="thumb-placeholder video">
                    <span class="thumb-icon">&#9654;</span>
                  </div>
                } @else {
                  <div class="thumb-placeholder">
                    <span class="thumb-icon">&#128247;</span>
                  </div>
                }
                <!-- Transcoding overlay -->
                @if (item.transcodingStatus !== 'completed') {
                  <div class="transcoding-overlay">
                    @if (item.transcodingStatus === 'pending') {
                      <span class="overlay-text">Pending</span>
                    } @else if (item.transcodingStatus === 'processing') {
                      <span class="overlay-text">{{ transcodingProgress[item.id] ?? 0 }}%</span>
                      <div class="overlay-bar">
                        <div
                          class="overlay-fill"
                          [style.width.%]="transcodingProgress[item.id] ?? 0"
                        ></div>
                      </div>
                    } @else {
                      <span class="overlay-text failed">Failed</span>
                    }
                  </div>
                }
              </div>
              <div class="card-info">
                <span class="card-title">{{ item.title }}</span>
                <span class="card-meta"
                  >{{ item.type }} &middot; {{ formatBytes(item.originalSizeBytes) }}</span
                >
              </div>
            </div>
          }
        </div>

        <app-bulk-action-toolbar [actions]="bulkActions" />
      }

      @if (!loading && !selectedContent && filteredContent.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No content uploaded yet. Drag files above to get started.</p>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm deletion"
          tabindex="0"
          (click)="cancelDelete()"
          (keydown.escape)="cancelDelete()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Delete Content</h2>
            <p>
              Are you sure you want to delete <strong>{{ selectedContent?.title }}</strong
              >? This will permanently remove the original and transcoded files.
            </p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm bulk delete"
          tabindex="0"
          (click)="cancelBulkDelete()"
          (keydown.escape)="cancelBulkDelete()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Delete Content</h2>
            <p>
              You are about to permanently delete
              <strong>{{ selectionService.count() }} item(s)</strong>. This will remove all original
              and transcoded files. This cannot be undone.
            </p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelBulkDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeBulkDelete()">Delete</button>
            </div>
          </div>
        </div>
      }

      <!-- Tag Entry Modal -->
      @if (showTagModal) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Manage tags"
          tabindex="0"
          (click)="cancelTagModal()"
          (keydown.escape)="cancelTagModal()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>{{ tagModalMode === 'add' ? 'Add Tags' : 'Remove Tags' }}</h2>
            <div class="form-group">
              <label for="bulkTagInput">Tags (comma-separated)</label>
              <input
                id="bulkTagInput"
                type="text"
                [(ngModel)]="bulkTagInput"
                name="bulkTagInput"
                placeholder="e.g. promo, seasonal"
              />
            </div>
            @if (allTags.length > 0) {
              <div class="tag-suggestions">
                @for (tag of allTags; track tag) {
                  <button
                    class="tag-chip"
                    [class.active]="bulkTagInput.split(',').map(t => t.trim()).includes(tag)"
                    (click)="toggleBulkTag(tag)"
                  >
                    {{ tag }}
                  </button>
                }
              </div>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelTagModal()">Cancel</button>
              <button
                class="btn btn-primary"
                (click)="executeTagModal()"
                [disabled]="!bulkTagInput.trim()"
              >
                {{ tagModalMode === 'add' ? 'Add Tags' : 'Remove Tags' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Playlist Picker Modal -->
      @if (showPlaylistModal) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add to playlist"
          tabindex="0"
          (click)="cancelPlaylistModal()"
          (keydown.escape)="cancelPlaylistModal()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Add to Playlist</h2>
            @if (playlistsLoading) {
              <p>Loading playlists...</p>
            } @else if (playlistsLoadError) {
              <p class="error">{{ playlistsLoadError }}</p>
            } @else {
              <div class="playlist-list">
                @for (pl of playlists; track pl.id) {
                  <label class="playlist-option">
                    <input
                      type="radio"
                      name="playlistPick"
                      [value]="pl.id"
                      [(ngModel)]="selectedPlaylistId"
                    />
                    <span>{{ pl.name }}</span>
                  </label>
                }
                @if (playlists.length === 0) {
                  <p class="empty-text">No playlists available.</p>
                }
              </div>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelPlaylistModal()">Cancel</button>
              <button
                class="btn btn-primary"
                (click)="executePlaylistModal()"
                [disabled]="!selectedPlaylistId || playlistsLoading"
              >
                Add to Playlist
              </button>
            </div>
          </div>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Toast -->
      @if (toastMessage) {
        <div
          class="toast"
          [class.toast-error]="toastType === 'error'"
          [class.toast-success]="toastType === 'success'"
          [class.toast-warning]="toastType === 'warning'"
        >
          {{ toastMessage }}
        </div>
      }
    </div>
  `,
  styles: `
    .header-right {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    /* Type Toggle */
    .type-toggle {
      display: flex;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      overflow: hidden;
    }
    .toggle-btn {
      padding: 0.375rem 0.75rem;
      border: none;
      background: none;
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toggle-btn.active {
      background: var(--color-accent);
      color: #fff;
    }
    .toggle-btn:hover:not(.active) {
      background: var(--color-bg-tertiary);
    }

    /* Tag Filter */
    .tag-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .tag-chip {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid var(--color-border);
      background: var(--color-bg-secondary);
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tag-chip.active {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: #fff;
    }
    .tag-chip.clear {
      background: none;
      border-color: var(--color-text-muted);
      color: var(--color-text-muted);
    }
    .tag-chip:hover:not(.active) {
      border-color: var(--color-text-secondary);
      color: var(--color-text-primary);
    }

    /* Storage Bar */
    .storage-bar-container {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .storage-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .storage-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }
    .storage-values {
      font-size: 0.8125rem;
      color: var(--color-text-primary);
    }
    .storage-bar {
      height: 0.5rem;
      background: var(--color-bg-tertiary);
      border-radius: 9999px;
      position: relative;
      overflow: hidden;
    }
    .storage-bar-original {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--color-accent);
      border-radius: 9999px 0 0 9999px;
      transition: width 0.3s;
    }
    .storage-bar-transcoded {
      position: absolute;
      top: 0;
      height: 100%;
      background: #8b5cf6;
      border-radius: 0;
      transition:
        width 0.3s,
        left 0.3s;
    }
    .storage-legend {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    .legend-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }
    .legend-dot.original {
      background: var(--color-accent);
    }
    .legend-dot.transcoded {
      background: #8b5cf6;
    }

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
    .progress-fill.processing {
      background: #f59e0b;
    }
    .transcoding-bar {
      margin-top: 0.5rem;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 1rem;
    }
    .content-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      overflow: hidden;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    .content-card:hover,
    .content-card:focus {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
      outline: none;
    }
    .card-thumbnail {
      position: relative;
      aspect-ratio: 16/9;
      background: var(--color-bg-tertiary);
      overflow: hidden;
    }
    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: var(--color-text-muted);
    }
    .thumb-placeholder.video {
      background: #1a1a2e;
    }

    /* Transcoding overlay on grid cards */
    .transcoding-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem;
    }
    .overlay-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: #fbbf24;
    }
    .overlay-text.failed {
      color: #ef4444;
    }
    .overlay-bar {
      width: 80%;
      height: 0.25rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      overflow: hidden;
    }
    .overlay-fill {
      height: 100%;
      background: #fbbf24;
      border-radius: 9999px;
      transition: width 0.2s;
    }

    .card-info {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .card-title {
      font-size: 0.8125rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-meta {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: capitalize;
    }

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

    /* Grid Header with select-all */
    .grid-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    /* Selection checkbox overlay on cards */
    .card-checkbox {
      position: absolute;
      top: 0.375rem;
      left: 0.375rem;
      z-index: 2;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .content-card:hover .card-checkbox,
    .card-checkbox.any-selected {
      opacity: 1;
    }
    .content-card.selected {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 1px var(--color-accent);
    }

    /* Tag suggestions in modal */
    .tag-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 1rem;
    }

    /* Playlist picker */
    .playlist-list {
      max-height: 16rem;
      overflow-y: auto;
      margin-bottom: 1rem;
    }
    .playlist-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--color-text-primary);
      transition: background 0.1s;
    }
    .playlist-option:hover {
      background: var(--color-bg-tertiary);
    }
    .playlist-option input[type='radio'] {
      accent-color: var(--color-accent);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      z-index: 2000;
      animation: slideUp 0.2s ease-out;
    }
    .toast-success {
      background: #166534;
      color: #bbf7d0;
    }
    .toast-error {
      background: #991b1b;
      color: #fecaca;
    }
    .toast-warning {
      background: #92400e;
      color: #fef3c7;
    }
    @keyframes slideUp {
      from {
        transform: translateY(1rem);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .success {
      color: #22c55e;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
  `,
})
export class ContentLibrary implements OnInit, OnDestroy {
  private contentService = inject(ContentService);
  private memberService = inject(MemberService);
  private playlistService = inject(PlaylistService);
  private router = inject(Router);
  readonly selectionService = inject(SelectionService);

  orgId = '';
  contents: Content[] = [];
  filteredContent: Content[] = [];
  contentIds: string[] = [];
  allTags: string[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Filters
  filterType: string | undefined;
  filterTags: string[] = [];

  // Storage
  storage: StorageInfo | null = null;
  Infinity = Infinity;

  // Upload
  isDragOver = false;
  uploads: UploadItem[] = [];

  // Detail view
  selectedContent: Content | null = null;
  editTitle = '';
  editDescription = '';
  editTagsStr = '';
  savingMetadata = false;
  metadataError = '';
  metadataSaved = false;

  // Delete
  showDeleteConfirm = false;
  deleting = false;

  // Bulk operations
  showBulkDeleteConfirm = false;
  private bulkDeleteResolve: ((v: boolean) => void) | null = null;

  showTagModal = false;
  tagModalMode: 'add' | 'remove' = 'add';
  bulkTagInput = '';
  private tagModalResolve: ((v: boolean) => void) | null = null;

  showPlaylistModal = false;
  playlists: Playlist[] = [];
  playlistsLoading = false;
  playlistsLoadError = '';
  selectedPlaylistId = '';
  private playlistModalResolve: ((v: boolean) => void) | null = null;

  // Toast
  toastMessage = '';
  toastType: 'error' | 'success' | 'warning' = 'success';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  bulkActions: BulkAction[] = [
    {
      label: 'Delete selected',
      variant: 'danger',
      handler: () => this.handleBulkDelete(),
    },
    {
      label: 'Add tags',
      variant: 'default',
      handler: () => this.handleBulkTag('add'),
    },
    {
      label: 'Remove tags',
      variant: 'default',
      handler: () => this.handleBulkTag('remove'),
    },
    {
      label: 'Add to playlist',
      variant: 'default',
      handler: () => this.handleBulkAddToPlaylist(),
    },
  ];

  // Transcoding progress
  transcodingProgress: Record<string, number | undefined> = {};
  private sseService = inject(DashboardSseService);
  private sseSubs: Subscription[] = [];

  ngOnInit(): void {
    this.loadCurrentOrg();
  }

  ngOnDestroy(): void {
    for (const sub of this.sseSubs) sub.unsubscribe();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const membership =
          memberships.find((m) => m.role === 'org_admin') ||
          memberships.find((m) => m.role === 'editor') ||
          memberships[0];
        if (membership) {
          this.orgId = membership.organisationId;
          this.loadContent();
          this.loadStorage();
          this.subscribeToTranscoding();
        } else {
          this.loadError = 'You are not a member of any organisation.';
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = 'Failed to load organisation context.';
        this.loading = false;
      },
    });
  }

  private subscribeToTranscoding(): void {
    this.sseSubs.push(
      this.sseService.transcodingProgress$.subscribe((event) => {
        const data = event.data as { contentId: string; progress: number };
        this.transcodingProgress[data.contentId] = data.progress;
        const item = this.contents.find((c) => c.id === data.contentId);
        if (item && item.transcodingStatus !== 'processing') {
          item.transcodingStatus = 'processing';
          this.applyFilters();
        }
      }),
      this.sseService.transcodingComplete$.subscribe((event) => {
        const data = event.data as { contentId: string; transcodedSizeBytes: number };
        const item = this.contents.find((c) => c.id === data.contentId);
        if (item) {
          item.transcodingStatus = 'completed';
          item.transcodedSizeBytes = data.transcodedSizeBytes;
          delete this.transcodingProgress[data.contentId];
          this.applyFilters();
          if (this.selectedContent?.id === data.contentId) {
            this.selectedContent = { ...item };
          }
        }
        this.loadStorage();
      }),
      this.sseService.transcodingFailed$.subscribe((event) => {
        const data = event.data as { contentId: string; error: string };
        const item = this.contents.find((c) => c.id === data.contentId);
        if (item) {
          item.transcodingStatus = 'failed';
          item.transcodingError = data.error;
          delete this.transcodingProgress[data.contentId];
          this.applyFilters();
          if (this.selectedContent?.id === data.contentId) {
            this.selectedContent = { ...item };
          }
        }
      }),
    );
  }

  loadContent(): void {
    this.loading = true;
    this.loadError = '';
    this.contentService.getAll(this.orgId).subscribe({
      next: (contents) => {
        this.contents = contents;
        this.extractTags();
        this.applyFilters();
        this.contentIds = this.filteredContent.map((c) => c.id);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? 'Access denied.' : 'Failed to load content.';
        this.loading = false;
      },
    });
  }

  loadStorage(): void {
    this.contentService.getStorage(this.orgId).subscribe({
      next: (info) => (this.storage = info),
    });
  }

  private extractTags(): void {
    const tagSet = new Set<string>();
    this.contents.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    this.allTags = Array.from(tagSet).sort();
  }

  private applyFilters(): void {
    let filtered = this.contents;
    if (this.filterType) {
      filtered = filtered.filter((c) => c.type === this.filterType);
    }
    if (this.filterTags.length > 0) {
      filtered = filtered.filter((c) => this.filterTags.some((t) => c.tags.includes(t)));
    }
    this.filteredContent = filtered;
    this.contentIds = filtered.map((c) => c.id);
  }

  setTypeFilter(type: string | undefined): void {
    this.filterType = type;
    this.applyFilters();
  }

  toggleTag(tag: string): void {
    const idx = this.filterTags.indexOf(tag);
    if (idx >= 0) {
      this.filterTags.splice(idx, 1);
    } else {
      this.filterTags.push(tag);
    }
    this.applyFilters();
  }

  clearTags(): void {
    this.filterTags = [];
    this.applyFilters();
  }

  // --- Upload ---
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
      this.uploadFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private uploadFiles(files: File[]): void {
    for (const file of files) {
      const item: UploadItem = {
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        progress: 0,
        status: 'uploading',
      };
      this.uploads.push(item);

      this.contentService.upload(this.orgId, file, item.title, '', []).subscribe({
        next: (event: UploadProgress) => {
          if (event.type === 'progress') {
            item.progress = event.progress ?? 0;
          } else if (event.type === 'complete') {
            item.progress = 100;
            item.status = 'done';
            if (event.content) {
              this.contents.unshift(event.content);
              this.extractTags();
              this.applyFilters();
            }
            this.loadStorage();
            this.clearDoneUploads();
          }
        },
        error: (err) => {
          item.status = 'error';
          item.error = err.error?.message || 'Upload failed';
        },
      });
    }
  }

  private clearDoneUploads(): void {
    setTimeout(() => {
      this.uploads = this.uploads.filter((u) => u.status === 'uploading');
    }, 2000);
  }

  // --- Detail ---
  selectContent(content: Content): void {
    this.selectedContent = content;
    this.editTitle = content.title;
    this.editDescription = content.description || '';
    this.editTagsStr = content.tags.join(', ');
    this.metadataError = '';
    this.metadataSaved = false;
  }

  closeDetail(): void {
    this.selectedContent = null;
  }

  getPreviewUrl(content: Content): string {
    if (content.transcodingStatus === 'completed') {
      return this.contentService.getTranscodedUrl(content.id);
    }
    return this.contentService.getOriginalUrl(content.id);
  }

  // --- Metadata ---
  saveMetadata(): void {
    if (!this.selectedContent) return;
    this.savingMetadata = true;
    this.metadataError = '';
    this.metadataSaved = false;
    const tags = this.editTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    this.contentService
      .updateMetadata(this.orgId, this.selectedContent.id, {
        title: this.editTitle,
        description: this.editDescription,
        tags,
      })
      .subscribe({
        next: (updated) => {
          this.savingMetadata = false;
          this.metadataSaved = true;
          this.selectedContent = updated;
          const idx = this.contents.findIndex((c) => c.id === updated.id);
          if (idx >= 0) this.contents[idx] = updated;
          this.extractTags();
          this.applyFilters();
        },
        error: (err) => {
          this.metadataError = err.error?.message || 'Failed to save changes.';
          this.savingMetadata = false;
        },
      });
  }

  // --- Re-upload ---
  onReUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.selectedContent) return;
    const file = input.files[0];
    input.value = '';

    const item: UploadItem = {
      file,
      title: this.selectedContent.title,
      progress: 0,
      status: 'uploading',
    };
    this.uploads.push(item);

    this.contentService.reUpload(this.orgId, this.selectedContent.id, file).subscribe({
      next: (event: UploadProgress) => {
        if (event.type === 'progress') {
          item.progress = event.progress ?? 0;
        } else if (event.type === 'complete') {
          item.progress = 100;
          item.status = 'done';
          if (event.content) {
            this.selectedContent = event.content;
            const idx = this.contents.findIndex((c) => c.id === event.content!.id);
            if (idx >= 0) this.contents[idx] = event.content;
            this.applyFilters();
          }
          this.loadStorage();
          this.clearDoneUploads();
        }
      },
      error: (err) => {
        item.status = 'error';
        item.error = err.error?.message || 'Re-upload failed';
      },
    });
  }

  // --- Delete ---
  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  executeDelete(): void {
    if (!this.selectedContent) return;
    this.deleting = true;
    this.actionError = '';
    this.contentService.delete(this.orgId, this.selectedContent.id).subscribe({
      next: () => {
        this.contents = this.contents.filter((c) => c.id !== this.selectedContent!.id);
        this.extractTags();
        this.applyFilters();
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.selectedContent = null;
        this.loadStorage();
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to delete content.';
        this.deleting = false;
        this.showDeleteConfirm = false;
      },
    });
  }

  // --- Bulk Operations ---
  async handleBulkDelete(): Promise<void> {
    const confirmed = await this.openBulkDeleteConfirm();
    if (!confirmed) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.contentService.bulkDelete(this.orgId, ids));

    this.showToast(`${result.deleted} item(s) deleted`, 'success');
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
    }
    this.loadContent();
    this.loadStorage();
  }

  private openBulkDeleteConfirm(): Promise<boolean> {
    this.showBulkDeleteConfirm = true;
    return new Promise<boolean>((resolve) => {
      this.bulkDeleteResolve = resolve;
    });
  }

  cancelBulkDelete(): void {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(false);
    this.bulkDeleteResolve = null;
  }

  executeBulkDelete(): void {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(true);
    this.bulkDeleteResolve = null;
  }

  async handleBulkTag(mode: 'add' | 'remove'): Promise<void> {
    const confirmed = await this.openTagModal(mode);
    if (!confirmed) throw new Error('cancelled');

    const tags = this.bulkTagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tags.length === 0) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const result =
      mode === 'add'
        ? await firstValueFrom(this.contentService.bulkTag(this.orgId, ids, tags))
        : await firstValueFrom(this.contentService.bulkUntag(this.orgId, ids, tags));

    this.showToast(
      `${result.updated} item(s) ${mode === 'add' ? 'tagged' : 'untagged'}`,
      'success',
    );
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
    }
    this.loadContent();
  }

  private openTagModal(mode: 'add' | 'remove'): Promise<boolean> {
    this.tagModalMode = mode;
    this.bulkTagInput = '';
    this.showTagModal = true;
    return new Promise<boolean>((resolve) => {
      this.tagModalResolve = resolve;
    });
  }

  cancelTagModal(): void {
    this.showTagModal = false;
    this.tagModalResolve?.(false);
    this.tagModalResolve = null;
  }

  executeTagModal(): void {
    this.showTagModal = false;
    this.tagModalResolve?.(true);
    this.tagModalResolve = null;
  }

  toggleBulkTag(tag: string): void {
    const tags = this.bulkTagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const idx = tags.indexOf(tag);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.bulkTagInput = tags.join(', ');
  }

  async handleBulkAddToPlaylist(): Promise<void> {
    const confirmed = await this.openPlaylistModal();
    if (!confirmed) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(
      this.contentService.bulkAddToPlaylist(this.orgId, ids, this.selectedPlaylistId),
    );

    const playlistName =
      this.playlists.find((p) => p.id === this.selectedPlaylistId)?.name ?? 'selected playlist';
    let message = `${result.added} item(s) added to ${playlistName}`;
    if (result.alreadyPresent > 0) {
      message += ` (${result.alreadyPresent} were already in the playlist)`;
    }
    this.showToast(message, 'success');
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
    }
    this.loadContent();
  }

  private openPlaylistModal(): Promise<boolean> {
    this.showPlaylistModal = true;
    this.selectedPlaylistId = '';
    this.playlistsLoadError = '';
    this.playlistsLoading = true;
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
        this.playlistsLoading = false;
      },
      error: () => {
        this.playlistsLoadError = 'Failed to load playlists.';
        this.playlistsLoading = false;
      },
    });
    return new Promise<boolean>((resolve) => {
      this.playlistModalResolve = resolve;
    });
  }

  cancelPlaylistModal(): void {
    this.showPlaylistModal = false;
    this.playlistModalResolve?.(false);
    this.playlistModalResolve = null;
  }

  executePlaylistModal(): void {
    this.showPlaylistModal = false;
    this.playlistModalResolve?.(true);
    this.playlistModalResolve = null;
  }

  showToast(message: string, type: 'error' | 'success' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }

  // --- Helpers ---
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (!isFinite(bytes)) return 'Unlimited';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getOriginalPercent(): number {
    if (!this.storage) return 0;
    const combinedLimit =
      (this.storage.originalLimitBytes || 0) + (this.storage.transcodedLimitBytes || 0);
    if (combinedLimit === 0) {
      const totalUsed = this.storage.originalUsedBytes + this.storage.transcodedUsedBytes;
      if (totalUsed === 0) return 0;
      return (this.storage.originalUsedBytes / totalUsed) * 100;
    }
    return (this.storage.originalUsedBytes / combinedLimit) * 100;
  }

  getTranscodedPercent(): number {
    if (!this.storage) return 0;
    const combinedLimit =
      (this.storage.originalLimitBytes || 0) + (this.storage.transcodedLimitBytes || 0);
    if (combinedLimit === 0) {
      const totalUsed = this.storage.originalUsedBytes + this.storage.transcodedUsedBytes;
      if (totalUsed === 0) return 0;
      return (this.storage.transcodedUsedBytes / totalUsed) * 100;
    }
    return (this.storage.transcodedUsedBytes / combinedLimit) * 100;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
