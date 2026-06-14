import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ScreenService } from './screen.service';
import { Screen, CreateScreenRequest, UpdateScreenRequest } from './screen.model';
import { ScreenCreateForm } from './screen-create-form';
import { ScreenEditForm } from './screen-edit-form';
import { ScreenDetail } from './screen-detail';
import { ScreenGrid } from './screen-grid';
import { ScreenApiKeyModal } from './screen-api-key-modal';
import { ScreenAssignGroupModal } from './screen-assign-group-modal';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
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
} from '../ui';

/**
 * Smart container for the screens feature. Owns data loading, the org context,
 * all HTTP orchestration (register/edit/regenerate-key, bulk delete/assign),
 * live online/offline updates via SSE, and toast state. Presentation is
 * delegated to the create-form, edit-form, detail, grid and modal children.
 */
@Component({
  selector: 'app-screens',
  standalone: true,
  imports: [
    ScreenCreateForm,
    ScreenEditForm,
    ScreenDetail,
    ScreenGrid,
    ScreenApiKeyModal,
    ScreenAssignGroupModal,
    BulkConfirmDialogComponent,
    PageHeaderComponent,
    BtnComponent,
    EmptyComponent,
    OverlayComponent,
    ModalComponent,
  ],
  providers: [SelectionService],
  template: `
    <!-- Extra bottom padding for sticky bulk-action bar -->
    <div class="pb-20">
      <!-- Loading -->
      @if (loading) {
        <div class="flex items-center justify-center py-20 text-muted text-sm">
          Loading screens…
        </div>
      }

      <!-- Load error -->
      @if (loadError) {
        <div
          class="rounded-xl border border-offline-dim bg-offline-dim/30 px-5 py-4 text-sm text-offline mb-5"
        >
          {{ loadError }}
        </div>
      }

      <!-- Create Screen Form -->
      @if (showCreateForm) {
        <app-screen-create-form
          [creating]="creating"
          [error]="createError"
          (create)="submitCreate($event)"
          (dismiss)="cancelCreate()"
        />
      }

      <!-- Screen Detail View -->
      @if (selectedScreen && !editingScreen) {
        <app-screen-detail
          [screen]="selectedScreen"
          [regenerating]="regenerating"
          (edit)="startEdit()"
          (dismiss)="closeDetail()"
          (regenerate)="confirmRegenerate()"
        />
      }

      <!-- Edit Screen Form -->
      @if (selectedScreen && editingScreen) {
        <app-screen-edit-form
          [screen]="selectedScreen"
          [saving]="saving"
          [error]="editError"
          (save)="submitEdit($event)"
          (dismiss)="cancelEdit()"
        />
      }

      <!-- Default view: page header + grid or empty state -->
      @if (!loading && !selectedScreen && !showCreateForm && !editingScreen) {
        <mns-page-header title="Screens" icon="Screens" [sub]="screenSubtitle">
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
            Add screen
          </mns-btn>
        </mns-page-header>

        @if (screens.length > 0) {
          <app-screen-grid
            [screens]="screens"
            [screenIds]="screenIds"
            [bulkActions]="bulkActions"
            (selectItem)="selectScreen($event)"
          />
        } @else if (!loadError) {
          <div class="empty-state">
            <mns-empty
              icon="Screens"
              title="No screens yet"
              desc="Pair your first display with a one-time code to start broadcasting content."
            >
              <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
                Add your first screen
              </mns-btn>
            </mns-empty>
          </div>
        }
      }

      @if (actionError) {
        <div
          class="rounded-xl border border-offline-dim bg-offline-dim/30 px-5 py-4 text-sm text-offline mt-4"
        >
          {{ actionError }}
        </div>
      }

      <!-- API Key Modal -->
      @if (showApiKeyModal) {
        <app-screen-api-key-modal [apiKey]="displayedApiKey" (dismiss)="closeApiKeyModal()" />
      }

      <!-- Regenerate Confirmation Modal -->
      @if (showRegenerateConfirm) {
        <mns-overlay (closed)="cancelRegenerate()">
          <mns-modal title="Regenerate API Key" icon="Cast" (closed)="cancelRegenerate()">
            <div class="flex flex-col gap-4">
              <p class="text-sm text-muted leading-relaxed">
                Are you sure you want to regenerate the API key for
                <strong class="text-text">{{ selectedScreen?.name }}</strong
                >? The current key will be invalidated immediately and the screen will need to be
                reconfigured.
              </p>
              <div class="flex gap-2 pt-1" slot="footer">
                <div class="flex gap-2 px-6 pb-5 w-full">
                  <mns-btn variant="outline" [full]="true" (mnsClick)="cancelRegenerate()">
                    Cancel
                  </mns-btn>
                  <mns-btn
                    variant="danger"
                    [full]="true"
                    [disabled]="regenerating"
                    (mnsClick)="executeRegenerate()"
                  >
                    {{ regenerating ? 'Regenerating…' : 'Regenerate' }}
                  </mns-btn>
                </div>
              </div>
            </div>
          </mns-modal>
        </mns-overlay>
      }

      <!-- Bulk Delete Confirmation Modal -->
      @if (showBulkDeleteConfirm) {
        <app-bulk-confirm-dialog
          title="Delete Screens"
          [message]="bulkDeleteMessage()"
          confirmLabel="Delete"
          [itemCount]="selectionService.count()"
          (confirmed)="onBulkDeleteConfirmed($event)"
        />
      }

      <!-- Assign to Group Modal -->
      @if (showAssignGroupModal) {
        <app-screen-assign-group-modal
          [groups]="groups"
          [loading]="groupsLoading"
          [loadError]="groupsLoadError"
          [count]="selectionService.count()"
          [(selectedGroupId)]="selectedGroupId"
          (confirm)="executeAssignGroup()"
          (dismiss)="cancelAssignGroup()"
        />
      }
    </div>
  `,
})
export class Screens implements OnInit, OnDestroy {
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private screenGroupService = inject(ScreenGroupService);
  private router = inject(Router);
  private sseService = inject(DashboardSseService);
  private toast = inject(ToastService);
  readonly selectionService = inject(SelectionService);
  private subscriptions: Subscription[] = [];

