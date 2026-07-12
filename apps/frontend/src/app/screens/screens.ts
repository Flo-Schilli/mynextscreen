import { Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ScreenService } from './screen.service';
import { ScreenListItem, CreateScreenRequest, UpdateScreenRequest } from './screen.model';
import { ScreenForm } from './screen-form';
import { ScreenGrid } from './screen-grid';
import { PlayerAppsHelp } from './player-apps-help';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ToastService } from '../shared/toast/toast.service';
import { PublicConfigService } from '../shared/public-config.service';
import {
  PageHeaderComponent,
  BtnComponent,
  EmptyComponent,
  OverlayComponent,
  ModalComponent,
  IconComponent,
} from '../ui';

/**
 * Smart container for the screens feature. Owns data loading, the org context,
 * all HTTP orchestration (register via pairing code / edit / re-pair / single
 * delete), live online/offline updates via SSE, and toast feedback.
 *
 * The unified {@link ScreenForm} modal handles both adding a screen (create mode)
 * and editing one (edit mode, opened by a card click); the same modal hosts the
 * read-only info block and re-pair flow. A click on a card's trash icon opens a
 * confirm-delete modal. Presentation is otherwise delegated to the grid.
 */
@Component({
  selector: 'app-screens',
  standalone: true,
  imports: [
    ScreenForm,
    ScreenGrid,
    PlayerAppsHelp,
    PageHeaderComponent,
    BtnComponent,
    EmptyComponent,
    OverlayComponent,
    ModalComponent,
    IconComponent,
  ],
  template: `
    <div>
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

      <!-- Create Screen Modal -->
      @if (showCreateForm) {
        <app-screen-form
          mode="create"
          [saving]="creating"
          [error]="createError"
          [playerUrl]="configService.playerUrl()"
          (create)="submitCreate($event)"
          (dismiss)="cancelCreate()"
        />
      }

      <!-- Edit Screen Modal (opened by a card click) -->
      @if (selectedScreen && editingScreen) {
        <app-screen-form
          mode="edit"
          [screen]="selectedScreen"
          [saving]="saving"
          [error]="editError"
          [repairing]="repairing"
          [refreshing]="refreshing"
          (update)="submitEdit($event)"
          (repair)="submitRepair($event)"
          (refresh)="submitRefresh()"
          (dismiss)="cancelEdit()"
        />
      }

      <!-- Player-Apps help modal -->
      @if (showPlayerAppsHelp()) {
        <app-player-apps-help (dismiss)="showPlayerAppsHelp.set(false)" />
      }

      <!-- Default view: page header + grid or empty state -->
      @if (!loading) {
        <mns-page-header title="Screens" icon="Screens" [sub]="screenSubtitle">
          <mns-btn variant="outline" icon="Download" (mnsClick)="showPlayerAppsHelp.set(true)">
            Install Player
          </mns-btn>
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
            Add screen
          </mns-btn>
        </mns-page-header>

        <!-- Web Player link -->
        <div class="flex items-center gap-1.5 mt-3 text-xs text-muted">
          <mns-icon name="Globe" [size]="13" />
          <span>Web Player:</span>
          <a
            [href]="playerUrlHref()"
            target="_blank"
            rel="noopener"
            class="text-accent hover:underline font-mono"
            >{{ configService.playerUrl() }}</a
          >
        </div>

        @if (screens.length > 0) {
          <app-screen-grid
            [screens]="screens"
            (selectItem)="selectScreen($event)"
            (remove)="onDeleteScreen($event)"
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

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm) {
        <mns-overlay (closed)="cancelDelete()">
          <mns-modal title="Delete screen" icon="Trash" (closed)="cancelDelete()">
            <div class="flex flex-col gap-4">
              <p class="text-sm text-muted leading-relaxed">
                Are you sure you want to delete
                <strong class="text-text">{{ deleteTarget?.name }}</strong
                >? This cannot be undone.
              </p>
              <div class="flex gap-2 pt-1" slot="footer">
                <div class="flex gap-2 px-6 pb-5 w-full">
                  <mns-btn variant="outline" [full]="true" (mnsClick)="cancelDelete()">
                    Cancel
                  </mns-btn>
                  <mns-btn
                    variant="danger"
                    [full]="true"
                    [disabled]="deleting"
                    (mnsClick)="executeDelete()"
                  >
                    {{ deleting ? 'Deleting…' : 'Delete' }}
                  </mns-btn>
                </div>
              </div>
            </div>
          </mns-modal>
        </mns-overlay>
      }
    </div>
  `,
})
export class Screens implements OnInit, OnDestroy {
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private router = inject(Router);
  private sseService = inject(DashboardSseService);
  private toast = inject(ToastService);
  protected configService = inject(PublicConfigService);
  private subscriptions: Subscription[] = [];

