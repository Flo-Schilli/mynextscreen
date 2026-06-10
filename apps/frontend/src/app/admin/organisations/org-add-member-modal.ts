import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrgMemberRole } from './organisation.model';

export interface AddMemberPayload {
  email: string;
  role: OrgMemberRole;
}

/**
 * Add-member modal. Owns its own email/role field state, validates locally and
 * emits a resolved {@link AddMemberPayload}. The parent performs the HTTP
 * request and feeds `adding`/`error` back in.
 */
@Component({
  selector: 'app-org-add-member-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Add member"
      tabindex="0"
      (click)="dismiss.emit()"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        role="document"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <h2>Add Member</h2>
        <form (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="memberEmail">Email</label>
            <input
              id="memberEmail"
              type="email"
              [(ngModel)]="email"
              name="memberEmail"
              required
              placeholder="user@example.com"
            />
          </div>
          <div class="form-group">
            <label for="memberRole">Role</label>
            <select id="memberRole" [(ngModel)]="role" name="memberRole" required>
              <option value="org_admin">Org Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          @if (localError() || error()) {
            <p class="error">{{ localError() || error() }}</p>
          }
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="adding()">
              {{ adding() ? 'Adding...' : 'Add Member' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class OrgAddMemberModal {
  readonly adding = input.required<boolean>();
  readonly error = input.required<string>();

  readonly add = output<AddMemberPayload>();
  readonly dismiss = output<void>();

  protected email = '';
  protected role: OrgMemberRole = 'viewer';
  protected readonly localError = signal('');

  onSubmit(): void {
    if (!this.email) {
      this.localError.set('Email is required.');
      return;
    }

    this.localError.set('');
    this.add.emit({ email: this.email, role: this.role });
  }
}
