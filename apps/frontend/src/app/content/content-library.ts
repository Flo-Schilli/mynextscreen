import {
  Component,
  ElementRef,
  Renderer2,
  inject,
  AfterViewInit,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { ContentService, UploadProgress } from './content.service';
import { Content, StorageInfo, UploadItem } from './content.model';
import { ContentFilterService } from './content-filter.service';
import { ContentStorageBar } from './content-storage-bar';
import { ContentUploadProgress } from './content-upload-progress';
import { ContentGrid } from './content-grid';
import { ContentDetail, MetadataUpdate } from './content-detail';
import { ContentTagModal } from './content-tag-modal';
import { ContentPlaylistModal } from './content-playlist-modal';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';
import { BulkConfirmDialogComponent } from '../shared/selection/bulk-confirm-dialog';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import {
  PageHeaderComponent,
  BtnComponent,
  EmptyComponent,
  OverlayComponent,
  ModalComponent,
  IconComponent,
} from '../ui';

/**
 * Smart container for the content library. Owns data loading, upload/HTTP
 * orchestration, filter state, transcoding SSE updates, and the bulk-action
 * modal flows. The page itself is a drag & drop target (with a "Browse files"
 * header button); presentation is delegated to the storage-bar, upload-progress,
 * grid, and detail child components; pure logic lives in
 * {@link ContentFilterService} and {@link ContentFormatService}.
 */
@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [
    FormsModule,
    ContentStorageBar,
    ContentUploadProgress,
    ContentGrid,
    ContentDetail,
    ContentTagModal,
    ContentPlaylistModal,
    BulkConfirmDialogComponent,
    PageHeaderComponent,
    BtnComponent,
    EmptyComponent,
    OverlayComponent,
    ModalComponent,
    IconComponent,
  ],
  providers: [SelectionService],
  template: `
    <div class="page">
      <mns-page-header title="Content Library" icon="Image">
        @if (!selectedContent) {
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
          <input
            #browseInput
            type="file"
            multiple
            accept="image/*,video/*"
            (change)="onBrowse($event)"
            hidden
          />
          <mns-btn variant="primary" icon="Upload" (mnsClick)="browseInput.click()">
            Browse files
          </mns-btn>
        }
      </mns-page-header>

      <!-- Drag & drop overlay — spans the whole main content area -->
      @if (isDragOver && !selectedContent) {
        <div
          class="drag-overlay"
          [style.top.px]="overlayRect.top"
          [style.left.px]="overlayRect.left"
          [style.width.px]="overlayRect.width"
          [style.height.px]="overlayRect.height"
        >
          <div class="drag-overlay-card">
            <mns-icon name="Upload" [size]="40" />
            <p class="drag-overlay-title">Drop files to upload</p>
            <p class="drag-overlay-sub">Images and videos</p>
          </div>
        </div>
      }

      <!-- Storage Usage -->
      @if (storage && !selectedContent) {
        <app-content-storage-bar [storage]="storage" />
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

      <!-- Upload Progress -->
      @if (!selectedContent) {
        <app-content-upload-progress [uploads]="uploads" />
      }

      <!-- Content Detail View -->
      @if (selectedContent) {
        <app-content-detail
          [content]="selectedContent"
          [transcodingProgress]="transcodingProgress"
          [previewUrl]="getPreviewUrl"
          [savingMetadata]="savingMetadata"
          [metadataError]="metadataError"
          [metadataSaved]="metadataSaved"
          (save)="onDetailSave($event)"
          (remove)="confirmDelete()"
          (reupload)="onDetailReUpload($event)"
          (dismiss)="closeDetail()"
        />
      }

      <!-- Content Grid -->
      @if (!loading && !selectedContent && filteredContent.length > 0) {
        <app-content-grid
          [items]="filteredContent"
          [contentIds]="contentIds"
          [transcodingProgress]="transcodingProgress"
          [bulkActions]="bulkActions"
          [previewUrl]="getPreviewUrl"
          (selectItem)="selectContent($event)"
        />
      }

      @if (!loading && !selectedContent && filteredContent.length === 0 && !loadError) {
        <mns-empty
          icon="Image"
          title="No content yet"
          desc="Drag files anywhere onto this page or use Browse files to get started."
        />
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <mns-overlay (closed)="cancelDelete()">
          <mns-modal title="Delete Content" icon="Trash" (closed)="cancelDelete()">
            <p class="text-sm text-muted mb-4">
              Are you sure you want to delete
              <strong class="text-text">{{ selectedContent?.title }}</strong
              >? This will permanently remove the original and transcoded files.
            </p>
            <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
              <mns-btn variant="outline" (mnsClick)="cancelDelete()">Cancel</mns-btn>
              <mns-btn variant="danger" [disabled]="deleting" (mnsClick)="executeDelete()">
                {{ deleting ? 'Deleting…' : 'Delete' }}
              </mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
      }

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <app-bulk-confirm-dialog
          title="Delete Content"
          [message]="bulkDeleteMessage()"
          confirmLabel="Delete"
          [itemCount]="selectionService.count()"
          (confirmed)="onBulkDeleteConfirmed($event)"
        />
      }

      <!-- Tag Entry Modal -->
      @if (showTagModal) {
        <app-content-tag-modal
          [mode]="tagModalMode"
          [suggestions]="allTags"
          [(value)]="bulkTagInput"
          (confirm)="executeTagModal()"
          (dismiss)="cancelTagModal()"
        />
      }

      <!-- Playlist Picker Modal -->
      @if (showPlaylistModal) {
        <app-content-playlist-modal
          [playlists]="playlists"
          [loading]="playlistsLoading"
          [loadError]="playlistsLoadError"
          [(selectedId)]="selectedPlaylistId"
          (confirm)="executePlaylistModal()"
          (dismiss)="cancelPlaylistModal()"
        />
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }
    </div>
  `,
  styles: `
    /* Drag & drop overlay — positioned (fixed) over the whole main content
       area; its rect is taken from the host's <main class="content"> ancestor. */
    .drag-overlay {
      position: fixed;
      z-index: 20;
      display: grid;
      place-items: center;
      border-radius: 1rem;
      border: 2px dashed var(--accent);
      background: color-mix(in srgb, var(--surface) 82%, transparent);
      backdrop-filter: blur(2px);
      /* Let drag events pass through to the content area so the depth counter stays accurate */
      pointer-events: none;
    }
    .drag-overlay-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: var(--accent);
      text-align: center;
    }
    .drag-overlay-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      margin: 0.25rem 0 0;
    }
    .drag-overlay-sub {
      font-size: 0.8125rem;
      color: var(--text-faint);
      margin: 0;
    }

    /* Type Toggle — pill chips matching the reference filter row */
    .type-toggle {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 0.4375rem;
      padding: 0.5rem 0.875rem;
      border-radius: 99px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s,
        color 0.15s;
    }
    .toggle-btn.active {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }
    .toggle-btn:hover:not(.active) {
      border-color: var(--text-muted);
      color: var(--text);
    }

    /* Tag Filter */
    .tag-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .tag-chip {
      padding: 0.375rem 0.875rem;
      border-radius: 99px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        border-color 0.15s,
        background-color 0.15s,
        color 0.15s;
    }
    .tag-chip.active {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }
    .tag-chip.clear {
      background: none;
      border-color: var(--text-faint);
      color: var(--text-faint);
    }
    .tag-chip:hover:not(.active) {
      border-color: var(--text-muted);
      color: var(--text);
    }

    @media (prefers-reduced-motion: reduce) {
      .toggle-btn,
      .tag-chip {
        transition: none;
      }
    }
  `,
})
export class ContentLibrary implements OnInit, AfterViewInit, OnDestroy {
  private contentService = inject(ContentService);
  private contentFilter = inject(ContentFilterService);
  private memberService = inject(MemberService);
  private playlistService = inject(PlaylistService);
  private toast = inject(ToastService);
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

