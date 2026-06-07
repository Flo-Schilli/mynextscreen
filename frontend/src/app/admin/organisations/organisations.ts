import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganisationService } from './organisation.service';
import { Organisation, OrgMember, OrgMemberRole } from './organisation.model';
import { IANA_TIME_ZONES } from './timezones';

@Component({
  selector: 'app-organisations',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <div class="form-card">
          <h2>{{ editingId ? 'Edit Organisation' : 'Create Organisation' }}</h2>
          <form (ngSubmit)="submitForm()">
            <div class="form-group">
              <label for="name">Name</label>
              <input
                id="name"
                type="text"
                [(ngModel)]="formData.name"
                name="name"
                required
                placeholder="Organisation name"
              />
            </div>

            <div class="form-group">
              <label for="timeZone">Time Zone</label>
              <select id="timeZone" [(ngModel)]="formData.timeZone" name="timeZone" required>
                <option value="" disabled>Select a time zone</option>
                @for (tz of timeZones; track tz) {
                  <option [value]="tz">{{ tz }}</option>
                }
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="storageOriginal">Original Storage Limit (MB)</label>
                <input
                  id="storageOriginal"
                  type="number"
                  [(ngModel)]="storageOriginalMB"
                  name="storageOriginal"
                  required
                  min="0"
                />
              </div>
              <div class="form-group">
                <label for="storageTranscoded">Transcoded Storage Limit (MB)</label>
                <input
                  id="storageTranscoded"
                  type="number"
                  [(ngModel)]="storageTranscodedMB"
                  name="storageTranscoded"
                  required
                  min="0"
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting">
                {{ editingId ? 'Save Changes' : 'Create' }}
              </button>
            </div>
          </form>
          @if (formError) {
            <p class="error">{{ formError }}</p>
          }
        </div>
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
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (member of members; track member.id) {
                  <tr>
                    <td>{{ member.user.name || '(no name)' }}</td>
                    <td>{{ member.user.email }}</td>
                    <td>
                      <select
                        class="role-select"
                        [ngModel]="member.role"
                        (ngModelChange)="changeMemberRole(member, $event)"
                        [disabled]="updatingMemberId === member.userId"
                      >
                        <option value="org_admin">Org Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td>{{ member.createdAt | date: 'mediumDate' }}</td>
                    <td>
                      <button
                        class="btn btn-small btn-danger"
                        (click)="confirmRemoveMember(member)"
                        [disabled]="removingMemberId === member.userId"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Time Zone</th>
                  <th>Members</th>
                  <th>Original Limit</th>
                  <th>Transcoded Limit</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (org of organisations; track org.id) {
                  <tr class="clickable-row" (click)="selectOrg(org)">
                    <td>{{ org.name }}</td>
                    <td>{{ org.timeZone }}</td>
                    <td>{{ memberCounts[org.id] ?? '...' }}</td>
                    <td>{{ formatBytes(org.storageOriginalLimitBytes) }}</td>
                    <td>{{ formatBytes(org.storageTranscodedLimitBytes) }}</td>
                    <td>{{ org.createdAt | date: 'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (!loading && organisations.length === 0 && !loadError) {
          <p class="empty-text">No organisations yet. Create your first one.</p>
        }
      }

      <!-- ── Add Member Modal ── -->
      @if (showAddMemberModal) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add member"
          tabindex="0"
          (click)="closeAddMemberModal()"
          (keydown.escape)="closeAddMemberModal()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Add Member</h2>
            <form (ngSubmit)="submitAddMember()">
              <div class="form-group">
                <label for="memberEmail">Email</label>
                <input
                  id="memberEmail"
                  type="email"
                  [(ngModel)]="addMemberEmail"
                  name="memberEmail"
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div class="form-group">
                <label for="memberRole">Role</label>
                <select id="memberRole" [(ngModel)]="addMemberRole" name="memberRole" required>
                  <option value="org_admin">Org Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              @if (addMemberError) {
                <p class="error">{{ addMemberError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeAddMemberModal()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="addingMember">
                  {{ addingMember ? 'Adding...' : 'Add Member' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ── Remove Member Confirm Modal ── -->
      @if (showRemoveConfirm) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm removal"
          tabindex="0"
          (click)="cancelRemoveMember()"
          (keydown.escape)="cancelRemoveMember()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Remove Member</h2>
            <p>
              Are you sure you want to remove
              <strong>{{ removingMember?.user?.email }}</strong> from this organisation?
            </p>
            <div class="form-actions">
              <button class="btn btn-secondary" (click)="cancelRemoveMember()">Cancel</button>
              <button
                class="btn btn-danger"
                (click)="executeRemoveMember()"
                [disabled]="removingMemberId !== null"
              >
                {{ removingMemberId ? 'Removing...' : 'Remove' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 2rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .back-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .back-btn:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
    }

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

    /* Buttons */
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: var(--color-accent);
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
    .btn-secondary {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .btn-secondary:hover {
      background: var(--color-border);
    }
    .btn-small {
      padding: 0.25rem 0.75rem;
      font-size: 0.8125rem;
    }
    .btn-danger {
      background: #991b1b;
      color: #fecaca;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }

    /* Form */
    .form-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      max-width: 40rem;
    }
    .form-card h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      box-sizing: border-box;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-bg-secondary);
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow:
        0 1px 3px var(--color-shadow),
        0 1px 2px var(--color-shadow);
    }
    thead {
      background: var(--color-bg-tertiary);
      border-bottom: 2px solid var(--color-border);
    }
    th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
    }
    td {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      border-top: 1px solid var(--color-border);
    }
    tr:hover td {
      background: var(--color-bg-tertiary);
    }
    .clickable-row {
      cursor: pointer;
    }

    /* Role select */
    .role-select {
      padding: 0.25rem 0.5rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.8125rem;
      cursor: pointer;
    }
    .role-select:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .role-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      min-width: 24rem;
      max-width: 32rem;
    }
    .modal h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .modal p {
      margin: 0 0 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      line-height: 1.5;
    }

    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text,
    .empty-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
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
  editingId: string | null = null;
  submitting = false;
  formError = '';
  timeZones = IANA_TIME_ZONES;
  formData = { name: '', timeZone: '' };
  storageOriginalMB = 0;
  storageTranscodedMB = 0;

  // Selected org + members state
  selectedOrg: Organisation | null = null;
  members: OrgMember[] = [];
  membersLoading = false;
  membersError = '';
  memberActionError = '';

  // Add member modal state
  showAddMemberModal = false;
  addMemberEmail = '';
  addMemberRole: OrgMemberRole = 'viewer';
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
    this.editingId = null;
    this.formData = { name: '', timeZone: '' };
    this.storageOriginalMB = 0;
    this.storageTranscodedMB = 0;
    this.formError = '';
    this.showForm = true;
  }

  openEditForm(org: Organisation): void {
    this.editingId = org.id;
    this.formData = { name: org.name, timeZone: org.timeZone };
    this.storageOriginalMB = Math.round(org.storageOriginalLimitBytes / (1024 * 1024));
    this.storageTranscodedMB = Math.round(org.storageTranscodedLimitBytes / (1024 * 1024));
    this.formError = '';
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.formError = '';
  }

  submitForm(): void {
    if (!this.formData.name || !this.formData.timeZone) {
      this.formError = 'Name and time zone are required.';
      return;
    }

    this.submitting = true;
    this.formError = '';

    const payload = {
      name: this.formData.name,
      timeZone: this.formData.timeZone,
      storageOriginalLimitBytes: this.storageOriginalMB * 1024 * 1024,
      storageTranscodedLimitBytes: this.storageTranscodedMB * 1024 * 1024,
    };

    const request$ = this.editingId
      ? this.orgService.update(this.editingId, payload)
      : this.orgService.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.showForm = false;
        this.submitting = false;
        if (this.editingId && this.selectedOrg) {
          this.selectedOrg = saved;
        }
        this.editingId = null;
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
    this.addMemberEmail = '';
    this.addMemberRole = 'viewer';
    this.addMemberError = '';
    this.showAddMemberModal = true;
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
  }

  submitAddMember(): void {
    if (!this.addMemberEmail || !this.selectedOrg) {
      this.addMemberError = 'Email is required.';
      return;
    }

    this.addingMember = true;
    this.addMemberError = '';
    this.orgService
      .addMember(this.selectedOrg.id, {
        email: this.addMemberEmail,
        role: this.addMemberRole,
      })
      .subscribe({
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
