import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PlaylistService } from './playlist.service';
import { Playlist, PlaylistItem } from './playlist.model';
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';

@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [FormsModule, DragDropModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Playlists</h1>
        </div>
        @if (!loading && !selectedPlaylist && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + Create Playlist
          </button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading playlists...</p>
      }

      <!-- Create Playlist Form -->
      @if (showCreateForm) {
        <div class="form-card">
          <h2>Create Playlist</h2>
          <form (ngSubmit)="submitCreate()">
            <div class="form-group">
              <label for="createName">Name</label>
              <input
                id="createName"
                type="text"
                [(ngModel)]="createName"
                name="createName"
                required
                placeholder="e.g. Main Stage Loop"
              />
            </div>
            @if (createError) {
              <p class="error">{{ createError }}</p>
            }
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="creating">
                {{ creating ? 'Creating...' : 'Create Playlist' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Playlist Detail / Editor View -->
      @if (selectedPlaylist) {
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
                <h2>{{ selectedPlaylist.name }}</h2>
                <button class="btn btn-secondary btn-sm" (click)="startEditName()">Rename</button>
              }
            </div>
            <div class="editor-actions">
              @if (isOrgAdmin) {
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="!isDefault"
                  [class.btn-secondary]="isDefault"
                  (click)="toggleDefault()"
                  [disabled]="settingDefault"
                >
                  {{ isDefault ? 'Default Playlist' : 'Set as Default' }}
                </button>
              }
              <button class="btn btn-danger btn-sm" (click)="confirmDelete()">Delete</button>
              <button class="btn btn-secondary btn-sm" (click)="closeDetail()">Close</button>
            </div>
          </div>

          @if (editorError) {
            <p class="error">{{ editorError }}</p>
          }

          <!-- Playlist Items -->
          <div class="items-section">
            <div class="items-header">
              <h3>Items</h3>
              <button class="btn btn-primary btn-sm" (click)="openAddContent()">+ Add Content</button>
            </div>

            @if (selectedPlaylist.items.length === 0) {
              <div class="empty-items">
                <p class="empty-text">No items in this playlist yet.</p>
                <button class="btn btn-primary" (click)="openAddContent()">Add Your First Item</button>
              </div>
            } @else {
              <div
                cdkDropList
                class="item-list"
                (cdkDropListDropped)="onDrop($event)"
              >
                @for (item of selectedPlaylist.items; track item.id) {
                  <div class="item-row" cdkDrag>
                    <div class="drag-handle" cdkDragHandle>
                      <span class="drag-icon">&#9776;</span>
                    </div>
                    <div class="item-thumbnail" (click)="previewItem(item)" tabindex="0" role="button"
                         (keydown.enter)="previewItem(item)" (keydown.space)="previewItem(item)">
                      @if (item.content?.type === 'image') {
                        <img [src]="getThumbUrl(item)" alt="" class="thumb-img" />
                      } @else {
                        <div class="thumb-video">
                          <span class="video-icon">&#9654;</span>
                        </div>
                      }
                    </div>
                    <div class="item-info">
                      <span class="item-title">{{ item.content?.title || 'Untitled' }}</span>
                      <span class="item-type" [class.type-image]="item.content?.type === 'image'" [class.type-video]="item.content?.type === 'video'">
                        {{ item.content?.type || 'unknown' }}
                      </span>
                    </div>
                    <div class="item-duration">
                      <label class="duration-label" [attr.for]="'dur_' + item.id">Duration</label>
                      <div class="duration-input-group">
                        <input
                          type="number"
                          class="duration-input"
                          [id]="'dur_' + item.id"
                          [ngModel]="item.durationSeconds"
                          (ngModelChange)="updateItemDuration(item, $event)"
                          min="1"
                          [name]="'dur_' + item.id"
                        />
                        <span class="duration-unit">s</span>
                      </div>
                    </div>
                    <button class="btn-remove" (click)="removeItem(item)" title="Remove item">
                      &#10005;
                    </button>
                  </div>
                }
              </div>

              <div class="total-duration">
                Total Duration: <strong>{{ formatDuration(totalDuration) }}</strong>
              </div>
            }
          </div>

          <!-- Inline Preview -->
          @if (previewingItem) {
            <div class="preview-section">
              <div class="preview-header">
                <h3>Preview: {{ previewingItem.content?.title || 'Untitled' }}</h3>
                <button class="btn btn-secondary btn-sm" (click)="closePreview()">Close Preview</button>
              </div>
              <div class="preview-content">
                @if (previewingItem.content?.type === 'image') {
                  <img [src]="getPreviewUrl(previewingItem)" alt="Preview" class="preview-media" />
                } @else {
                  <video [src]="getPreviewUrl(previewingItem)" controls class="preview-media"></video>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Playlist Grid -->
      @if (!loading && !selectedPlaylist && !showCreateForm && playlists.length > 0) {
        <div class="playlist-grid">
          @for (playlist of playlists; track playlist.id) {
            <div class="playlist-card" (click)="selectPlaylist(playlist)" tabindex="0" role="button"
                 (keydown.enter)="selectPlaylist(playlist)" (keydown.space)="selectPlaylist(playlist)">
              <div class="card-header">
                <span class="playlist-name">{{ playlist.name }}</span>
                @if (playlist.id === defaultPlaylistId) {
                  <span class="default-badge">Default</span>
                }
              </div>
              <div class="card-body">
                <div class="card-field">
                  <span class="card-label">Items</span>
                  <span class="card-value">{{ playlist.items.length }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Duration</span>
                  <span class="card-value">{{ formatDuration(getPlaylistDuration(playlist)) }}</span>
                </div>
                <div class="card-field">
                  <span class="card-label">Created</span>
                  <span class="card-value">{{ formatDate(playlist.createdAt) }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (!loading && !selectedPlaylist && !showCreateForm && playlists.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No playlists created yet.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Create Your First Playlist</button>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
             tabindex="0" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Playlist</h2>
            <p>Are you sure you want to delete <strong>{{ selectedPlaylist?.name }}</strong>? This action cannot be undone.</p>
            @if (selectedPlaylist?.id === defaultPlaylistId) {
              <p class="warning-text">This playlist is currently set as the organisation's default. Deleting it will clear the default playlist setting.</p>
            }
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Add Content Modal -->
      @if (showAddContent) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add content"
             tabindex="0" (click)="closeAddContent()" (keydown.escape)="closeAddContent()">
          <div class="modal modal-lg" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Add Content to Playlist</h2>

            @if (contentLoading) {
              <p class="loading-text">Loading content library...</p>
            } @else if (availableContent.length === 0) {
              <p class="empty-text">No content available. Upload content first.</p>
            } @else {
              <div class="content-type-filter">
                <button class="toggle-btn" [class.active]="!contentFilter" (click)="contentFilter = undefined">All</button>
                <button class="toggle-btn" [class.active]="contentFilter === 'image'" (click)="contentFilter = 'image'">Images</button>
                <button class="toggle-btn" [class.active]="contentFilter === 'video'" (click)="contentFilter = 'video'">Videos</button>
              </div>
              <div class="content-grid">
                @for (content of filteredContent; track content.id) {
                  <div class="content-item" (click)="addContentToPlaylist(content)" tabindex="0" role="button"
                       (keydown.enter)="addContentToPlaylist(content)" (keydown.space)="addContentToPlaylist(content)">
                    @if (content.type === 'image') {
                      <img [src]="getContentThumbUrl(content)" alt="" class="content-thumb" />
                    } @else {
                      <div class="content-thumb-video">
                        <span class="video-icon">&#9654;</span>
                      </div>
                    }
                    <div class="content-item-info">
                      <span class="content-item-title">{{ content.title }}</span>
                      <span class="content-item-type" [class.type-image]="content.type === 'image'" [class.type-video]="content.type === 'video'">
                        {{ content.type }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="form-actions">
              <button class="btn btn-secondary" (click)="closeAddContent()">Close</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 2rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .back-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .back-btn:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
    }

    /* Buttons */
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-sm {
      padding: 0.325rem 0.75rem;
      font-size: 0.8125rem;
    }
    .btn-primary {
      background: var(--color-accent);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--color-border);
    }
    .btn-danger {
      background: #991b1b;
      color: #fecaca;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }

    /* Playlist Grid */
    .playlist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .playlist-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.25rem;
      cursor: pointer;
      transition: border-color 0.15s, background-color 0.15s;
    }
    .playlist-card:hover, .playlist-card:focus {
      border-color: var(--color-accent);
      background: var(--color-bg-tertiary);
      outline: none;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .playlist-name {
      font-size: 1rem;
      font-weight: 600;
    }
    .default-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 600;
      background: var(--color-accent);
      color: #fff;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card-field {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
    }
    .card-label {
      color: var(--color-text-secondary);
    }
    .card-value {
      color: var(--color-text-primary);
    }

    /* Form Card */
    .form-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 40rem;
    }
    .form-card h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .form-group input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      box-sizing: border-box;
    }
    .form-group input:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* Editor Card */
    .editor-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
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
      background: var(--color-bg-primary);
      border: 1px solid var(--color-accent);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
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

    /* Items Section */
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

    /* Item List */
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
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      transition: border-color 0.15s;
    }
    .item-row:hover {
      border-color: var(--color-text-muted);
    }
    .drag-handle {
      cursor: grab;
      color: var(--color-text-muted);
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
      background: var(--color-bg-tertiary);
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
      background: var(--color-bg-tertiary);
      color: var(--color-text-muted);
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
      color: var(--color-text-secondary);
    }
    .duration-input-group {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .duration-input {
      width: 4rem;
      padding: 0.25rem 0.5rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      color: var(--color-text-primary);
      font-size: 0.8125rem;
      text-align: right;
    }
    .duration-input:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .duration-unit {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .btn-remove {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: color 0.15s, background-color 0.15s;
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

    /* Total Duration */
    .total-duration {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-align: right;
    }
    .total-duration strong {
      color: var(--color-text-primary);
    }

    /* Preview */
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
      border: 1px solid var(--color-border);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      min-width: 24rem;
      max-width: 36rem;
    }
    .modal-lg {
      max-width: 52rem;
      width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
    }
    .modal h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .modal p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }
    .warning-text {
      color: #fbbf24 !important;
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      font-size: 0.8125rem !important;
    }

    /* Add Content Modal */
    .content-type-filter {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 1rem;
    }
    .toggle-btn {
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.8125rem;
      transition: all 0.15s;
    }
    .toggle-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .toggle-btn.active {
      background: var(--color-accent);
      color: #fff;
      border-color: var(--color-accent);
    }
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
      max-height: 50vh;
      overflow-y: auto;
    }
    .content-item {
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .content-item:hover, .content-item:focus {
      border-color: var(--color-accent);
      outline: none;
    }
    .content-thumb {
      width: 100%;
      height: 6rem;
      object-fit: cover;
      display: block;
    }
    .content-thumb-video {
      width: 100%;
      height: 6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-bg-tertiary);
      color: var(--color-text-muted);
      font-size: 1.5rem;
    }
    .video-icon {
      opacity: 0.6;
    }
    .content-item-info {
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .content-item-title {
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .content-item-type {
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }
    .empty-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `,
})
export class Playlists implements OnInit {
  private playlistService = inject(PlaylistService);
  private contentService = inject(ContentService);
  private memberService = inject(MemberService);
  private organisationService = inject(OrganisationService);
  private router = inject(Router);

  orgId = '';
  userRole = '';
  playlists: Playlist[] = [];
  loading = true;
  loadError = '';
  defaultPlaylistId: string | null = null;

  // Create form
  showCreateForm = false;
  createName = '';
  createError = '';
  creating = false;

  // Detail / editor
  selectedPlaylist: Playlist | null = null;
  editorError = '';

  // Rename
  editingName = false;
  editNameValue = '';

  // Delete
  showDeleteConfirm = false;
  deleting = false;

  // Set as Default
  settingDefault = false;

  // Add content modal
  showAddContent = false;
  availableContent: Content[] = [];
  contentLoading = false;
  contentFilter: 'image' | 'video' | undefined;

  // Preview
  previewingItem: PlaylistItem | null = null;

  // Duration debounce timers
  private durationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  get isOrgAdmin(): boolean {
    return this.userRole === 'org_admin';
  }

  get isDefault(): boolean {
    return this.selectedPlaylist?.id === this.defaultPlaylistId;
  }

  get totalDuration(): number {
    if (!this.selectedPlaylist) return 0;
    return this.selectedPlaylist.items.reduce((sum, item) => sum + item.durationSeconds, 0);
  }

  get filteredContent(): Content[] {
    let content = this.availableContent.filter(
      (c) => c.transcodingStatus === 'completed',
    );
    if (this.contentFilter) {
      content = content.filter((c) => c.type === this.contentFilter);
    }
    return content;
  }

  ngOnInit(): void {
    this.loadCurrentOrg();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.userRole = adminMembership.role;
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.userRole = memberships[0].role;
        } else {
          this.loadError = 'You are not a member of any organisation.';
          this.loading = false;
          return;
        }
        this.loadPlaylists();
        this.loadDefaultPlaylist();
      },
      error: () => {
        this.loadError = 'Failed to load organisation context.';
        this.loading = false;
      },
    });
  }

  private loadDefaultPlaylist(): void {
    this.organisationService.getOne(this.orgId).subscribe({
      next: (org) => {
        this.defaultPlaylistId = org.defaultPlaylistId;
      },
      error: () => {
        // Non-superadmin users can't access org details — default badge won't show
      },
    });
  }

  loadPlaylists(): void {
    this.loading = true;
    this.loadError = '';
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? 'Access denied.'
            : 'Failed to load playlists.';
        this.loading = false;
      },
    });
  }

  // --- Create ---
  openCreateForm(): void {
    this.createName = '';
    this.createError = '';
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(): void {
    if (!this.createName.trim()) {
      this.createError = 'Name is required.';
      return;
    }

    this.creating = true;
    this.createError = '';
    this.playlistService.create(this.orgId, { name: this.createName.trim() }).subscribe({
      next: (playlist) => {
        this.creating = false;
        this.showCreateForm = false;
        this.loadPlaylists();
        this.selectPlaylist(playlist);
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create playlist.';
        this.creating = false;
      },
    });
  }

  // --- Detail ---
  selectPlaylist(playlist: Playlist): void {
    this.editorError = '';
    this.previewingItem = null;
    this.editingName = false;
    // Reload full detail with items
    this.playlistService.getOne(this.orgId, playlist.id).subscribe({
      next: (full) => {
        this.selectedPlaylist = full;
      },
      error: () => {
        this.editorError = 'Failed to load playlist details.';
      },
    });
  }

  closeDetail(): void {
    this.selectedPlaylist = null;
    this.previewingItem = null;
    this.loadPlaylists();
  }

  // --- Rename ---
  startEditName(): void {
    if (!this.selectedPlaylist) return;
    this.editNameValue = this.selectedPlaylist.name;
    this.editingName = true;
  }

  cancelEditName(): void {
    this.editingName = false;
  }

  saveName(): void {
    if (!this.selectedPlaylist || !this.editNameValue.trim()) return;
    this.playlistService.update(this.orgId, this.selectedPlaylist.id, { name: this.editNameValue.trim() }).subscribe({
      next: (updated) => {
        if (this.selectedPlaylist) {
          this.selectedPlaylist.name = updated.name;
        }
        this.editingName = false;
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to rename playlist.';
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
    if (!this.selectedPlaylist) return;
    const deletedId = this.selectedPlaylist.id;
    this.deleting = true;
    this.playlistService.delete(this.orgId, deletedId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.selectedPlaylist = null;
        this.previewingItem = null;
        if (this.defaultPlaylistId === deletedId) {
          this.defaultPlaylistId = null;
        }
        this.loadPlaylists();
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to delete playlist.';
        this.deleting = false;
        this.showDeleteConfirm = false;
      },
    });
  }

  // --- Set as Default ---
  toggleDefault(): void {
    if (!this.selectedPlaylist) return;
    this.settingDefault = true;
    const newDefault = this.isDefault ? null : this.selectedPlaylist.id;
    this.playlistService.setAsDefault(this.orgId, newDefault).subscribe({
      next: () => {
        this.defaultPlaylistId = newDefault;
        this.settingDefault = false;
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to set default playlist.';
        this.settingDefault = false;
      },
    });
  }

  // --- Add Content ---
  openAddContent(): void {
    this.showAddContent = true;
    this.contentFilter = undefined;
    this.contentLoading = true;
    this.contentService.getAll(this.orgId).subscribe({
      next: (content) => {
        this.availableContent = content;
        this.contentLoading = false;
      },
      error: () => {
        this.availableContent = [];
        this.contentLoading = false;
      },
    });
  }

  closeAddContent(): void {
    this.showAddContent = false;
  }

  addContentToPlaylist(content: Content): void {
    if (!this.selectedPlaylist) return;
    const defaultDuration = content.type === 'video' ? 30 : 10;
    this.playlistService.addItem(this.orgId, this.selectedPlaylist.id, {
      contentId: content.id,
      durationSeconds: defaultDuration,
    }).subscribe({
      next: () => {
        this.reloadPlaylist();
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to add item.';
      },
    });
  }

  // --- Remove Item ---
  removeItem(item: PlaylistItem): void {
    if (!this.selectedPlaylist) return;
    this.playlistService.removeItem(this.orgId, this.selectedPlaylist.id, item.id).subscribe({
      next: () => {
        if (this.previewingItem?.id === item.id) {
          this.previewingItem = null;
        }
        this.reloadPlaylist();
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to remove item.';
      },
    });
  }

  // --- Reorder ---
  onDrop(event: CdkDragDrop<PlaylistItem[]>): void {
    if (!this.selectedPlaylist || event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.selectedPlaylist.items, event.previousIndex, event.currentIndex);
    const itemIds = this.selectedPlaylist.items.map((i) => i.id);
    this.playlistService.reorderItems(this.orgId, this.selectedPlaylist.id, { itemIds }).subscribe({
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to reorder items.';
        this.reloadPlaylist();
      },
    });
  }

  // --- Duration Update ---
  updateItemDuration(item: PlaylistItem, value: number): void {
    if (value < 1) return;
    item.durationSeconds = value;

    // Debounce the API call
    const existing = this.durationTimers.get(item.id);
    if (existing) clearTimeout(existing);

    this.durationTimers.set(
      item.id,
      setTimeout(() => {
        if (!this.selectedPlaylist) return;
        // Remove and re-add with new duration (API doesn't have a patch-item endpoint)
        this.playlistService.removeItem(this.orgId, this.selectedPlaylist.id, item.id).subscribe({
          next: () => {
            if (!this.selectedPlaylist) return;
            this.playlistService.addItem(this.orgId, this.selectedPlaylist.id, {
              contentId: item.contentId,
              durationSeconds: value,
              position: item.position,
            }).subscribe({
              next: () => this.reloadPlaylist(),
              error: () => this.reloadPlaylist(),
            });
          },
        });
        this.durationTimers.delete(item.id);
      }, 800),
    );
  }

  // --- Preview ---
  previewItem(item: PlaylistItem): void {
    this.previewingItem = this.previewingItem?.id === item.id ? null : item;
  }

  closePreview(): void {
    this.previewingItem = null;
  }

  // --- Helpers ---
  private reloadPlaylist(): void {
    if (!this.selectedPlaylist) return;
    this.playlistService.getOne(this.orgId, this.selectedPlaylist.id).subscribe({
      next: (full) => {
        this.selectedPlaylist = full;
      },
    });
  }

  getThumbUrl(item: PlaylistItem): string {
    return `/api/content/${item.contentId}/file/transcoded`;
  }

  getPreviewUrl(item: PlaylistItem): string {
    return `/api/content/${item.contentId}/file/transcoded`;
  }

  getContentThumbUrl(content: Content): string {
    return `/api/content/${content.id}/file/transcoded`;
  }

  getPlaylistDuration(playlist: Playlist): number {
    if (!playlist.items) return 0;
    return playlist.items.reduce((sum, item) => sum + item.durationSeconds, 0);
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
