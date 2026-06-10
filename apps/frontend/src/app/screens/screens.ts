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
  ],
  providers: [SelectionService],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Screen Management</h1>
        </div>
        @if (!loading && !selectedScreen && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">+ Register Screen</button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading screens...</p>
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

      <!-- Screen Grid -->
      @if (!loading && !selectedScreen && !showCreateForm && !editingScreen && screens.length > 0) {
        <app-screen-grid
          [screens]="screens"
          [screenIds]="screenIds"
          [bulkActions]="bulkActions"
          (selectItem)="selectScreen($event)"
        />
      }

      @if (!loading && !selectedScreen && !showCreateForm && screens.length === 0 && !loadError) {
        <div class="empty-state">
          <p class="empty-text">No screens registered yet.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">
            Register Your First Screen
          </button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- API Key Modal -->
      @if (showApiKeyModal) {
        <app-screen-api-key-modal [apiKey]="displayedApiKey" (dismiss)="closeApiKeyModal()" />
      }

      <!-- Regenerate Confirmation Modal -->
      @if (showRegenerateConfirm) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm regeneration"
          tabindex="0"
          (click)="cancelRegenerate()"
          (keydown.escape)="cancelRegenerate()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Regenerate API Key</h2>
            <p>
              Are you sure you want to regenerate the API key for
              <strong>{{ selectedScreen?.name }}</strong
              >?
            </p>
            <p>
              The current API key will be invalidated immediately. The screen will need to be
              reconfigured with the new key.
            </p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelRegenerate()">Cancel</button>
              <button
                class="btn btn-danger"
                (click)="executeRegenerate()"
                [disabled]="regenerating"
              >
                {{ regenerating ? 'Regenerating...' : 'Regenerate' }}
              </button>
            </div>
          </div>
        </div>
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
export class Screens implements OnInit, OnDestroy {
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private screenGroupService = inject(ScreenGroupService);
  private router = inject(Router);
  private sseService = inject(DashboardSseService);
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

    this.showToast(`${result.deleted} screen(s) deleted`, 'success');
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
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
    this.showToast(`${result.updated} screen(s) assigned to ${groupName}`, 'success');
    if (result.notFound.length > 0) {
      this.showToast(
        `${result.notFound.length} item(s) could not be found and were skipped`,
        'warning',
      );
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
