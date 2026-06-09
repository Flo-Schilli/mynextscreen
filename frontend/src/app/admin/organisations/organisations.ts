import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrganisationService } from './organisation.service';
import { Organisation, OrgMember, OrgMemberRole } from './organisation.model';
import { OrgForm, OrganisationFormPayload } from './org-form';
import { OrgTable } from './org-table';
import { OrgMemberList } from './org-member-list';
import { OrgAddMemberModal, AddMemberPayload } from './org-add-member-modal';
import { OrgRemoveMemberModal } from './org-remove-member-modal';

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
  imports: [OrgForm, OrgTable, OrgMemberList, OrgAddMemberModal, OrgRemoveMemberModal],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Organisations</h1>
        </div>
        @if (!showForm && !selectedOrg) {
          <button class="btn btn-primary" (click)="openCreateForm()">+ New Organisation</button>
        }
      </header>

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
        <div class="detail-header">
          <button class="back-btn" (click)="deselectOrg()">&#8592; All Organisations</button>
          <h2>{{ selectedOrg.name }}</h2>
          <button class="btn btn-small" (click)="openEditForm(selectedOrg)">Edit</button>
        </div>

        <div class="org-info">
          <span class="info-tag">{{ selectedOrg.timeZone }}</span>
          <span class="info-tag"
            >Original: {{ formatBytes(selectedOrg.storageOriginalUsedBytes) }} /
            {{ formatBytes(selectedOrg.storageOriginalLimitBytes) }}</span
          >
          <span class="info-tag"
            >Transcoded: {{ formatBytes(selectedOrg.storageTranscodedUsedBytes) }} /
            {{ formatBytes(selectedOrg.storageTranscodedLimitBytes) }}</span
          >
        </div>

        <!-- Members section -->
        <div class="section-header">
          <h3>Members</h3>
          <button class="btn btn-primary btn-small" (click)="openAddMemberModal()">
            + Add Member
          </button>
        </div>

        @if (membersLoading) {
          <p class="loading-text">Loading members...</p>
        }

        @if (membersError) {
          <p class="error">{{ membersError }}</p>
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
          <p class="empty-text">No members yet. Add one above.</p>
        }

        @if (memberActionError) {
          <p class="error">{{ memberActionError }}</p>
        }
      }

      <!-- ── Organisations List ── -->
      @if (!selectedOrg && !showForm) {
        @if (loadError) {
          <p class="error">{{ loadError }}</p>
        }

        @if (loading) {
          <p class="loading-text">Loading organisations...</p>
        }

        @if (!loading && organisations.length > 0) {
          <app-org-table
            [organisations]="organisations"
            [memberCounts]="memberCounts"
            (selectOrg)="selectOrg($event)"
          />
        }

        @if (!loading && organisations.length === 0 && !loadError) {
          <p class="empty-text">No organisations yet. Create your first one.</p>
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
    </div>
  `,
  styles: `
    /* Detail header */
    .detail-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .detail-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }

    .org-info {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .info-tag {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      padding: 0.25rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .section-header h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }
  `,
})
export class Organisations implements OnInit {
  private orgService = inject(OrganisationService);
  private router = inject(Router);

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
            ? 'Access denied. Super-admin privileges required.'
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
      },
      error: (err) => {
        this.memberActionError = err.error?.message || 'Failed to remove member.';
        this.removingMemberId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
      },
    });
  }

  // ── Helpers ──

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