  orgId = '';
  screens: Screen[] = [];
  screenIds: string[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Create form
  showCreateForm = false;
  createError = '';
  creating = false;

  // Detail view state
  selectedScreen: Screen | null = null;

  // Edit state
  editingScreen = false;
  editError = '';
  saving = false;

  // API key modal
  showApiKeyModal = false;
  displayedApiKey = '';

  // Regenerate confirmation
  showRegenerateConfirm = false;
  regenerating = false;

  // Bulk delete confirmation
  showBulkDeleteConfirm = false;
  private bulkDeleteResolve: ((value: boolean) => void) | null = null;

  // Assign to group modal
  showAssignGroupModal = false;
  groups: ScreenGroup[] = [];
  selectedGroupId = '';
  groupsLoading = false;
  groupsLoadError = '';
  private assignGroupResolve: ((value: boolean) => void) | null = null;

  // Bulk actions
  bulkActions: BulkAction[] = [
    {
      label: 'Delete selected',
      variant: 'danger',
      handler: () => this.handleBulkDelete(),
    },
    {
      label: 'Assign to group',
      variant: 'default',
      handler: () => this.handleBulkAssignGroup(),
    },
  ];

  ngOnInit(): void {
    this.loadCurrentOrg();

    this.subscriptions.push(
      this.sseService.screenOnline$.subscribe((event) => {
        this.updateScreenStatus(event.data['screenId'] as string, true);
      }),
      this.sseService.screenOffline$.subscribe((event) => {
        this.updateScreenStatus(event.data['screenId'] as string, false);
      }),
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }

  private updateScreenStatus(screenId: string, isOnline: boolean): void {
    const screen = this.screens.find((s) => s.id === screenId);
    if (screen) {
      screen.isOnline = isOnline;
    }
    if (this.selectedScreen?.id === screenId) {
      this.selectedScreen = { ...this.selectedScreen, isOnline };
    }
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadScreens();
        } else if (memberships.length > 0) {
          // Non-admin users can still view screens
          this.orgId = memberships[0].organisationId;
          this.loadScreens();
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

  loadScreens(): void {
    this.loading = true;
    this.loadError = '';
    this.actionError = '';
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.screens = screens;
        this.screenIds = screens.map((s) => s.id);
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err.status === 403 ? 'Access denied.' : 'Failed to load screens.';
        this.loading = false;
      },
    });
  }

