import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScreenGroupService } from './screen-group.service';
import {
  ScreenGroup,
  CreateScreenGroupRequest,
  UpdateScreenGroupRequest,
} from './screen-group.model';
import { ScreenGroupTable } from './screen-group-table';
import { ScreenGroupCreateModal } from './screen-group-create-modal';
import { ScreenGroupEditModal } from './screen-group-edit-modal';
import { ScreenGroupDeleteModal } from './screen-group-delete-modal';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';

/**
 * Smart container for the screen-groups list feature. Owns data loading, the org
 * context and all HTTP orchestration (create/edit/delete), exposing the result
 * via plain state. Presentation is delegated to the table and the create/edit/
 * delete modal children.
 */
@Component({
  selector: 'app-screen-groups',
  standalone: true,
  imports: [ScreenGroupTable, ScreenGroupCreateModal, ScreenGroupEditModal, ScreenGroupDeleteModal],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Screen Groups</h1>
        </div>
        @if (!loading && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">+ New Group</button>
        }
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading screen groups...</p>
      }

      <!-- Create Group Modal -->
      @if (showCreateForm) {
        <app-screen-group-create-modal
          [creating]="creating"
          [error]="createError"
          (create)="submitCreate($event)"
          (dismiss)="cancelCreate()"
        />
      }

      <!-- Groups Table -->
      @if (!loading && groups.length > 0) {
        <app-screen-group-table
          [groups]="groups"
          (view)="viewGroup($event)"
          (edit)="editGroup($event)"
          (delete)="confirmDelete($event)"
        />
      }

      <!-- Empty State -->
      @if (!loading && groups.length === 0 && !loadError) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect
                x="4"
                y="6"
                width="16"
                height="12"
                rx="2"
                stroke="currentColor"
                stroke-width="2"
              />
              <rect
                x="28"
                y="6"
                width="16"
                height="12"
                rx="2"
                stroke="currentColor"
                stroke-width="2"
              />
              <rect
                x="4"
                y="30"
                width="16"
                height="12"
                rx="2"
                stroke="currentColor"
                stroke-width="2"
              />
              <rect
                x="28"
                y="30"
                width="16"
                height="12"
                rx="2"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M20 12h8M12 18v12M36 18v12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="2 3"
              />
            </svg>
          </div>
          <p class="empty-title">No screen groups yet</p>
          <p class="empty-text">
            Create your first screen group to start building mirror displays or video walls.
          </p>
          <button class="btn btn-primary" (click)="openCreateForm()">
            Create Your First Group
          </button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
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
  private memberService = inject(MemberService);
  private router = inject(Router);
  private toast = inject(ToastService);

  orgId = '';
  groups: ScreenGroup[] = [];
  loading = true;
  loadError = '';
  actionError = '';

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
        this.loadError = err.status === 403 ? 'Access denied.' : 'Failed to load screen groups.';
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

  submitCreate(dto: CreateScreenGroupRequest): void {
    this.creating = true;
    this.createError = '';
    this.screenGroupService.create(this.orgId, dto).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.toast.success('Screen group created.');
        this.loadGroups();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create screen group.';
        this.creating = false;
      },
    });
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
        this.toast.success('Screen group updated.');
        this.loadGroups();
      },
      error: (err) => {
        this.editError = err.error?.message || 'Failed to update screen group.';
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
        this.toast.success('Screen group deleted.');
        this.loadGroups();
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete screen group.';
        this.deleting = false;
      },
    });
  }

  viewGroup(group: ScreenGroup): void {
    this.router.navigate(['/screen-groups', group.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
