import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrgMember, OrgMemberRole } from './organisation.model';

/**
 * Presentational organisation members table. Renders each member with an inline
 * role selector and a remove button; emits role changes and removals. The
 * parent owns the HTTP calls and feeds the in-flight `updatingMemberId`/
 * `removingMemberId` back in to disable the relevant controls.
 */
@Component({
  selector: 'app-org-member-list',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
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
          @for (member of members(); track member.id) {
            <tr>
              <td>{{ member.user.name || '(no name)' }}</td>
              <td>{{ member.user.email }}</td>
              <td>
                <select
                  class="role-select"
                  [ngModel]="member.role"
                  (ngModelChange)="changeRole.emit({ member, newRole: $event })"
                  [disabled]="updatingMemberId() === member.userId"
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
                  (click)="removeMember.emit(member)"
                  [disabled]="removingMemberId() === member.userId"
                >
                  Remove
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    tr:hover td {
      background: var(--color-bg-tertiary);
    }
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
  `,
})
export class OrgMemberList {
  readonly members = input.required<OrgMember[]>();
  readonly updatingMemberId = input.required<string | null>();
  readonly removingMemberId = input.required<string | null>();

  readonly changeRole = output<{ member: OrgMember; newRole: OrgMemberRole }>();
  readonly removeMember = output<OrgMember>();
}
