import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { PlaylistService } from './playlist.service';
import {
  AddPlaylistItemRequest,
  Playlist,
  PlaylistItem,
  PlaylistKind,
  PlaylistRule,
  TransitionType,
  UpdateAllPlaylistItemsRequest,
  UpdatePlaylistItemRequest,
} from './playlist.model';
import { PlaylistCreateForm } from './playlist-create-form';
import { defaultRuleForm, toRule } from './playlist-rule-form';
import { PlaylistEditor } from './playlist-editor';
import { PlaylistGrid } from './playlist-grid';
import { PlaylistAddContentModal } from './playlist-add-content-modal';
import { PlaylistAssignScreenModal } from './playlist-assign-screen-modal';
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';
import { ContentSourceService } from '../sources/content-source.service';
import { ContentSource, SlideFormat } from '../sources/content-source.model';
import { apiErrorMessage } from '../sources/source-form-state';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';
import { SelectionService } from '../shared/selection/selection.service';
import { BulkAction } from '../shared/selection/bulk-action-toolbar';
import { BulkConfirmDialogComponent } from '../shared/selection/bulk-confirm-dialog';
import { ToastService } from '../shared/toast/toast.service';
import { DashboardSseService, DashboardEvent } from '../dashboard/dashboard-sse.service';
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
/** Images default to 10 s; a video plays its own length, 30 s while unknown. */
function defaultItemDuration(content: Content): number {
  return content.type === 'video' ? (content.durationSeconds ?? 30) : 10;
}

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
    TranslocoDirective,
  ],
  providers: [SelectionService],
  template: `
    <div class="page" *transloco="let t">
      <mns-page-header
        [title]="t('playlists.list.title')"
        [sub]="playlistCountLabel()"
        icon="Playlists"
      >
        @if (!loading && !selectedPlaylist && !showCreateForm) {
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">{{
            t('playlists.list.newPlaylist')
          }}</mns-btn>
        }
      </mns-page-header>

      @if (loadError) {
        <p class="text-offline text-sm mt-3">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="text-muted text-sm mt-3">{{ t('playlists.list.loading') }}</p>
      }

      <!-- Create Playlist Modal -->
      @if (showCreateForm) {
        <app-playlist-create-form
          [(name)]="createName"
          [(color)]="createColor"
          [(kind)]="createKind"
          [(sourceIds)]="createSourceIds"
          [(format)]="createFormat"
          [sources]="availableSources"
          [sourcesLoading]="sourcesLoading"
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
          [canEdit]="canEdit"
          [orgId]="orgId"
          [savingRule]="savingRule"
          [isDefault]="isDefault"
          [settingDefault]="settingDefault"
          [editorError]="editorError"
          [previewingItem]="previewingItem"
          [reslicing]="selectedPlaylist.id === reslicingPlaylistId"
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
          (applyToAll)="applyToAllItems($event)"
          (previewItem)="previewItem($event)"
          (saveRule)="saveRule($event)"
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
        <mns-empty
          icon="Playlists"
          [title]="t('playlists.list.emptyTitle')"
          [desc]="t('playlists.list.emptyDesc')"
        >
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">{{
            t('playlists.list.createFirst')
          }}</mns-btn>
        </mns-empty>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <mns-overlay (closed)="cancelDelete()">
          <mns-modal [title]="t('playlists.delete.title')" icon="Trash" (closed)="cancelDelete()">
            <p class="text-sm text-muted mb-3">
              {{ t('playlists.delete.confirmPrefix') }}
              <strong class="text-text">{{ selectedPlaylist?.name }}</strong
              >{{ t('playlists.delete.confirmSuffix') }}
            </p>
            @if (selectedPlaylist?.id === defaultPlaylistId) {
              <p class="warning-text mb-3">
                {{ t('playlists.delete.defaultWarning') }}
              </p>
            }
            <div slot="footer" class="flex justify-end gap-2 px-6 pb-5">
              <mns-btn variant="outline" (mnsClick)="cancelDelete()">{{
                t('common.actions.cancel')
              }}</mns-btn>
              <mns-btn variant="danger" [disabled]="deleting" (mnsClick)="executeDelete()">
                {{ deleting ? t('common.actions.deleting') : t('common.actions.delete') }}
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
          (addSelected)="addContentsToPlaylist($event)"
          (dismiss)="closeAddContent()"
        />
      }

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <app-bulk-confirm-dialog
          [title]="t('playlists.bulk.deleteTitle')"
          [message]="bulkDeleteMessage()"
          [confirmLabel]="t('common.actions.delete')"
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    /* Extra bottom padding for sticky bulk-action bar */
    .page {
      padding-bottom: 5rem;
    }

    .warning-text {
      color: var(--color-warn);
      background: var(--warn-dim);
      border: 1px solid var(--color-warn);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      font-size: 0.8125rem;
    }
  `,
})
export class Playlists implements OnInit {
  private playlistService = inject(PlaylistService);
  private contentService = inject(ContentService);
  private contentSourceService = inject(ContentSourceService);
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private organisationService = inject(OrganisationService);
  readonly selectionService = inject(SelectionService);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private sse = inject(DashboardSseService);

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
  createKind: PlaylistKind = 'static';
  createSourceIds: string[] = [];
  createFormat: SlideFormat | '' = '';
  availableSources: ContentSource[] = [];
  sourcesLoading = false;

