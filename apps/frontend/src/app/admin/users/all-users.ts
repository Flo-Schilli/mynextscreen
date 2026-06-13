import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AdminUserService } from './admin-user.service';
import { AdminUser } from './admin-user.model';
import { UserDeleteModal } from './user-delete-modal';

/**
 * Smart container for the (super-admin) user overview. Owns data loading and the
 * delete HTTP call; renders every platform user with verification status,
 * super-admin flag and their org memberships, with a per-row delete action.
 */
@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [DatePipe, UserDeleteModal],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Users</h1>
        </div>
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading users...</p>
      }

      @if (!loading && users.length > 0) {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Role</th>
                <th>Organisations</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users; track user.id) {
                <tr>
                  <td>{{ user.email }}</td>
                  <td>{{ user.name || '(no name)' }}</td>
                  <td>
                    @if (user.emailVerified) {
                      <span class="badge badge-verified">verified</span>
                    } @else {
                      <span class="badge badge-pending">pending</span>
                    }
                  </td>
                  <td>
                    @if (user.isSuperAdmin) {
                      <span class="badge badge-admin">instance-admin</span>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td>
                    @if (user.memberships.length > 0) {
                      <div class="org-list">
                        @for (m of user.memberships; track m.organisationId) {
                          <span class="org-tag">{{ m.organisationName }} ({{ m.role }})</span>
                        }
                      </div>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>
                  <td>{{ user.createdAt | date: 'mediumDate' }}</td>
                  <td>
                    <button
                      class="btn btn-small btn-danger"
                      (click)="confirmDelete(user)"
                      [disabled]="deletingUserId === user.id"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!loading && users.length === 0 && !loadError) {
        <p class="empty-text">No users yet.</p>
      }

      @if (showDeleteModal && deletingUser) {
        <app-user-delete-modal
          [user]="deletingUser"
          [deleting]="deletingUserId !== null"
          [error]="deleteError"
          (confirm)="executeDelete()"
          (dismiss)="cancelDelete()"
        />
      }
    </div>
  `,
  styles: `
    tr:hover td {
      background: var(--color-bg-tertiary);
    }
    .org-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .org-tag {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-verified {
      background: #065f46;
      color: #d1fae5;
    }
    .badge-pending {
      background: #92400e;
      color: #fde68a;
    }
    .badge-admin {
      background: #f59e0b;
      color: #fff;
    }
    .muted {
      color: var(--color-text-muted);
    }
  `,
})
export class AllUsers implements OnInit {
  private userService = inject(AdminUserService);
  private router = inject(Router);

  users: AdminUser[] = [];
  loading = true;
  loadError = '';

  showDeleteModal = false;
  deletingUser: AdminUser | null = null;
  deletingUserId: string | null = null;
  deleteError = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.loadError = '';
    this.userService.getAll().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.loadError =
          err.status === 403
            ? 'Access denied. Instance Admin privileges required.'
            : 'Failed to load users.';
        this.loading = false;
      },
    });
  }

  confirmDelete(user: AdminUser): void {
    this.deletingUser = user;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    if (this.deletingUserId) return;
    this.showDeleteModal = false;
    this.deletingUser = null;
    this.deleteError = '';
  }

  executeDelete(): void {
    if (!this.deletingUser || this.deletingUserId) return;

    this.deletingUserId = this.deletingUser.id;
    this.deleteError = '';
    this.userService.delete(this.deletingUser.id).subscribe({
      next: () => {
        this.deletingUserId = null;
        this.showDeleteModal = false;
        this.deletingUser = null;
        this.loadUsers();
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete user.';
        this.deletingUserId = null;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
