import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ScreenGroupService } from './screen-group.service';
import { forkJoin } from 'rxjs';
import {
  ScreenGroup,
  CreateScreenGroupSubmit,
  UpdateScreenGroupRequest,
} from './screen-group.model';
import { ScreenGroupCard } from './screen-group-card';
import { ScreenGroupCreateModal } from './screen-group-create-modal';
import { ScreenGroupEditModal } from './screen-group-edit-modal';
import { ScreenGroupDeleteModal } from './screen-group-delete-modal';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';
import { PageHeaderComponent, BtnComponent, EmptyComponent } from '../ui';

/**
 * Smart container for the screen-groups list feature. Owns data loading, the org
 * context and all HTTP orchestration (create/edit/delete), exposing the result
 * via plain state. Presentation is delegated to the table and the create/edit/
 * delete modal children.
 */
@Component({
  selector: 'app-screen-groups',
  standalone: true,
  imports: [
    ScreenGroupCard,
    ScreenGroupCreateModal,
    ScreenGroupEditModal,
    ScreenGroupDeleteModal,
    PageHeaderComponent,
    BtnComponent,
    EmptyComponent,
    TranslocoDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="page" *transloco="let t">
      <mns-page-header [title]="t('screenGroups.list.title')" icon="Groups" [sub]="headerSub()">
        @if (!loading && !showCreateForm) {
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">{{
            t('screenGroups.list.newGroup')
          }}</mns-btn>
        }
      </mns-page-header>

      @if (loadError) {
        <p class="text-offline text-sm mb-4">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="text-muted text-sm">{{ t('screenGroups.list.loading') }}</p>
      }

      <!-- Create Group Modal -->
      @if (showCreateForm) {
        <app-screen-group-create-modal
          [availableScreens]="availableScreens"
          [creating]="creating"
          [error]="createError"
          (create)="submitCreate($event)"
          (dismiss)="cancelCreate()"
        />
      }

      <!-- Groups Card Grid -->
      @if (!loading && groups.length > 0) {
        <div
          class="grid gap-[var(--gap)]"
          style="grid-template-columns: repeat(auto-fill, minmax(290px, 1fr))"
        >
          @for (group of groups; track group.id) {
            <app-screen-group-card
              [group]="group"
              (open)="viewGroup($event)"
              (delete)="confirmDelete($event)"
            />
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading && groups.length === 0 && !loadError) {
        <mns-empty
          icon="Groups"
          [title]="t('screenGroups.list.emptyTitle')"
          [desc]="t('screenGroups.list.emptyDesc')"
        >
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">{{
            t('screenGroups.list.createFirst')
          }}</mns-btn>
        </mns-empty>
      }

      @if (actionError) {
        <p class="text-offline text-sm mt-4">{{ actionError }}</p>
      }

      <!-- Edit Group Modal -->
      @if (editingGroup) {
        <app-screen-group-edit-modal
          [group]="editingGroup"
          [saving]="saving"
          [error]="editError"
          (save)="submitEdit($event)"
          (dismiss)="cancelEdit()"
        />
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingGroup) {
        <app-screen-group-delete-modal
          [group]="deletingGroup"
          [deleting]="deleting"
          [error]="deleteError"
          (confirm)="executeDelete()"
          (dismiss)="cancelDelete()"
        />
      }
    </div>
  `,
})
export class ScreenGroups implements OnInit {
  private screenGroupService = inject(ScreenGroupService);
  private screenService = inject(ScreenService);
  private memberService = inject(MemberService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  orgId = '';
  groups: ScreenGroup[] = [];
  allScreens: Screen[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  headerSub(): string {
    if (this.loading) return '';
    return this.transloco.translate('screenGroups.list.subtitle', { count: this.groups.length });
  }

  /** Screens not currently assigned to any group — selectable on create. */
  get availableScreens(): Screen[] {
    return this.allScreens.filter((s) => !s.groupId);
  }

  // Create form state
  showCreateForm = false;
  createError = '';
  creating = false;

  // Edit state
  editingGroup: ScreenGroup | null = null;
  editError = '';
  saving = false;

  // Delete state
  deletingGroup: ScreenGroup | null = null;
  deleteError = '';
  deleting = false;

  ngOnInit(): void {
    this.loadCurrentOrg();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadGroups();
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
          this.loadGroups();
        } else {
          this.loadError = this.transloco.translate('common.errors.noOrgMembership');
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = this.transloco.translate('common.errors.loadOrgContext');
        this.loading = false;
      },
    });
  }

  loadGroups(): void {
    this.loading = true;
    this.loadError = '';
    this.actionError = '';
    this.screenGroupService.getAll(this.orgId).subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? this.transloco.translate('common.errors.accessDenied')
            : this.transloco.translate('screenGroups.errors.loadGroups');
        this.loading = false;
      },
    });
    this.loadScreens();
  }

  private loadScreens(): void {
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.allScreens = screens;
      },
      error: () => {
        this.allScreens = [];
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

  submitCreate(submit: CreateScreenGroupSubmit): void {
    this.creating = true;
    this.createError = '';
    this.screenGroupService.create(this.orgId, submit.request).subscribe({
      next: (group) => {
        const ids = submit.screenIds;
        if (ids.length === 0) {
          this.finishCreate();
          return;
        }
        // Mirror-mode create: assign each selected screen (no grid position).
        forkJoin(
          ids.map((id) => this.screenGroupService.assignScreen(this.orgId, group.id, id, {})),
        ).subscribe({
          next: () => this.finishCreate(),
          error: () => {
            // Group exists; surface a soft warning but still close + reload.
            this.toast.error(this.transloco.translate('screenGroups.toast.someScreensNotAssigned'));
            this.finishCreate();
          },
        });
      },
      error: (err) => {
        this.createError =
          err.error?.message || this.transloco.translate('screenGroups.errors.createGroup');
        this.creating = false;
      },
    });
  }

  private finishCreate(): void {
    this.creating = false;
    this.showCreateForm = false;
    this.toast.success(this.transloco.translate('screenGroups.toast.created'));
    this.loadGroups();
  }

  // --- Edit ---
  editGroup(group: ScreenGroup): void {
    this.editingGroup = group;
    this.editError = '';
  }

  cancelEdit(): void {
    this.editingGroup = null;
  }

  submitEdit(dto: UpdateScreenGroupRequest): void {
    if (!this.editingGroup) return;

    this.saving = true;
    this.editError = '';
    this.screenGroupService.update(this.orgId, this.editingGroup.id, dto).subscribe({
      next: () => {
        this.saving = false;
        this.editingGroup = null;
        this.toast.success(this.transloco.translate('screenGroups.toast.updated'));
        this.loadGroups();
      },
      error: (err) => {
        this.editError =
          err.error?.message || this.transloco.translate('screenGroups.errors.updateGroup');
        this.saving = false;
      },
    });
  }

  // --- Delete ---
  confirmDelete(group: ScreenGroup): void {
    this.deletingGroup = group;
    this.deleteError = '';
  }

  cancelDelete(): void {
    this.deletingGroup = null;
    this.deleteError = '';
  }

  executeDelete(): void {
    if (!this.deletingGroup) return;

    this.deleting = true;
    this.deleteError = '';
    this.screenGroupService.delete(this.orgId, this.deletingGroup.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deletingGroup = null;
        this.toast.success(this.transloco.translate('screenGroups.toast.deleted'));
        this.loadGroups();
      },
      error: (err) => {
        this.deleteError =
          err.error?.message || this.transloco.translate('screenGroups.errors.deleteGroup');
        this.deleting = false;
      },
    });
  }

  viewGroup(group: ScreenGroup): void {
    this.router.navigate(['/screen-groups', group.id]);
  }
}