  // Rule of a dynamic playlist
  savingRule = false;

  // Detail / editor
  selectedPlaylist: Playlist | null = null;
  editorError = '';
  /** Playlist id whose split-group wall is currently (re)slicing, or null. */
  reslicingPlaylistId: string | null = null;

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

  // Debounce timers for item field updates, plus the fields each pending
  // PATCH has collected so far (so a second field edit within the window does
  // not drop the first one).
  private durationTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingItemPatches = new Map<string, UpdatePlaylistItemRequest>();

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
  get bulkActions(): BulkAction[] {
    return [
      {
        label: this.transloco.translate('playlists.bulk.deleteSelected'),
        variant: 'danger',
        handler: () => this.handleBulkDelete(),
      },
      {
        label: this.transloco.translate('playlists.bulk.assignToScreen'),
        variant: 'default',
        handler: () => this.handleBulkAssignScreen(),
      },
    ];
  }

  get isOrgAdmin(): boolean {
    return this.userRole === 'org_admin';
  }

  /** Viewers may look, but the backend rejects their writes. */
  get canEdit(): boolean {
    return this.userRole === 'org_admin' || this.userRole === 'editor';
  }

  get isDefault(): boolean {
    return this.selectedPlaylist?.id === this.defaultPlaylistId;
  }

  ngOnInit(): void {
    this.loadCurrentOrg();
    this.subscribeToSlicing();
  }

