import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { OrganisationService } from './organisation.service';
import { Organisation, OrgMember, OrgMemberRole } from './organisation.model';
import { OrgForm, OrganisationFormPayload } from './org-form';
import { OrgTable } from './org-table';
import { OrgMemberList } from './org-member-list';
import { OrgAddMemberModal, AddMemberPayload } from './org-add-member-modal';
import { OrgRemoveMemberModal } from './org-remove-member-modal';
import { OrgDeleteModal } from './org-delete-modal';
import { StorageUsageBars } from '../../shared/storage-usage-bars';
import { StorageInfo } from '../../content/content.model';
import { ToastService } from '../../shared/toast/toast.service';
import {
  CardComponent,
  CardHeadComponent,
  BtnComponent,
  IconComponent,
  EmptyComponent,
} from '../../ui';
import { formatBytes } from '../../shared/format-bytes';
import { AdminTabsComponent } from '../admin-tabs.component';
import { BackLink } from '../../shared/back-link';

/**
 * Smart container for the (super-admin) organisations feature. Owns data
 * loading, the list/detail view orchestration and all HTTP calls (create/edit
 * org, list/add/update-role/remove members). Presentation is delegated to the
 * org form, list table, member list and the add/remove member modals; the
 * detail header and org-info tags stay inline.
 */
