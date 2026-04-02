import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScreenGroupService } from './screen-group.service';
import { ScreenGroup, ScreenGroupMode, CreateScreenGroupRequest, UpdateScreenGroupRequest } from './screen-group.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';

@Component({
  selector: 'app-screen-groups',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Screen Groups</h1>
        </div>
        @if (!loading && !showCreateForm) {
          <button class="btn btn-primary" (click)="openCreateForm()">
            + New Group
          </button>
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
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Create Screen Group"
             tabindex="0" (click)="cancelCreate()" (keydown.escape)="cancelCreate()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Create Screen Group</h2>
            <form (ngSubmit)="submitCreate()">
              <div class="form-group">
                <label for="createName">Name</label>
                <input
                  id="createName"
                  type="text"
                  [(ngModel)]="createName"
                  name="createName"
                  required
                  placeholder="e.g. Lobby Video Wall"
                />
              </div>
              <div class="form-group">
                <label for="createMode">Mode</label>
                <select id="createMode" [(ngModel)]="createMode" name="createMode" required>
                  <option value="mirror">Mirror</option>
                  <option value="split">Split (Video Wall)</option>
                </select>
              </div>
              @if (createMode === 'split') {
                <div class="form-row">
                  <div class="form-group">
                    <label for="createGridColumns">Grid Columns</label>
                    <input
                      id="createGridColumns"
                      type="number"
                      [(ngModel)]="createGridColumns"
                      name="createGridColumns"
                      required
                      min="1"
                      max="10"
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div class="form-group">
                    <label for="createGridRows">Grid Rows</label>
                    <input
                      id="createGridRows"
                      type="number"
                      [(ngModel)]="createGridRows"
                      name="createGridRows"
                      required
                      min="1"
                      max="10"
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
              }
              @if (createError) {
                <p class="error">{{ createError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelCreate()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="creating">
                  {{ creating ? 'Creating...' : 'Create Group' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Groups Table -->
      @if (!loading && groups.length > 0) {
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mode</th>
                <th>Grid Size</th>
                <th>Screen Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (group of groups; track group.id) {
                <tr>
                  <td class="name-cell"><a class="group-link" tabindex="0" role="link" (click)="viewGroup(group)" (keydown.enter)="viewGroup(group)">{{ group.name }}</a></td>
                  <td>
                    <span class="mode-badge" [class.mirror]="group.mode === 'mirror'" [class.split]="group.mode === 'split'">
                      {{ group.mode === 'mirror' ? 'Mirror' : 'Split' }}
                    </span>
                  </td>
                  <td>{{ group.mode === 'split' && group.gridColumns && group.gridRows ? group.gridColumns + 'x' + group.gridRows : '-' }}</td>
                  <td>{{ group.screens.length }}</td>
                  <td class="actions-cell">
                    <button class="btn btn-small btn-secondary" (click)="editGroup(group)">Edit</button>
                    <button class="btn btn-small btn-danger" (click)="confirmDelete(group)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && groups.length === 0 && !loadError) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <rect x="28" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <rect x="4" y="30" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <rect x="28" y="30" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M20 12h8M12 18v12M36 18v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 3"/>
            </svg>
          </div>
          <p class="empty-title">No screen groups yet</p>
          <p class="empty-text">Create your first screen group to start building mirror displays or video walls.</p>
          <button class="btn btn-primary" (click)="openCreateForm()">Create Your First Group</button>
        </div>
      }

      @if (actionError) {
        <p class="error">{{ actionError }}</p>
      }

      <!-- Edit Group Modal -->
      @if (editingGroup) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Screen Group"
             tabindex="0" (click)="cancelEdit()" (keydown.escape)="cancelEdit()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Edit Screen Group</h2>
            <form (ngSubmit)="submitEdit()">
              <div class="form-group">
                <label for="editName">Name</label>
                <input
                  id="editName"
                  type="text"
                  [(ngModel)]="editName"
                  name="editName"
                  required
                />
              </div>
              <div class="form-group">
                <label for="editMode">Mode</label>
                <select id="editMode" [(ngModel)]="editMode" name="editMode" required>
                  <option value="mirror">Mirror</option>
                  <option value="split">Split (Video Wall)</option>
                </select>
              </div>
              @if (editMode === 'split') {
                <div class="form-row">
                  <div class="form-group">
                    <label for="editGridColumns">Grid Columns</label>
                    <input
                      id="editGridColumns"
                      type="number"
                      [(ngModel)]="editGridColumns"
                      name="editGridColumns"
                      required
                      min="1"
                      max="10"
                    />
                  </div>
                  <div class="form-group">
                    <label for="editGridRows">Grid Rows</label>
                    <input
                      id="editGridRows"
                      type="number"
                      [(ngModel)]="editGridRows"
                      name="editGridRows"
                      required
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              }
              @if (editError) {
                <p class="error">{{ editError }}</p>
              }
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="saving">
                  {{ saving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingGroup) {
        <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm deletion"
             tabindex="0" (click)="cancelDelete()" (keydown.escape)="cancelDelete()">
          <div class="modal" role="document" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
            <h2>Delete Screen Group</h2>
            @if (deletingGroup.screens.length > 0) {
              <div class="delete-blocked">
                Cannot delete "{{ deletingGroup.name }}" because it still has {{ deletingGroup.screens.length }} assigned screen(s). Remove all screens from the group before deleting it.
              </div>
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelDelete()">Close</button>
              </div>
            } @else {
              <p>Are you sure you want to delete the screen group <strong>{{ deletingGroup.name }}</strong>? This action cannot be undone.</p>
              @if (deleteError) {
                <p class="error">{{ deleteError }}</p>
              }
              <div class="form-actions">
                <button class="btn btn-secondary" (click)="cancelDelete()">Cancel</button>
                <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
                  {{ deleting ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            }
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
    .btn-secondary:hover:not(:disabled) {
      background: var(--color-border);
    }
    .btn-danger {
      background: #991b1b;
      color: #fecaca;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }
    .btn-small {
      padding: 0.25rem 0.625rem;
      font-size: 0.8125rem;
    }

    /* Table */
    .table-container {
      width: 100%;
      overflow-x: auto;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px var(--color-shadow), 0 1px 2px var(--color-shadow);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: var(--color-bg-tertiary);
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border);
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .name-cell {
      font-weight: 500;
    }
    .group-link {
      color: var(--color-accent);
      cursor: pointer;
      text-decoration: none;
    }
    .group-link:hover {
      text-decoration: underline;
    }
    .actions-cell {
      display: flex;
      gap: 0.5rem;
    }

    /* Mode Badge */
    .mode-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
    }
    .mode-badge.mirror {
      background: #3b82f620;
      color: #3b82f6;
    }
    .mode-badge.split {
      background: #a855f720;
      color: #a855f7;
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
      max-width: 36rem;
      width: 100%;
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

    /* Form */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
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
    .form-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    /* Delete blocked */
    .delete-blocked {
      background: #92400e20;
      border: 1px solid #92400e;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: #fbbf24;
      line-height: 1.5;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }
    .empty-icon {
      color: var(--color-text-muted);
      margin-bottom: 1rem;
    }
    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 0.5rem;
    }
    .empty-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page {
        padding: 1rem;
      }
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
      .modal {
        min-width: auto;
        margin: 1rem;
      }
    }
  `,
})
export class ScreenGroups implements OnInit {
  private screenGroupService = inject(ScreenGroupService);
  private memberService = inject(MemberService);
  private router = inject(Router);

  orgId = '';
  groups: ScreenGroup[] = [];
  loading = true;
  loadError = '';
  actionError = '';

  // Create form state
  showCreateForm = false;
  createName = '';
  createMode: ScreenGroupMode = 'mirror';
  createGridColumns = 2;
  createGridRows = 2;
  createError = '';
  creating = false;

  // Edit state
  editingGroup: ScreenGroup | null = null;
  editName = '';
  editMode: ScreenGroupMode = 'mirror';
  editGridColumns = 2;
  editGridRows = 2;
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
        this.loadError =
          err.status === 403
            ? 'Access denied.'
            : 'Failed to load screen groups.';
        this.loading = false;
      },
    });
  }

  // --- Create ---
  openCreateForm(): void {
    this.createName = '';
    this.createMode = 'mirror';
    this.createGridColumns = 2;
    this.createGridRows = 2;
    this.createError = '';
    this.showCreateForm = true;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
  }

  submitCreate(): void {
    if (!this.createName) {
      this.createError = 'Name is required.';
      return;
    }
    if (this.createMode === 'split' && (!this.createGridColumns || !this.createGridRows)) {
      this.createError = 'Grid columns and rows are required for split mode.';
      return;
    }

    this.creating = true;
    this.createError = '';
    const dto: CreateScreenGroupRequest = {
      name: this.createName,
      mode: this.createMode,
      ...(this.createMode === 'split' ? { gridColumns: this.createGridColumns, gridRows: this.createGridRows } : {}),
    };
    this.screenGroupService.create(this.orgId, dto).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
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
    this.editName = group.name;
    this.editMode = group.mode;
    this.editGridColumns = group.gridColumns ?? 2;
    this.editGridRows = group.gridRows ?? 2;
    this.editError = '';
  }

  cancelEdit(): void {
    this.editingGroup = null;
  }

  submitEdit(): void {
    if (!this.editingGroup) return;
    if (!this.editName) {
      this.editError = 'Name is required.';
      return;
    }
    if (this.editMode === 'split' && (!this.editGridColumns || !this.editGridRows)) {
      this.editError = 'Grid columns and rows are required for split mode.';
      return;
    }

    this.saving = true;
    this.editError = '';
    const dto: UpdateScreenGroupRequest = {
      name: this.editName,
      mode: this.editMode,
      ...(this.editMode === 'split' ? { gridColumns: this.editGridColumns, gridRows: this.editGridRows } : {}),
    };
    this.screenGroupService.update(this.orgId, this.editingGroup.id, dto).subscribe({
      next: () => {
        this.saving = false;
        this.editingGroup = null;
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