  showPlayerAppsHelp = signal(false);

  readonly playerUrlHref = computed(() => {
    const url = this.configService.playerUrl();
    return url.startsWith('http') ? url : 'https://' + url;
  });

  orgId = '';
  screens: ScreenListItem[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Create modal
  showCreateForm = false;
  createError = '';
  creating = false;

  // Edit modal state (opened via a card click)
  selectedScreen: ScreenListItem | null = null;
  editingScreen = false;
  editError = '';
  saving = false;

  // Re-pair (inside the edit modal)
  repairing = false;

  // Refresh player (inside the edit modal)
  refreshing = false;

  // Single delete confirmation
  showDeleteConfirm = false;
  deleteTarget: ScreenListItem | null = null;
  deleting = false;

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
      next: (screen) => {
        this.creating = false;
        this.showCreateForm = false;
        this.toast.success(`Screen “${screen.name}” created.`);
        this.loadScreens();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to register screen.';
        this.creating = false;
      },
    });
  }

  // --- Edit (card click opens the unified modal in edit mode) ---
  selectScreen(screen: ScreenListItem): void {
    this.selectedScreen = screen;
    this.editError = '';
    this.editingScreen = true;
  }

  startEdit(): void {
    this.editError = '';
    this.editingScreen = true;
  }

  cancelEdit(): void {
    this.editingScreen = false;
    this.selectedScreen = null;
  }

  submitEdit(dto: UpdateScreenRequest): void {
    if (!this.selectedScreen) return;

    this.saving = true;
    this.editError = '';
    this.screenService.update(this.orgId, this.selectedScreen.id, dto).subscribe({
      next: (updated) => {
        this.saving = false;
        this.editingScreen = false;
        this.selectedScreen = null;
        this.toast.success(`Screen “${updated.name}” updated.`);
        this.loadScreens();
      },
      error: (err) => {
        this.editError = err.error?.message || 'Failed to update screen.';
        this.saving = false;
      },
    });
  }

  // --- Re-pair ---
  submitRepair(pairingCode: string): void {
    if (!this.selectedScreen) return;

    this.repairing = true;
    this.actionError = '';
    this.screenService.repair(this.orgId, this.selectedScreen.id, pairingCode).subscribe({
      next: (screen) => {
        this.repairing = false;
        this.selectedScreen = { ...this.selectedScreen!, ...screen };
        this.toast.success('Re-pairing started. The display will pick up the new key.');
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to re-pair screen.';
        this.repairing = false;
      },
    });
  }

  // --- Refresh player ---
  submitRefresh(): void {
    if (!this.selectedScreen) return;

    this.refreshing = true;
    this.actionError = '';
    this.screenService.refreshPlayer(this.orgId, this.selectedScreen.id).subscribe({
      next: () => {
        this.refreshing = false;
        this.toast.success('Refresh sent. The player will reload shortly.');
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to refresh player.';
        this.refreshing = false;
      },
    });
  }

  // --- Single Delete ---
  onDeleteScreen(screen: ScreenListItem): void {
    this.deleteTarget = screen;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    const target = this.deleteTarget;

    this.deleting = true;
    this.actionError = '';
    this.screenService.deleteOne(this.orgId, target.id).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
        if (this.selectedScreen?.id === target.id) {
          this.selectedScreen = null;
          this.editingScreen = false;
        }
        this.toast.success(`Screen “${target.name}” deleted.`);
        this.loadScreens();
      },
      error: (err) => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.actionError = err.error?.message || 'Failed to delete screen.';
      },
    });
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