  // --- Create ---
  openCreateForm(): void {
    this.createError = '';
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(dto: CreateScreenRequest): void {
    this.creating = true;
    this.createError = '';
    this.screenService.create(this.orgId, dto).subscribe({
      next: (result) => {
        this.creating = false;
        this.showCreateForm = false;
        this.displayedApiKey = result.apiKey;
        this.showApiKeyModal = true;
        this.toast.success(`Screen “${result.screen.name}” created.`);
        this.loadScreens();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to register screen.';
        this.creating = false;
      },
    });
  }

  // --- Detail ---
  selectScreen(screen: Screen): void {
    this.selectedScreen = screen;
    this.editingScreen = false;
  }

  closeDetail(): void {
    this.selectedScreen = null;
  }

  // --- Edit ---
  startEdit(): void {
    this.editError = '';
    this.editingScreen = true;
  }

  cancelEdit(): void {
    this.editingScreen = false;
  }

  submitEdit(dto: UpdateScreenRequest): void {
    if (!this.selectedScreen) return;

    this.saving = true;
    this.editError = '';
    this.screenService.update(this.orgId, this.selectedScreen.id, dto).subscribe({
      next: (updated) => {
        this.saving = false;
        this.editingScreen = false;
        this.selectedScreen = updated;
        this.toast.success(`Screen “${updated.name}” updated.`);
        this.loadScreens();
      },
      error: (err) => {
        this.editError = err.error?.message || 'Failed to update screen.';
        this.saving = false;
      },
    });
  }

  // --- Regenerate API Key ---
  confirmRegenerate(): void {
    this.showRegenerateConfirm = true;
  }

  cancelRegenerate(): void {
    this.showRegenerateConfirm = false;
  }

  executeRegenerate(): void {
    if (!this.selectedScreen) return;

    this.regenerating = true;
    this.actionError = '';
    this.screenService.regenerateApiKey(this.orgId, this.selectedScreen.id).subscribe({
      next: (result) => {
        this.regenerating = false;
        this.showRegenerateConfirm = false;
        this.selectedScreen = result.screen;
        this.displayedApiKey = result.apiKey;
        this.showApiKeyModal = true;
        this.toast.success('API key regenerated.');
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to regenerate API key.';
        this.regenerating = false;
        this.showRegenerateConfirm = false;
      },
    });
  }

  // --- API Key Modal ---
  closeApiKeyModal(): void {
    this.showApiKeyModal = false;
    this.displayedApiKey = '';
  }

  // --- Bulk Delete ---
  async handleBulkDelete(): Promise<void> {
    const confirmed = await this.openBulkDeleteConfirm();
    if (!confirmed) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const result = await firstValueFrom(this.screenService.bulkDelete(this.orgId, ids));

    this.toast.success(`${result.deleted} screen(s) deleted.`);
    if (result.notFound.length > 0) {
      this.toast.info(`${result.notFound.length} item(s) could not be found and were skipped`);
    }
    this.loadScreens();
  }

  private openBulkDeleteConfirm(): Promise<boolean> {
    this.showBulkDeleteConfirm = true;
    return new Promise<boolean>((resolve) => {
      this.bulkDeleteResolve = resolve;
    });
  }

  bulkDeleteMessage(): string {
    return (
      `You are about to permanently delete ${this.selectionService.count()} screen(s). ` +
      'This cannot be undone.'
    );
  }

  onBulkDeleteConfirmed(confirmed: boolean): void {
    this.showBulkDeleteConfirm = false;
    this.bulkDeleteResolve?.(confirmed);
    this.bulkDeleteResolve = null;
  }

  // --- Bulk Assign Group ---
  async handleBulkAssignGroup(): Promise<void> {
    const confirmed = await this.openAssignGroupModal();
    if (!confirmed) throw new Error('cancelled');

    const ids = [...this.selectionService.selectedIds()];
    const groupId = this.selectedGroupId || null;
    const result = await firstValueFrom(
      this.screenService.bulkAssignGroup(this.orgId, ids, groupId),
    );

    const groupName = groupId
      ? (this.groups.find((g) => g.id === groupId)?.name ?? 'selected group')
      : 'no group';
    this.toast.success(`${result.updated} screen(s) assigned to ${groupName}.`);
    if (result.notFound.length > 0) {
      this.toast.info(`${result.notFound.length} item(s) could not be found and were skipped`);
    }
    this.loadScreens();
  }

  private openAssignGroupModal(): Promise<boolean> {
    this.showAssignGroupModal = true;
    this.selectedGroupId = '';
    this.groupsLoadError = '';
    this.groupsLoading = true;
    this.screenGroupService.getAll(this.orgId).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.groupsLoading = false;
      },
      error: () => {
        this.groupsLoadError = 'Failed to load groups.';
        this.groupsLoading = false;
      },
    });
    return new Promise<boolean>((resolve) => {
      this.assignGroupResolve = resolve;
    });
  }

  cancelAssignGroup(): void {
    this.showAssignGroupModal = false;
    this.assignGroupResolve?.(false);
    this.assignGroupResolve = null;
  }

  executeAssignGroup(): void {
    this.showAssignGroupModal = false;
    this.assignGroupResolve?.(true);
    this.assignGroupResolve = null;
  }

  get screenSubtitle(): string {
    const online = this.screens.filter((s) => s.isOnline).length;
    const offline = this.screens.length - online;
    if (!this.screens.length) return 'Pair and manage every display in your network';
    return `${online} online · ${offline} offline`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
