import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MemberService } from './member.service';
import { Membership, MyMembership, OrganisationRole } from './member.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>User Management</h1>
        </div>
        @if (!loading && members.length > 0) {
          <button class="btn btn-primary" (click)="openInviteModal()">+ Invite User</button>
        }
      </header>

      <nav class="settings-nav">
        <a class="settings-nav-link active">User Management</a>
        <a class="settings-nav-link" routerLink="/settings/org/notifications"
          >Notification Config</a
        >
      </nav>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading members...</p>
      }

      @if (!loading && members.length > 0) {
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
                      (ngModelChange)="changeRole(member, $event)"
                      [disabled]="updatingUserId === member.userId"
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
                      (click)="confirmRemove(member)"
                      [disabled]="removingUserId === member.userId"
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

      @if (!loading && members.length === 0 && !loadError) {
        <p class="empty-text">No members found.</p>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      @if (showInviteModal) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Invite user"
          tabindex="0"
          (click)="closeInviteModal()"
          (keydown.escape)="closeInviteModal()"
        >
          <div
            class="modal"
            role="document"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2>Invite User</h2>
            <form (ngSubmit)="submitInvite()">
              <div class="form-group">
                <label for="inviteEmail">Email</label>
                <input
                  id="inviteEmail"
                  type="email"
                  [(ngModel)]="inviteEmail"
                  name="inviteEmail"
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div class="form-group">
                <label for="inviteRole">Role</label>
                <select id="inviteRole" [(ngModel)]="inviteRole" name="inviteRole" required>
                  <option value="org_admin">Org Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              @if (inviteError) {
                <p class="error">{{ inviteError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeInviteModal()">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="inviting">
                  {{ inviting ? 'Inviting...' : 'Invite' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (showRemoveConfirm) {
        <div
          class="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm removal"
          tabindex="0"
          (click)="cancelRemove()"
          (keydown.escape)="cancelRemove()"
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
              <button class="btn btn-secondary" (click)="cancelRemove()">Cancel</button>
              <button
                class="btn btn-danger"
                (click)="executeRemove()"
                [disabled]="removingUserId !== null"
              >
                {{ removingUserId ? 'Removing...' : 'Remove' }}
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

    .settings-nav {
      display: flex;
      gap: 0;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }
    .settings-nav-link {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition:
        color 0.15s,
        border-color 0.15s;
    }
    .settings-nav-link:hover {
      color: var(--color-text-primary);
    }
    .settings-nav-link.active {
      color: var(--color-text-primary);
      border-bottom-color: var(--color-accent);
      font-weight: 500;
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

    /* Form */
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
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
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
      box-shadow: 0 8px 24px var(--color-shadow);
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
export class Users implements OnInit {
  private memberService = inject(MemberService);
  private router = inject(Router);

  orgId = '';
  members: Membership[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Invite modal state
  showInviteModal = false;
  inviteEmail = '';
  inviteRole: OrganisationRole = 'viewer';
  inviteError = '';
  inviting = false;

  // Role change state
  updatingUserId: string | null = null;

  // Remove confirmation state
  showRemoveConfirm = false;
  removingMember: Membership | null = null;
  removingUserId: string | null = null;

  ngOnInit(): void {
    this.loadCurrentOrg();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
          this.loadMembers();
        } else if (memberships.length > 0) {
          this.loadError = 'You do not have Org Admin access to any organisation.';
          this.loading = false;
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

  loadMembers(): void {
    this.loading = true;
    this.loadError = '';
    this.actionError = '';
    this.memberService.listMembers(this.orgId).subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? 'Access denied. Org Admin privileges required.'
            : 'Failed to load members.';
        this.loading = false;
      },
    });
  }

  openInviteModal(): void {
    this.inviteEmail = '';
    this.inviteRole = 'viewer';
    this.inviteError = '';
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  submitInvite(): void {
    if (!this.inviteEmail) {
      this.inviteError = 'Email is required.';
      return;
    }

    this.inviting = true;
    this.inviteError = '';
    this.memberService
      .addMember(this.orgId, { email: this.inviteEmail, role: this.inviteRole })
      .subscribe({
        next: () => {
          this.inviting = false;
          this.showInviteModal = false;
          this.loadMembers();
        },
        error: (err) => {
          this.inviteError = err.error?.message || 'Failed to invite user.';
          this.inviting = false;
        },
      });
  }

  changeRole(member: Membership, newRole: OrganisationRole): void {
    if (newRole === member.role) return;

    this.updatingUserId = member.userId;
    this.actionError = '';
    this.memberService.updateRole(this.orgId, member.userId, { role: newRole }).subscribe({
      next: (updated) => {
        member.role = updated.role;
        this.updatingUserId = null;
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to update role.';
        this.updatingUserId = null;
      },
    });
  }

  confirmRemove(member: Membership): void {
    this.removingMember = member;
    this.showRemoveConfirm = true;
  }

  cancelRemove(): void {
    this.showRemoveConfirm = false;
    this.removingMember = null;
  }

  executeRemove(): void {
    if (!this.removingMember) return;

    this.removingUserId = this.removingMember.userId;
    this.actionError = '';
    this.memberService.removeMember(this.orgId, this.removingMember.userId).subscribe({
      next: () => {
        this.removingUserId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
        this.loadMembers();
      },
      error: (err) => {
        this.actionError = err.error?.message || 'Failed to remove member.';
        this.removingUserId = null;
        this.showRemoveConfirm = false;
        this.removingMember = null;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
