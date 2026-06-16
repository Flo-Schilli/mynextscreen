import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ToastService } from '../shared/toast/toast.service';
import {
  PageHeaderComponent,
  BtnComponent,
  EmptyComponent,
  OverlayComponent,
  ModalComponent,
} from '../ui';

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
    PageHeaderComponent,
    BtnComponent,
    EmptyComponent,
    OverlayComponent,
    ModalComponent,
  ],
  providers: [SelectionService],
  template: `
    <div class="page">
      <mns-page-header title="Playlists" [sub]="playlistCountLabel()" icon="Playlists">
        @if (!loading && !selectedPlaylist && !showCreateForm) {
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()"
            >New playlist</mns-btn
          >
        }
      </mns-page-header>

      @if (loadError) {
        <p class="text-offline text-sm mt-3">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="text-muted text-sm mt-3">Loading playlists…</p>
      }

      <!-- Create Playlist Modal -->
      @if (showCreateForm) {
        <app-playlist-create-form
          [(name)]="createName"
          [(color)]="createColor"
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
          (colorChange)="onColorChange($event)"
          (toggleDefault)="toggleDefault()"
          (deletePlaylist)="confirmDelete()"
          (copyLink)="copyShareLink()"
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
          [thumbUrl]="getThumbUrl"
          (selectItem)="selectPlaylist($event)"
          (deletePlaylist)="requestDeleteFromGrid($event)"
        />
      }

      @if (
        !loading && !selectedPlaylist && !showCreateForm && playlists.length === 0 && !loadError
      ) {
        <mns-empty icon="Playlists" title="No playlists yet" desc="No playlists created yet.">
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()"
            >Create Your First Playlist</mns-btn
          >
        </mns-empty>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <mns-overlay (closed)="cancelDelete()">
          <mns-modal title="Delete Playlist" icon="Trash" (closed)="cancelDelete()">
            <p class="text-sm text-muted mb-3">
              Are you sure you want to delete
              <strong class="text-text">{{ selectedPlaylist?.name }}</strong
              >? This action cannot be undone.
            </p>
            @if (selectedPlaylist?.id === defaultPlaylistId) {
              <p class="warning-text mb-3">
                This playlist is currently set as the organisation's default. Deleting it will clear
                the default playlist setting.
              </p>
            }
            <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
              <mns-btn variant="outline" (mnsClick)="cancelDelete()">Cancel</mns-btn>
              <mns-btn variant="danger" [disabled]="deleting" (mnsClick)="executeDelete()">
                {{ deleting ? 'Deleting…' : 'Delete' }}
              </mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
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
    </div>
  `,
  styles: `
    /* Extra bottom padding for sticky bulk-action bar */
    .page {
      padding-bottom: 5rem;
    }

    .warning-text {
      color: var(--warn);
      background: var(--warn-dim);
      border: 1px solid var(--warn);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: 0.8125rem;
    }
  `,
})
export class Playlists implements OnInit {
  private playlistService = inject(PlaylistService);
  private contentService = inject(ContentService);
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private organisationService = inject(OrganisationService);
  readonly selectionService = inject(SelectionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  /** Playlist id currently loaded/loading — guards duplicate route-driven loads. */
  private loadedDetailId: string | null = null;

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
  createColor = '#6d6cf6';
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
        this.watchRoute();
      },
      error: () => {
        this.loadError = 'Failed to load organisation context.';
        this.loading = false;
      },
    });
  }

  /**
   * Keeps the open playlist in sync with the URL so `/playlists/:id` deeplinks
   * (and browser back/forward) work and can be shared. Loads triggered from a
   * card click are skipped here via {@link loadedDetailId} to avoid a double
   * fetch.
   */
  private watchRoute(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        if (id !== this.loadedDetailId) this.loadDetail(id);
      } else {
        this.loadedDetailId = null;
        this.selectedPlaylist = null;
        this.previewingItem = null;
      }
    });
  }

  private loadDetail(id: string): void {
    this.editorError = '';
    this.previewingItem = null;
    this.loadedDetailId = id;
    this.playlistService.getOne(this.orgId, id).subscribe({
      next: (full) => {
        this.selectedPlaylist = full;
      },
      error: () => {
        this.editorError = 'Failed to load playlist details.';
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

  playlistCountLabel(): string {
    const n = this.playlists.length;
    return `${n} playlist${n !== 1 ? 's' : ''}`;
  }

  // --- Create ---
  openCreateForm(): void {
    this.createName = '';
    this.createColor = '#6d6cf6';
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
    this.playlistService
      .create(this.orgId, { name: this.createName.trim(), color: this.createColor })
      .subscribe({
        next: (playlist) => {
          this.creating = false;
          this.showCreateForm = false;
          this.loadPlaylists();
          this.selectPlaylist(playlist);
          this.toast.success('Playlist created.');
        },
        error: (err) => {
          this.createError = err.error?.message || 'Failed to create playlist.';
          this.creating = false;
        },
      });
  }

  // --- Detail ---
  selectPlaylist(playlist: Playlist): void {
    // Load immediately for a snappy click, then reflect it in the URL so the
    // detail view can be bookmarked/shared. The route guard skips re-fetching.
    this.loadDetail(playlist.id);
    void this.router.navigate(['/playlists', playlist.id]);
  }

  async copyShareLink(): Promise<void> {
    if (!this.selectedPlaylist) return;
    const url = `${window.location.origin}/playlists/${this.selectedPlaylist.id}`;
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Link copied to clipboard.');
    } catch {
      this.toast.error('Could not copy link.');
    }
  }

  closeDetail(): void {
    this.loadedDetailId = null;
    this.selectedPlaylist = null;
    this.previewingItem = null;
    this.loadPlaylists();
    void this.router.navigate(['/playlists']);
  }

  // --- Rename ---
  onRename(name: string): void {
    if (!this.selectedPlaylist) return;
    this.playlistService
      .update(this.orgId, this.selectedPlaylist.id, { name, color: this.selectedPlaylist.color })
      .subscribe({
        next: (updated) => {
          if (this.selectedPlaylist) {
            this.selectedPlaylist = { ...this.selectedPlaylist, name: updated.name };
          }
          this.toast.success('Playlist renamed.');
        },
        error: (err) => {
          this.editorError = err.error?.message || 'Failed to rename playlist.';
        },
      });
  }

  // --- Accent colour ---
  onColorChange(color: string): void {
    if (!this.selectedPlaylist) return;
    const name = this.selectedPlaylist.name;
    this.playlistService.update(this.orgId, this.selectedPlaylist.id, { name, color }).subscribe({
      next: (updated) => {
        if (this.selectedPlaylist) {
          this.selectedPlaylist = { ...this.selectedPlaylist, color: updated.color };
        }
        this.toast.success('Accent colour updated.');
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to update colour.';
      },
    });
  }

  // --- Delete from grid dots-menu ---
  requestDeleteFromGrid(playlist: Playlist): void {
    this.selectedPlaylist = playlist;
    this.showDeleteConfirm = true;
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
        const wasOpen = this.loadedDetailId === deletedId;
        this.loadedDetailId = null;
        this.selectedPlaylist = null;
        this.previewingItem = null;
        if (this.defaultPlaylistId === deletedId) {
          this.defaultPlaylistId = null;
        }
        this.loadPlaylists();
        // If the deleted playlist was the one open via deeplink, drop its id from the URL.
        if (wasOpen) void this.router.navigate(['/playlists']);
        this.toast.success('Playlist deleted.');
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
        this.toast.success(newDefault ? 'Set as default playlist.' : 'Default playlist cleared.');
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
          this.toast.success('Item added to playlist.');
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
        this.toast.success('Item removed from playlist.');
      },
      error: (err) => {
        this.editorError = err.error?.message || 'Failed to remove item.';
      },
    });
  }

  // --- Reorder ---
  onDrop(event: CdkDragDrop<PlaylistItem[]>): void {
    if (!this.selectedPlaylist || event.previousIndex === event.currentIndex) return;
    // Reorder on a fresh array + object reference so the OnPush editor and its
    // loop preview pick up the new order (in-place mutation wouldn't emit).
    const items = [...this.selectedPlaylist.items];
    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.selectedPlaylist = { ...this.selectedPlaylist, items };
    const itemIds = items.map((i) => i.id);
    this.playlistService.reorderItems(this.orgId, this.selectedPlaylist.id, { itemIds }).subscribe({
      next: () => {
        this.toast.success('Playlist order saved.');
      },
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

  /** Still-image thumbnail for sequence/strip tiles, or null to show a placeholder. */
  getThumbUrl = (item: PlaylistItem): string | null => {
    const c = item.content;
    if (!c) return null;
    return this.contentService.getStaticThumbnailUrl({
      id: c.id,
      type: c.type,
      thumbnailSizeBytes: c.thumbnailSizeBytes,
    });
  };

  /** Full-resolution media URL for playback/large preview (loop preview, inline preview). */
  getPreviewUrl = (item: PlaylistItem): string => {
    return this.contentService.getTranscodedUrl(item.contentId);
  };

  getContentThumbUrl = (content: Content): string | null => {
    return this.contentService.getStaticThumbnailUrl(content);
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
  private showToast(message: string, type: 'error' | 'success' | 'warning'): void {
    // The global ToastService has no 'warning' variant; surface those as info.
    this.toast.show(type === 'warning' ? 'info' : type, message);
  }
}