  /**
   * Reflects split-group wall (re)slicing of the open playlist as a transient
   * "Re-rendering video wall…" badge. The durable, reload-safe view lives on the
   * screen-group detail; here we only surface the live moment of an edit.
   */
  private subscribeToSlicing(): void {
    this.sse.sliceProgress$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.reslicingPlaylistId = event.data['playlistId'] as string;
    });
    const clear = (event: DashboardEvent): void => {
      if (this.reslicingPlaylistId === event.data['playlistId']) {
        this.reslicingPlaylistId = null;
      }
    };
    this.sse.sliceComplete$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(clear);
    this.sse.sliceFailed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(clear);
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
          this.loadError = this.transloco.translate('common.errors.noOrgMembership');
          this.loading = false;
          return;
        }
        this.loadPlaylists();
        this.loadDefaultPlaylist();
        this.watchRoute();
      },
      error: () => {
        this.loadError = this.transloco.translate('common.errors.loadOrgContext');
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
        this.editorError = this.transloco.translate('playlists.errors.loadDetails');
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
        this.loadError =
          err.status === 403
            ? this.transloco.translate('playlists.errors.accessDenied')
            : this.transloco.translate('playlists.errors.loadPlaylists');
        this.loading = false;
      },
    });
  }

  playlistCountLabel(): string {
    return this.transloco.translate('playlists.list.count', { count: this.playlists.length });
  }

  // --- Create ---
  openCreateForm(): void {
    this.createName = '';
    this.createColor = '#6d6cf6';
    this.createError = '';
    this.createKind = 'static';
    this.createSourceIds = [];
    this.createFormat = '';
    this.showCreateForm = true;
    this.loadSources();
  }

  /** Sources a dynamic playlist can be created from; a failure just leaves the list empty. */
  private loadSources(): void {
    this.sourcesLoading = true;
    this.contentSourceService.getAll(this.orgId).subscribe({
      next: (sources) => {
        this.availableSources = sources;
        this.sourcesLoading = false;
      },
      error: () => {
        this.availableSources = [];
        this.sourcesLoading = false;
      },
    });
  }

  /** The starting rule of a new dynamic playlist: its sources and format, defaults otherwise. */
  private initialRule(): PlaylistRule | null {
    if (this.createSourceIds.length === 0) {
      this.createError = this.transloco.translate('playlists.create.sourcesRequired');
      return null;
    }
    const rule = toRule({
      ...defaultRuleForm(),
      sourceIds: this.createSourceIds,
      format: this.createFormat,
    });
    if (!rule) {
      this.createError = this.transloco.translate('playlists.create.formatRequired');
    }
    return rule;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(): void {
    if (!this.createName.trim()) {
      this.createError = this.transloco.translate('playlists.errors.nameRequired');
      return;
    }

    this.createError = '';
    const rule = this.createKind === 'dynamic' ? this.initialRule() : null;
    if (this.createKind === 'dynamic' && !rule) return;

    this.creating = true;
    this.playlistService
      .create(this.orgId, {
        name: this.createName.trim(),
        color: this.createColor,
        ...(rule ? { kind: 'dynamic' as const, rule } : {}),
      })
      .subscribe({
        next: (playlist) => {
          this.creating = false;
          this.showCreateForm = false;
          this.loadPlaylists();
          this.selectPlaylist(playlist);
          this.toast.success(this.transloco.translate('playlists.toast.created'));
        },
        error: (err) => {
          this.createError =
            err.error?.message || this.transloco.translate('playlists.errors.createPlaylist');
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
      this.toast.success(this.transloco.translate('playlists.toast.linkCopied'));
    } catch {
      this.toast.error(this.transloco.translate('playlists.toast.linkCopyFailed'));
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
          this.toast.success(this.transloco.translate('playlists.toast.renamed'));
        },
        error: (err) => {
          this.editorError =
            err.error?.message || this.transloco.translate('playlists.errors.renamePlaylist');
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
        this.toast.success(this.transloco.translate('playlists.toast.colorUpdated'));
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.updateColor');
      },
    });
  }

  // --- Rule of a dynamic playlist ---
  saveRule(rule: PlaylistRule): void {
    if (!this.selectedPlaylist) return;
    this.savingRule = true;
    this.editorError = '';
    this.playlistService.updateRule(this.orgId, this.selectedPlaylist.id, rule).subscribe({
      next: (updated) => {
        this.savingRule = false;
        this.selectedPlaylist = updated;
        this.toast.success(this.transloco.translate('playlists.toast.ruleSaved'));
      },
      error: (err: unknown) => {
        this.savingRule = false;
        const missing = (err as { error?: { missingIds?: unknown } }).error?.missingIds;
        this.editorError = Array.isArray(missing)
          ? this.transloco.translate('playlists.rule.errors.sourcesMissing')
          : apiErrorMessage(err, this.transloco.translate('playlists.rule.errors.saveFailed'));
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
        this.toast.success(this.transloco.translate('playlists.toast.deleted'));
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.deletePlaylist');
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
        this.toast.success(
          this.transloco.translate(
            newDefault ? 'playlists.toast.setDefault' : 'playlists.toast.clearedDefault',
          ),
        );
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.setDefault');
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

  /** Appends the picked content in click order, in one request. */
  addContentsToPlaylist(contents: Content[]): void {
    if (!this.selectedPlaylist || contents.length === 0) return;
    const items: AddPlaylistItemRequest[] = contents.map((content) => ({
      contentId: content.id,
      durationSeconds: defaultItemDuration(content),
      transition: 'fade',
      transitionDurationMs: 500,
    }));
    this.playlistService.addItems(this.orgId, this.selectedPlaylist.id, items).subscribe({
      next: (saved) => {
        this.showAddContent = false;
        this.reloadPlaylist();
        this.toast.success(
          this.transloco.translate('playlists.toast.itemsAdded', { count: saved.length }),
        );
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.addItem');
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
        this.toast.success(this.transloco.translate('playlists.toast.itemRemoved'));
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.removeItem');
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
        this.toast.success(this.transloco.translate('playlists.toast.orderSaved'));
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.reorderItems');
        this.reloadPlaylist();
      },
    });
  }

  // --- Item Field Updates (debounced PATCH) ---
  private debouncedPatchItem(item: PlaylistItem, patch: UpdatePlaylistItemRequest): void {
    const key = item.id;
    const existing = this.durationTimers.get(key);
    if (existing) clearTimeout(existing);
    this.pendingItemPatches.set(key, { ...this.pendingItemPatches.get(key), ...patch });

    this.durationTimers.set(
      key,
      setTimeout(() => {
        const collected = this.pendingItemPatches.get(key) ?? {};
        this.durationTimers.delete(key);
        this.pendingItemPatches.delete(key);
        if (!this.selectedPlaylist) return;
        this.playlistService
          .updateItem(this.orgId, this.selectedPlaylist.id, item.id, collected)
          .subscribe({
            next: () => this.reloadPlaylist(),
            error: () => this.reloadPlaylist(),
          });
      }, 800),
    );
  }

  /** Drops every pending per-item PATCH, so it cannot overwrite a newer bulk update. */
  private cancelPendingItemPatches(): void {
    this.durationTimers.forEach((timer) => clearTimeout(timer));
    this.durationTimers.clear();
    this.pendingItemPatches.clear();
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

  // --- Apply to all items ---
  applyToAllItems(patch: UpdateAllPlaylistItemsRequest): void {
    if (!this.selectedPlaylist) return;
    this.cancelPendingItemPatches();
    this.playlistService.updateAllItems(this.orgId, this.selectedPlaylist.id, patch).subscribe({
      next: ({ updated }) => {
        this.reloadPlaylist();
        this.toast.success(
          this.transloco.translate('playlists.toast.appliedToAll', { count: updated }),
        );
      },
      error: (err) => {
        this.editorError =
          err.error?.message || this.transloco.translate('playlists.errors.applyToAll');
        this.reloadPlaylist();
      },
    });
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

    this.showToast(
      this.transloco.translate('playlists.bulk.deleted', { count: result.deleted }),
      'success',
    );
    if (result.notFound.length > 0) {
      this.showToast(
        this.transloco.translate('playlists.bulk.notFound', { count: result.notFound.length }),
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
    return this.transloco.translate('playlists.bulk.deleteMessage', {
      count: this.selectionService.count(),
    });
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
      this.availableScreens.find((s) => s.id === this.selectedScreenId)?.name ??
      this.transloco.translate('playlists.bulk.selectedScreen');
    this.showToast(
      this.transloco.translate('playlists.bulk.assigned', {
        count: result.assigned,
        screen: screenName,
      }),
      'success',
    );
    if (result.notFound.length > 0) {
      this.showToast(
        this.transloco.translate('playlists.bulk.notFound', { count: result.notFound.length }),
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
        this.screensLoadError = this.transloco.translate('playlists.errors.loadScreens');
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