  // Upload
  uploads: UploadItem[] = [];

  // Drag & drop over the whole main content area. `dragDepth` counts nested
  // enter/leave pairs so the overlay does not flicker as the cursor moves over
  // child elements. The overlay rect mirrors the <main class="content">
  // ancestor so the drop zone spans the full content area, not just the
  // centered inner column.
  isDragOver = false;
  overlayRect = { top: 0, left: 0, width: 0, height: 0 };
  private dragDepth = 0;
  private contentEl: HTMLElement | null = null;
  private dragUnlisten: (() => void)[] = [];

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  // Detail view
  selectedContent: Content | null = null;
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

  ngAfterViewInit(): void {
    // The <main class="content"> ancestor lives in the app shell, so it can
    // only be resolved once this component is in the DOM. Binding here (rather
    // than in afterNextRender) keeps the listeners inside the Angular zone, so
    // toggling the overlay triggers change detection.
    this.attachContentDropZone();
  }

  ngOnDestroy(): void {
    for (const sub of this.sseSubs) sub.unsubscribe();
    for (const unlisten of this.dragUnlisten) unlisten();
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
    this.allTags = this.contentFilter.extractTags(this.contents);
  }

  private applyFilters(): void {
    this.filteredContent = this.contentFilter.filterContents(
      this.contents,
      this.filterType,
      this.filterTags,
    );
    this.contentIds = this.filteredContent.map((c) => c.id);
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

  // --- Drag & drop (whole main content area) ---
  /**
   * Binds the drag listeners to the host's `<main class="content">` ancestor so
   * the drop zone covers the full content area (including the outer padding and
   * the empty space below the content), not just the centered inner column.
   */
  private attachContentDropZone(): void {
    const content = this.el.nativeElement.closest('main.content') as HTMLElement | null;
    if (!content) return;
    this.contentEl = content;
    this.dragUnlisten = [
      this.renderer.listen(content, 'dragenter', (e: DragEvent) => this.onDragEnter(e)),
      this.renderer.listen(content, 'dragover', (e: DragEvent) => this.onDragOver(e)),
      this.renderer.listen(content, 'dragleave', (e: DragEvent) => this.onDragLeave(e)),
      this.renderer.listen(content, 'drop', (e: DragEvent) => this.onDrop(e)),
    ];
  }

  private updateOverlayRect(): void {
    if (!this.contentEl) return;
    const r = this.contentEl.getBoundingClientRect();
    this.overlayRect = { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  private isFileDrag(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  onDragEnter(event: DragEvent): void {
    if (this.selectedContent || !this.isFileDrag(event)) return;
    event.preventDefault();
    this.dragDepth++;
    this.updateOverlayRect();
    this.isDragOver = true;
  }

  onDragOver(event: DragEvent): void {
    if (this.selectedContent || !this.isFileDrag(event)) return;
    // Required so the element is a valid drop target.
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    if (this.selectedContent) return;
    event.preventDefault();
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    if (this.selectedContent) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFiles(Array.from(files));
    }
  }

  onBrowse(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  // --- Upload ---
  uploadFiles(files: File[]): void {
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
            this.toast.success('Upload complete.');
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
    this.metadataError = '';
    this.metadataSaved = false;
  }

  closeDetail(): void {
    this.selectedContent = null;
  }

  getPreviewUrl = (content: Content): string => {
    if (content.transcodingStatus === 'completed') {
      return this.contentService.getTranscodedUrl(content.id);
    }
    return this.contentService.getOriginalUrl(content.id);
  };

  // --- Metadata ---
  onDetailSave(update: MetadataUpdate): void {
    if (!this.selectedContent) return;
    this.savingMetadata = true;
    this.metadataError = '';
    this.metadataSaved = false;
    this.contentService
      .updateMetadata(this.orgId, this.selectedContent.id, {
        title: update.title,
        description: update.description,
        tags: update.tags,
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
          this.toast.success('Content updated.');
        },
        error: (err) => {
          this.metadataError = err.error?.message || 'Failed to save changes.';
          this.savingMetadata = false;
        },
      });
  }

  // --- Re-upload ---
  onDetailReUpload(file: File): void {
    if (!this.selectedContent) return;

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
          this.toast.success('Re-upload complete.');
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
        this.toast.success('Content deleted.');
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

  bulkDeleteMessage(): string {
    return (
      `You are about to permanently delete ${this.selectionService.count()} item(s). ` +
      'This will remove all original and transcoded files. This cannot be undone.'
    );
  }

  onBulkDeleteConfirmed(confirmed: boolean): void {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(confirmed);
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

  private showToast(message: string, type: 'error' | 'success' | 'warning'): void {
    // The global ToastService has no 'warning' level; surface those as 'info'.
    this.toast.show(type === 'warning' ? 'info' : type, message);
  }
}
