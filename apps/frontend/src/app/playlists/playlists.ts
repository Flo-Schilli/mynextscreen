import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { PlaylistService } from './playlist.service';
import { Playlist, PlaylistItem, TransitionType } from './playlist.model';
import { PlaylistCreateForm } from './playlist-create-form';
import { PlaylistEditor } from './playlist-editor';
import { PlaylistGrid } from './playlist-grid';
import { PlaylistAddContentModal } from './playlist-add-content-modal';
import { PlaylistAssignScreenModal } from './playlist-assign-screen-modal';
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';
import { BulkConfirmDialogComponent } from '../shared/selection/bulk-confirm-dialog';

/**
 * Smart container for the playlists feature. Owns data loading, all HTTP
 * orchestration (create/rename/delete/default, add/remove/reorder items with
 * debounced field PATCHes), bulk-action flows, and toast state. Presentation is
 * delegated to the create-form, editor, grid, and modal children; pure
 * formatting lives in {@link PlaylistFormatService}.
 */
@Component({
  selector: 'app-playlists',
  standalone: true,
  imports: [
    PlaylistCreateForm,
    PlaylistEditor,
    PlaylistGrid,
    PlaylistAddContentModal,
    PlaylistAssignScreenModal,
    BulkConfirmDialogComponent,
  ],
  providers: [SelectionService],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Playlists</h1>
        </div>
        @if (!loading && !selectedPlaylist && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">+ Create Playlist</button>
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
        <app-playlist-create-form
          [(name)]="createName"
          [error]="createError"
          [creating]="creating"
          (create)="submitCreate()"
          (dismiss)="cancelCreate()"
        />
      }

      <!-- Playlist Detail / Editor View -->
      @if (selectedPlaylist) {
        <app-playlist-editor
          [playlist]="selectedPlaylist"
          [isOrgAdmin]="isOrgAdmin"
          [isDefault]="isDefault"
          [settingDefault]="settingDefault"
          [editorError]="editorError"
          [previewingItem]="previewingItem"
          [thumbUrl]="getThumbUrl"
          [previewUrl]="getPreviewUrl"
          (rename)="onRename($event)"
          (toggleDefault)="toggleDefault()"
          (deletePlaylist)="confirmDelete()"
          (dismiss)="closeDetail()"
          (addContent)="openAddContent()"
          (removeItem)="removeItem($event)"
          (reorder)="onDrop($event)"
          (durationChange)="updateItemDuration($event.item, $event.value)"
          (transitionChange)="updateItemTransition($event.item, $event.value)"
          (transitionDurationChange)="updateItemTransitionDuration($event.item, $event.value)"
          (previewItem)="previewItem($event)"
          (closePreview)="closePreview()"
        />
      }

      <!-- Playlist Grid -->
      @if (!loading && !selectedPlaylist && !showCreateForm && playlists.length > 0) {
        <app-playlist-grid
          [playlists]="playlists"
          [playlistIds]="playlistIds"
          [defaultPlaylistId]="defaultPlaylistId"
          [bulkActions]="bulkActions"
          (selectItem)="selectPlaylist($event)"
        />
      }

      @if (
        !loading && !selectedPlaylist && !showCreateForm && playlists.length === 0 && !loadError
      ) {
        <div class="empty-state">
          <p class="empty-text">No playlists created yet.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">
            Create Your First Playlist
          </button>
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
            <h2>Delete Playlist</h2>
            <p>
              Are you sure you want to delete <strong>{{ selectedPlaylist?.name }}</strong
              >? This action cannot be undone.
            </p>
            @if (selectedPlaylist?.id === defaultPlaylistId) {
              <p class="warning-text">
                This playlist is currently set as the organisation's default. Deleting it will clear
                the default playlist setting.
              </p>
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
        <app-playlist-add-content-modal
          [availableContent]="availableContent"
          [loading]="contentLoading"
          [thumbUrl]="getContentThumbUrl"
          (selectContent)="addContentToPlaylist($event)"
          (dismiss)="closeAddContent()"
        />
      }

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <app-bulk-confirm-dialog
          title="Delete Playlists"
          [message]="bulkDeleteMessage()"
          confirmLabel="Delete"
          [itemCount]="selectionService.count()"
          (confirmed)="onBulkDeleteConfirmed($event)"
        />
      }

      <!-- Assign to Screen(s) Modal -->
      @if (showAssignScreenModal) {
        <app-playlist-assign-screen-modal
          [screens]="availableScreens"
          [loading]="screensLoading"
          [loadError]="screensLoadError"
          [count]="selectionService.count()"
          [(selectedScreenId)]="selectedScreenId"
          (confirm)="executeAssignScreen()"
          (dismiss)="cancelAssignScreen()"
        />
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
    /* Extra bottom padding for sticky bulk-action bar */
    .page {
      padding-bottom: 5rem;
    }

    .warning-text {
      color: #fbbf24 !important;
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      font-size: 0.8125rem !important;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.75rem 1.25rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      z-index: 2000;
      animation: toast-in 0.3s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }
    .toast-error {
      background: #991b1b;
      color: #fecaca;
      border: 1px solid #b91c1c;
    }
    .toast-success {
      background: #166534;
      color: #bbf7d0;
      border: 1px solid #22c55e;
    }
    .toast-warning {
      background: #92400e;
      color: #fef3c7;
      border: 1px solid #d97706;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
})
export class Playlists implements OnInit {
  private playlistService = inject(PlaylistService);
  private contentService = inject(ContentService);
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private organisationService = inject(OrganisationService);
  private router = inject(Router);
  readonly selectionService = inject(SelectionService);

  orgId = '';
  userRole = '';
  playlists: Playlist[] = [];
  playlistIds: string[] = [];
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

  // Delete
  showDeleteConfirm = false;
  deleting = false;

  // Set as Default
  settingDefault = false;

  // Add content modal
  showAddContent = false;
  availableContent: Content[] = [];
  contentLoading = false;

  // Preview
  previewingItem: PlaylistItem | null = null;

  // Debounce timers for item field updates
  private durationTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Bulk delete confirmation
  showBulkDeleteConfirm = false;
  private bulkDeleteResolve: ((value: boolean) => void) | null = null;

  // Assign to screen modal
  showAssignScreenModal = false;
  availableScreens: Screen[] = [];
  selectedScreenId = '';
  screensLoading = false;
  screensLoadError = '';
  private assignScreenResolve: ((value: boolean) => void) | null = null;

  // Toast
  toastMessage = '';
  toastType: 'error' | 'success' | 'warning' = 'success';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Bulk actions
  bulkActions: BulkAction[] = [
    {
      label: 'Delete selected',
      variant: 'danger',
      handler: () => this.handleBulkDelete(),
    },
    {
      label: 'Assign to screen(s)',
      variant: 'default',
      handler: () => this.handleBulkAssignScreen(),
    },
  ];

  get isOrgAdmin(): boolean {
    return this.userRole === 'org_admin';
  }

  get isDefault(): boolean {
    return this.selectedPlaylist?.id === this.defaultPlaylistId;
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
        this.playlistIds = playlists.map((p) => p.id);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? 'Access denied.' : 'Failed to load playlists.';
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
  onRename(name: string): void {
    if (!this.selectedPlaylist) return;
    this.playlistService.update(this.orgId, this.selectedPlaylist.id, { name }).subscribe({
      next: (updated) => {
        if (this.selectedPlaylist) {
          this.selectedPlaylist.name = updated.name;
        }
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
    const defaultDuration = content.type === 'video' ? (content.durationSeconds ?? 30) : 10;
    this.playlistService
      .addItem(this.orgId, this.selectedPlaylist.id, {
        contentId: content.id,
        durationSeconds: defaultDuration,
        transition: 'fade',
        transitionDurationMs: 500,
      })
      .subscribe({
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

  // --- Item Field Updates (debounced PATCH) ---
  private debouncedPatchItem(item: PlaylistItem, patch: Record<string, unknown>): void {
    const key = item.id;
    const existing = this.durationTimers.get(key);
    if (existing) clearTimeout(existing);

    this.durationTimers.set(
      key,
      setTimeout(() => {
        if (!this.selectedPlaylist) return;
        this.playlistService
          .updateItem(this.orgId, this.selectedPlaylist.id, item.id, patch)
          .subscribe({
            next: () => this.reloadPlaylist(),
            error: () => this.reloadPlaylist(),
          });
        this.durationTimers.delete(key);
      }, 800),
    );
  }

  updateItemDuration(item: PlaylistItem, value: number): void {
    if (value < 1) return;
    item.durationSeconds = value;
    this.debouncedPatchItem(item, { durationSeconds: value });
  }

  updateItemTransition(item: PlaylistItem, value: TransitionType): void {
    item.transition = value;
    this.debouncedPatchItem(item, { transition: value });
  }

  updateItemTransitionDuration(item: PlaylistItem, value: number): void {
    if (value < 0 || value > 3000) return;
    item.transitionDurationMs = value;
    this.debouncedPatchItem(item, { transitionDurationMs: value });
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

  getThumbUrl = (item: PlaylistItem): string => {
    return this.contentService.getTranscodedUrl(item.contentId);
  };

  getPreviewUrl = (item: PlaylistItem): string => {
    return this.contentService.getTranscodedUrl(item.contentId);
  };

  getContentThumbUrl = (content: Content): string => {
    return this.contentService.getTranscodedUrl(content.id);
  };

  // --- Bulk Delete ---
  async handleBulkDelete(): Promise<void> {
    const confirmed = await this.openBulkDeleteConfirm();
    if (!confirmed) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.playlistService.bulkDelete(this.orgId, ids));

    this.showToast(`${result.deleted} playlist(s) deleted`, 'success');
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
    }
    this.loadPlaylists();
  }

  private openBulkDeleteConfirm(): Promise<boolean> {
    this.showBulkDeleteConfirm = true;
    return new Promise<boolean>((resolve) => {
      this.bulkDeleteResolve = resolve;
    });
  }

  bulkDeleteMessage(): string {
    return (
      `You are about to permanently delete ${this.selectionService.count()} playlist(s). ` +
      'This cannot be undone.'
    );
  }

  onBulkDeleteConfirmed(confirmed: boolean): void {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(confirmed);
    this.bulkDeleteResolve = null;
  }

  // --- Bulk Assign to Screen ---
  async handleBulkAssignScreen(): Promise<void> {
    const confirmed = await this.openAssignScreenModal();
    if (!confirmed) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(
      this.playlistService.bulkAssignScreen(this.orgId, ids, this.selectedScreenId),
    );

    const screenName =
      this.availableScreens.find((s) => s.id === this.selectedScreenId)?.name ?? 'selected screen';
    this.showToast(`${result.assigned} playlist(s) assigned to ${screenName}`, 'success');
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
    }
    this.loadPlaylists();
  }

  private openAssignScreenModal(): Promise<boolean> {
    this.showAssignScreenModal = true;
    this.selectedScreenId = '';
    this.screensLoadError = '';
    this.screensLoading = true;
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.availableScreens = screens;
        this.screensLoading = false;
      },
      error: () => {
        this.screensLoadError = 'Failed to load screens.';
        this.screensLoading = false;
      },
    });
    return new Promise<boolean>((resolve) => {
      this.assignScreenResolve = resolve;
    });
  }

  cancelAssignScreen(): void {
    this.showAssignScreenModal = false;
    this.assignScreenResolve?.(false);
    this.assignScreenResolve = null;
  }

  executeAssignScreen(): void {
    this.showAssignScreenModal = false;
    this.assignScreenResolve?.(true);
    this.assignScreenResolve = null;
  }

  // --- Toast ---
  showToast(message: string, type: 'error' | 'success' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