@Component({
  selector: 'app-organisations',
  standalone: true,
  imports: [
    BackLink,
    AdminTabsComponent,
    OrgForm,
    OrgTable,
    OrgMemberList,
    OrgAddMemberModal,
    OrgRemoveMemberModal,
    OrgDeleteModal,
    StorageUsageBars,
    CardComponent,
    CardHeadComponent,
    BtnComponent,
    IconComponent,
    EmptyComponent,
    TranslocoDirective,
  ],
  template: `
    <div class="page" *transloco="let t">
      <!-- amber page header -->
      <div class="flex items-end justify-between gap-4 flex-wrap mb-[22px]">
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center gap-[13px] min-w-0">
            <span
              class="grid place-items-center w-11 h-11 rounded-[12px] flex-shrink-0 text-white"
              style="background:linear-gradient(135deg,var(--color-elevated),var(--color-elevated-2));box-shadow:0 8px 20px -10px var(--color-elevated)"
            >
              <mns-icon name="Building" [size]="23" />
            </span>
            <div class="min-w-0">
              <h1 class="m-0 text-[27px] font-extrabold tracking-[-0.025em]">
                {{ t('admin.instanceAdmin') }}
              </h1>
              <div class="text-muted text-[14px] mt-[3px]">
                {{ t('admin.organisations.heading') }}
              </div>
            </div>
          </div>
        </div>
        @if (!selectedOrg) {
          <mns-btn variant="primary" size="md" icon="Plus" (click)="openCreateForm()">
            {{ t('admin.organisations.new') }}
          </mns-btn>
        }
      </div>

      <!-- tab bar -->
      <app-admin-tabs />

      <!-- ── Organisation Detail + Members ── -->
      @if (selectedOrg) {
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <app-back-link (back)="deselectOrg()" />
          <h2 class="m-0 text-[20px] font-bold flex-1">{{ selectedOrg.name }}</h2>
          <mns-btn variant="outline" size="sm" icon="Pencil" (click)="openEditForm(selectedOrg)">{{
            t('common.actions.edit')
          }}</mns-btn>
          <mns-btn variant="danger" size="sm" icon="Trash" (click)="openDeleteModal()">{{
            t('common.actions.delete')
          }}</mns-btn>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold bg-surface-3 text-muted"
          >
            {{ selectedOrg.timeZone }}
          </span>
        </div>

        <mns-card class="mb-6 block max-w-[40rem]">
          <mns-card-head [title]="t('admin.organisations.storageUsage')" icon="Storage" />
          <app-storage-usage-bars [storage]="storageOf(selectedOrg)" />
        </mns-card>

        <!-- Members section -->
        <div class="flex justify-between items-center mb-4">
          <h3 class="m-0 text-[18px] font-bold">{{ t('admin.organisations.members') }}</h3>
          <mns-btn variant="primary" size="sm" icon="Plus" (click)="openAddMemberModal()">{{
            t('admin.organisations.addMember')
          }}</mns-btn>
        </div>

        @if (membersLoading) {
          <p class="text-muted text-sm">{{ t('admin.organisations.loadingMembers') }}</p>
        }
        @if (membersError) {
          <p class="text-offline text-sm">{{ membersError }}</p>
        }
        @if (!membersLoading && members.length > 0) {
          <app-org-member-list
            [members]="members"
            [updatingMemberId]="updatingMemberId"
            [removingMemberId]="removingMemberId"
            (changeRole)="changeMemberRole($event.member, $event.newRole)"
            (removeMember)="confirmRemoveMember($event)"
          />
        }
        @if (!membersLoading && members.length === 0 && !membersError) {
          <mns-empty
            icon="User"
            [title]="t('admin.organisations.noMembersTitle')"
            [desc]="t('admin.organisations.noMembersDesc')"
          />
        }
        @if (memberActionError) {
          <p class="text-offline text-sm">{{ memberActionError }}</p>
        }
      }

      <!-- ── Organisations List ── -->
      @if (!selectedOrg) {
        @if (loadError) {
          <p class="text-offline text-sm">{{ loadError }}</p>
        }
        @if (loading) {
          <p class="text-muted text-sm">{{ t('admin.organisations.loading') }}</p>
        }
        @if (!loading && organisations.length > 0) {
          <app-org-table
            [organisations]="organisations"
            [memberCounts]="memberCounts"
            (selectOrg)="selectOrg($event)"
          />
        }
        @if (!loading && organisations.length === 0 && !loadError) {
          <mns-empty
            icon="Building"
            [title]="t('admin.organisations.emptyTitle')"
            [desc]="t('admin.organisations.emptyDesc')"
          >
            <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
              {{ t('admin.organisations.new') }}
            </mns-btn>
          </mns-empty>
        }
      }

      <!-- ── Create / Edit Org Modal ── -->
      @if (showForm) {
        <app-org-form
          [org]="editingOrg"
          [submitting]="submitting"
          [error]="formError"
          (save)="submitForm($event)"
          (dismiss)="cancelForm()"
        />
      }

      <!-- ── Add Member Modal ── -->
      @if (showAddMemberModal) {
        <app-org-add-member-modal
          [adding]="addingMember"
          [error]="addMemberError"
          (add)="submitAddMember($event)"
          (dismiss)="closeAddMemberModal()"
        />
      }

      <!-- ── Remove Member Confirm Modal ── -->
      @if (showRemoveConfirm && removingMember) {
        <app-org-remove-member-modal
          [member]="removingMember"
          [removing]="removingMemberId !== null"
          (confirm)="executeRemoveMember()"
          (dismiss)="cancelRemoveMember()"
        />
      }

      <!-- ── Delete Org Confirm Modal ── -->
      @if (showDeleteModal && selectedOrg) {
        <app-org-delete-modal
          [org]="selectedOrg"
          [deleting]="deletingOrg"
          [error]="deleteError"
          (confirm)="executeDeleteOrg()"
          (dismiss)="cancelDeleteOrg()"
        />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``,
})
export class Organisations implements OnInit {
  private orgService = inject(OrganisationService);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  protected readonly formatBytes = formatBytes;

  // Org list state
  organisations: Organisation[] = [];
  memberCounts: Record<string, number> = {};
  loading = true;
  loadError = '';

  // Org form state
  showForm = false;
  editingOrg: Organisation | null = null;
  submitting = false;
  formError = '';

  // Selected org + members state
  selectedOrg: Organisation | null = null;
  members: OrgMember[] = [];
  membersLoading = false;
  membersError = '';
  memberActionError = '';

  // Add member modal state
  showAddMemberModal = false;
  addMemberError = '';
  addingMember = false;

  // Role change state
  updatingMemberId: string | null = null;

  // Remove member state
  showRemoveConfirm = false;
  removingMember: OrgMember | null = null;
  removingMemberId: string | null = null;

  // Delete org state
  showDeleteModal = false;
  deletingOrg = false;
  deleteError = '';

  ngOnInit(): void {
    this.loadOrganisations();
  }

  // ── Org list ──

  loadOrganisations(): void {
    this.loading = true;
    this.loadError = '';
    this.orgService.getAll().subscribe({
      next: (orgs) => {
        this.organisations = orgs;
        this.loading = false;
        for (const org of orgs) {
          this.orgService.listMembers(org.id).subscribe({
            next: (members) => (this.memberCounts[org.id] = members.length),
            error: () => (this.memberCounts[org.id] = 0),
          });
        }
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? this.transloco.translate('admin.organisations.errors.accessDenied')
            : this.transloco.translate('admin.organisations.errors.loadFailed');
        this.loading = false;
      },
    });
  }

  selectOrg(org: Organisation): void {
    this.selectedOrg = org;
    this.loadMembers();
  }

  deselectOrg(): void {
    this.selectedOrg = null;
    this.members = [];
    this.membersError = '';
    this.memberActionError = '';
  }

  // ── Org form ──

  openCreateForm(): void {
    this.editingOrg = null;
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(org: Organisation): void {
    this.editingOrg = org;
    this.formError = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingOrg = null;
    this.formError = '';
  }

  submitForm(payload: OrganisationFormPayload): void {
    this.submitting = true;
    this.formError = '';

    const editingId = this.editingOrg?.id ?? null;
    const request$ = editingId
      ? this.orgService.update(editingId, payload)
      : this.orgService.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.showForm = false;
        this.submitting = false;
        if (editingId && this.selectedOrg) {
          this.selectedOrg = saved;
        }
        this.editingOrg = null;
        this.loadOrganisations();
        this.toast.success(
          editingId
            ? this.transloco.translate('admin.organisations.toasts.updated', { name: saved.name })
            : this.transloco.translate('admin.organisations.toasts.created', { name: saved.name }),
        );
      },
      error: (err) => {
        this.formError =
          err.error?.message || this.transloco.translate('admin.organisations.errors.generic');
        this.submitting = false;
      },
    });
  }

  // ── Members ──

  loadMembers(): void {
    if (!this.selectedOrg) return;
    this.membersLoading = true;
    this.membersError = '';
    this.memberActionError = '';
    this.orgService.listMembers(this.selectedOrg.id).subscribe({
      next: (members) => {
        this.members = members;
        this.membersLoading = false;
      },
      error: () => {
        this.membersError = this.transloco.translate('admin.organisations.errors.loadMembers');
        this.membersLoading = false;
      },
    });
  }

  openAddMemberModal(): void {
    this.addMemberError = '';
    this.showAddMemberModal = true;
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
  }

  submitAddMember(payload: AddMemberPayload): void {
    if (!this.selectedOrg) return;

    this.addingMember = true;
    this.addMemberError = '';
    this.orgService.addMember(this.selectedOrg.id, payload).subscribe({
      next: () => {
        this.addingMember = false;
        this.showAddMemberModal = false;
        this.loadMembers();
        this.toast.success(this.transloco.translate('admin.organisations.toasts.memberAdded'));
      },
      error: (err) => {
        this.addMemberError =
          err.error?.message || this.transloco.translate('admin.organisations.errors.addMember');
        this.addingMember = false;
      },
    });
  }

  changeMemberRole(member: OrgMember, newRole: OrgMemberRole): void {
    if (newRole === member.role || !this.selectedOrg) return;

    this.updatingMemberId = member.userId;
    this.memberActionError = '';
    this.orgService
      .updateMemberRole(this.selectedOrg.id, member.userId, { role: newRole })
      .subscribe({
        next: (updated) => {
          member.role = updated.role;
          this.updatingMemberId = null;
          this.toast.success(
            this.transloco.translate('admin.organisations.toasts.roleUpdated', {
              role: this.roleLabel(updated.role),
            }),
          );
        },
        error: (err) => {
          this.memberActionError =
            err.error?.message || this.transloco.translate('admin.organisations.errors.updateRole');
          this.updatingMemberId = null;
        },
      });
  }

  confirmRemoveMember(member: OrgMember): void {
    this.removingMember = member;
    this.showRemoveConfirm = true;
  }

  cancelRemoveMember(): void {
    this.showRemoveConfirm = false;
    this.removingMember = null;
  }

  executeRemoveMember(): void {
    if (!this.removingMember || !this.selectedOrg) return;

    this.removingMemberId = this.removingMember.userId;
    this.memberActionError = '';
    this.orgService.removeMember(this.selectedOrg.id, this.removingMember.userId).subscribe({
      next: () => {
        this.removingMemberId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
        this.loadMembers();
        this.toast.success(this.transloco.translate('admin.organisations.toasts.memberRemoved'));
      },
      error: (err) => {
        this.memberActionError =
          err.error?.message || this.transloco.translate('admin.organisations.errors.removeMember');
        this.removingMemberId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
      },
    });
  }

  // ── Delete org ──

  openDeleteModal(): void {
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  cancelDeleteOrg(): void {
    if (this.deletingOrg) return;
    this.showDeleteModal = false;
    this.deleteError = '';
  }

  executeDeleteOrg(): void {
    if (!this.selectedOrg || this.deletingOrg) return;

    this.deletingOrg = true;
    this.deleteError = '';
    this.orgService.delete(this.selectedOrg.id).subscribe({
      next: () => {
        this.deletingOrg = false;
        this.showDeleteModal = false;
        this.deselectOrg();
        this.loadOrganisations();
        this.toast.success(this.transloco.translate('admin.organisations.toasts.deleted'));
      },
      error: (err) => {
        this.deleteError =
          err.error?.message || this.transloco.translate('admin.organisations.errors.delete');
        this.deletingOrg = false;
      },
    });
  }

  // ── Helpers ──

  /** Human-readable, localized label for a membership role. */
  private roleLabel(role: OrgMemberRole): string {
    return this.transloco.translate('admin.organisations.roles.' + role);
  }

  /** Map an organisation's storage columns to the shared {@link StorageInfo} shape. */
  storageOf(org: Organisation): StorageInfo {
    return {
      originalUsedBytes: org.storageOriginalUsedBytes,
      originalLimitBytes: org.storageOriginalLimitBytes,
      transcodedUsedBytes: org.storageTranscodedUsedBytes,
      transcodedLimitBytes: org.storageTranscodedLimitBytes,
    };
  }
}
