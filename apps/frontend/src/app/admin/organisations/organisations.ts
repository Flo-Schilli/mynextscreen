import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

/**
 * Smart container for the (super-admin) organisations feature. Owns data
 * loading, the org/detail/form view orchestration and all HTTP calls
 * (create/edit org, list/add/update-role/remove members). Presentation is
 * delegated to the form, list table, member list and the add/remove member
 * modals; the detail header and org-info tags stay inline.
 */
@Component({
  selector: 'app-organisations',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
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
  ],
  template: `
    <div class="page">
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
              <h1 class="m-0 text-[27px] font-extrabold tracking-[-0.025em]">Instance Admin</h1>
              <div class="text-muted text-[14px] mt-[3px]">Organisations</div>
            </div>
          </div>
        </div>
        @if (!showForm && !selectedOrg) {
          <mns-btn variant="primary" size="md" icon="Plus" (click)="openCreateForm()">
            New Organisation
          </mns-btn>
        }
      </div>

      <!-- tab bar -->
      <div class="flex gap-1 border-b border-border mb-[var(--gap)] overflow-x-auto">
        @for (tab of tabs; track tab.route) {
          <a
            [routerLink]="tab.route"
            class="flex items-center gap-2 px-[14px] py-3 -mb-px text-[14px] font-semibold whitespace-nowrap border-b-2 border-transparent text-muted hover:text-default transition-colors no-underline"
            routerLinkActive="border-accent text-default"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <mns-icon [name]="tab.icon" [size]="16" />
            {{ tab.label }}
          </a>
        }
      </div>

      <!-- ── Create / Edit Form ── -->
      @if (showForm) {
        <app-org-form
          [org]="editingOrg"
          [submitting]="submitting"
          [error]="formError"
          (save)="submitForm($event)"
          (dismiss)="cancelForm()"
        />
      }

      <!-- ── Organisation Detail + Members ── -->
      @if (selectedOrg && !showForm) {
        <div class="flex items-center gap-3 mb-4 flex-wrap">
          <button
            class="inline-flex items-center gap-[7px] px-[13px] py-2 rounded-[10px] text-[13.5px] font-semibold border border-border-strong bg-surface text-muted hover:text-default transition-colors"
            (click)="deselectOrg()"
          >
            <mns-icon name="ChevronLeft" [size]="16" /> All Organisations
          </button>
          <h2 class="m-0 text-[20px] font-bold flex-1">{{ selectedOrg.name }}</h2>
          <mns-btn variant="outline" size="sm" icon="Pencil" (click)="openEditForm(selectedOrg)"
            >Edit</mns-btn
          >
          <mns-btn variant="danger" size="sm" icon="Trash" (click)="openDeleteModal()"
            >Delete</mns-btn
          >
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold bg-surface-3 text-muted"
          >
            {{ selectedOrg.timeZone }}
          </span>
        </div>

        <mns-card class="mb-6 block max-w-[40rem]">
          <mns-card-head title="Storage Usage" icon="Storage" />
          <app-storage-usage-bars [storage]="storageOf(selectedOrg)" />
        </mns-card>

        <!-- Members section -->
        <div class="flex justify-between items-center mb-4">
          <h3 class="m-0 text-[18px] font-bold">Members</h3>
          <mns-btn variant="primary" size="sm" icon="Plus" (click)="openAddMemberModal()"
            >Add Member</mns-btn
          >
        </div>

        @if (membersLoading) {
          <p class="text-muted text-sm">Loading members…</p>
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
            title="No members yet"
            desc="Use “Add Member” above to give people access to this organisation."
          />
        }
        @if (memberActionError) {
          <p class="text-offline text-sm">{{ memberActionError }}</p>
        }
      }

      <!-- ── Organisations List ── -->
      @if (!selectedOrg && !showForm) {
        @if (loadError) {
          <p class="text-offline text-sm">{{ loadError }}</p>
        }
        @if (loading) {
          <p class="text-muted text-sm">Loading organisations…</p>
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
            title="No organisations yet"
            desc="Create your first organisation to start provisioning screens and content."
          >
            <mns-btn variant="primary" icon="Plus" (mnsClick)="openCreateForm()">
              New Organisation
            </mns-btn>
          </mns-empty>
        }
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
  styles: ``,
})
export class Organisations implements OnInit {
  private orgService = inject(OrganisationService);
  private toast = inject(ToastService);

  protected readonly formatBytes = formatBytes;

  readonly tabs = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'Dashboard' as const },
    { label: 'Organisations', route: '/admin/organisations', icon: 'Building' as const },
    { label: 'Users', route: '/admin/users', icon: 'User' as const },
    { label: 'Audit Log', route: '/admin/audit-log', icon: 'Audit' as const },
  ];

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
            ? 'Access denied. Instance Admin privileges required.'
            : 'Failed to load organisations.';
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
            ? `Organisation “${saved.name}” updated.`
            : `Organisation “${saved.name}” created.`,
        );
      },
      error: (err) => {
        this.formError = err.error?.message || 'An error occurred. Please try again.';
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
        this.membersError = 'Failed to load members.';
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
        this.toast.success('Member added.');
      },
      error: (err) => {
        this.addMemberError = err.error?.message || 'Failed to add member.';
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
          this.toast.success(`Role updated to ${updated.role}.`);
        },
        error: (err) => {
          this.memberActionError = err.error?.message || 'Failed to update role.';
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
        this.toast.success('Member removed.');
      },
      error: (err) => {
        this.memberActionError = err.error?.message || 'Failed to remove member.';
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
        this.toast.success('Organisation deleted.');
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete organisation.';
        this.deletingOrg = false;
      },
    });
  }

  // ── Helpers ──

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
