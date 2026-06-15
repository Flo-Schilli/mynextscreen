import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MemberService } from './member.service';
import { Membership, MyMembership, OrganisationRole } from './member.model';
import { ToastService } from '../../shared/toast/toast.service';
import { BtnComponent, SFieldComponent, SInputComponent, EmptyComponent } from '../../ui';

/** Pragmatic email check for client-side gating; the server is the source of truth. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    BtnComponent,
    SFieldComponent,
    SInputComponent,
    EmptyComponent,
  ],
  template: `
    <!-- Tab bar (shared underline style across all three settings tabs) -->
    <div class="flex gap-1 border-b border-border mb-[var(--gap,1.5rem)]">
      <a class="settings-tab settings-tab--active" aria-current="page">User Management</a>
      <a class="settings-tab" routerLink="/settings/org/notifications">Notification Config</a>
      <a class="settings-tab" routerLink="/settings/org/storage">Storage</a>
    </div>

    @if (loadError()) {
      <p class="error text-sm text-offline mt-3">{{ loadError() }}</p>
    }

    @if (loading()) {
      <p class="loading-text text-sm text-muted mt-6">Loading members...</p>
    }

    @if (!loading() && members().length > 0) {
      <!-- Members count + invite action (single row) -->
      <div class="flex items-center justify-between gap-6 flex-wrap mb-5">
        <div class="flex items-center gap-3">
          <span
            class="w-[38px] h-[38px] rounded-[11px] bg-accent-soft text-accent grid place-items-center"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <div>
            <div class="font-mono text-lg font-bold leading-tight">
              {{ members().length }}
            </div>
            <div class="text-xs text-muted">Members</div>
          </div>
        </div>

        <mns-btn variant="primary" icon="Plus" (mnsClick)="openInviteModal()">
          Invite User
        </mns-btn>
      </div>

      <!-- Members table -->
      <div
        class="table-container bg-surface border border-border rounded-lg overflow-hidden shadow-[var(--shadow)]"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface-2 border-b border-border">
              <th
                class="text-left px-5 py-3 text-[10.5px] font-bold uppercase tracking-[.07em] text-faint"
              >
                Name
              </th>
              <th
                class="text-left px-5 py-3 text-[10.5px] font-bold uppercase tracking-[.07em] text-faint"
              >
                Email
              </th>
              <th
                class="text-left px-5 py-3 text-[10.5px] font-bold uppercase tracking-[.07em] text-faint"
              >
                Role
              </th>
              <th
                class="text-left px-5 py-3 text-[10.5px] font-bold uppercase tracking-[.07em] text-faint"
              >
                Status
              </th>
              <th
                class="text-left px-5 py-3 text-[10.5px] font-bold uppercase tracking-[.07em] text-faint"
              >
                Joined
              </th>
              <th
                class="text-right px-5 py-3 text-[10.5px] font-bold uppercase tracking-[.07em] text-faint"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            @for (member of members(); track member.id) {
              <tr
                class="border-t border-border hover:bg-surface-2 transition-colors duration-[120ms]"
              >
                <td class="px-5 py-3.5 font-semibold">{{ member.user.name || '(no name)' }}</td>
                <td class="px-5 py-3.5 text-muted">{{ member.user.email }}</td>
                <td class="px-5 py-3.5">
                  <select
                    class="role-select bg-surface-2 border border-border rounded-[9px] px-2 py-1 text-[13.5px] text-text cursor-pointer focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft disabled:opacity-50 disabled:cursor-not-allowed"
                    [ngModel]="member.role"
                    (ngModelChange)="changeRole(member, $event)"
                    [disabled]="updatingUserId() === member.userId"
                  >
                    <option value="org_admin">Org Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td class="px-5 py-3.5">
                  @if (member.status === 'pending') {
                    <span
                      class="status-badge status-pending inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold bg-warning-dim text-warning border border-warning/30"
                    >
                      Pending invite
                    </span>
                  } @else {
                    <span
                      class="status-badge status-active inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold bg-online-dim text-online border border-online/30"
                    >
                      Active
                    </span>
                  }
                </td>
                <td class="px-5 py-3.5 font-mono text-[12.5px] text-muted">
                  {{ member.createdAt | date: 'mediumDate' }}
                </td>
                <td class="px-5 py-3.5 text-right">
                  <mns-btn
                    variant="danger"
                    size="sm"
                    icon="Trash"
                    [disabled]="removingUserId() === member.userId"
                    (mnsClick)="confirmRemove(member)"
                  >
                    Remove
                  </mns-btn>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (!loading() && members().length === 0 && !loadError()) {
      <div class="empty-text">
        <mns-empty
          icon="User"
          title="No members yet"
          desc="No members found. Invite your first teammate to give them access."
        >
          <mns-btn variant="primary" icon="Plus" (mnsClick)="openInviteModal()">
            Invite User
          </mns-btn>
        </mns-empty>
      </div>
    }

    @if (actionError()) {
      <p class="error text-sm text-offline mt-3">{{ actionError() }}</p>
    }

    <!-- Invite modal -->
    @if (showInviteModal()) {
      <div
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[6px]"
        role="dialog"
        aria-modal="true"
        aria-label="Invite user"
        tabindex="0"
        (click)="closeInviteModal()"
        (keydown.escape)="closeInviteModal()"
      >
        <div
          class="modal bg-surface border border-border-strong rounded-xl shadow-[var(--shadow-lg)] w-full max-w-[480px] overflow-hidden"
          role="document"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <!-- Modal header -->
          <div class="flex items-center gap-3 px-6 py-5 border-b border-border">
            <span
              class="w-10 h-10 rounded-[11px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 5l8 7 8-7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <div class="flex-1">
              <div class="text-[17px] font-bold">Invite a user</div>
              <div class="text-[13px] text-muted">
                They'll get an email to join your organisation
              </div>
            </div>
            <button
              type="button"
              class="w-8 h-8 rounded-[8px] border border-border bg-transparent text-muted grid place-items-center hover:bg-surface-2 transition-colors"
              (click)="closeInviteModal()"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <!-- Modal body -->
          <form class="p-6 flex flex-col gap-4" (ngSubmit)="submitInvite()">
            <mns-sfield label="Email address">
              <mns-sinput
                [(value)]="inviteEmail"
                placeholder="name@company.com"
                type="email"
                icon="Mail"
              />
            </mns-sfield>

            <mns-sfield label="Role">
              <select
                class="w-full bg-surface-2 border border-border-strong rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold text-text focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                [(ngModel)]="inviteRole"
                name="inviteRole"
                required
              >
                <option value="org_admin">Org Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </mns-sfield>

            @if (inviteError()) {
              <p class="error text-sm text-offline">{{ inviteError() }}</p>
            }

            <div class="form-actions flex gap-2.5 mt-1">
              <mns-btn
                class="flex-1"
                variant="outline"
                [full]="true"
                (mnsClick)="closeInviteModal()"
              >
                Cancel
              </mns-btn>
              <mns-btn
                class="flex-1"
                variant="primary"
                [full]="true"
                icon="Mail"
                [disabled]="inviting() || !isInviteEmailValid()"
                (mnsClick)="submitInvite()"
              >
                {{ inviting() ? 'Inviting...' : 'Send invite' }}
              </mns-btn>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Remove confirm modal -->
    @if (showRemoveConfirm()) {
      <div
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[6px]"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm removal"
        tabindex="0"
        (click)="cancelRemove()"
        (keydown.escape)="cancelRemove()"
      >
        <div
          class="modal bg-surface border border-border-strong rounded-xl shadow-[var(--shadow-lg)] w-full max-w-[420px] p-6"
          role="document"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <h2 class="text-[17px] font-bold mb-2">Remove Member</h2>
          <p class="text-[13.5px] text-muted mb-5">
            Are you sure you want to remove
            <strong class="text-text">{{ removingMember()?.user?.email }}</strong>
            from this organisation?
          </p>
          <div class="form-actions flex gap-2.5">
            <mns-btn variant="outline" [full]="true" (mnsClick)="cancelRemove()"> Cancel </mns-btn>
            <mns-btn
              variant="danger"
              [full]="true"
              [disabled]="removingUserId() !== null"
              (mnsClick)="executeRemove()"
            >
              {{ removingUserId() ? 'Removing...' : 'Remove' }}
            </mns-btn>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .settings-tab {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      margin-bottom: -1px;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s;
    }
    .settings-tab:hover {
      color: var(--text);
    }
    .settings-tab--active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
    }
  `,
})
export class Users implements OnInit {
  private memberService = inject(MemberService);
  private router = inject(Router);
  private toast = inject(ToastService);

  orgId = '';
  // Async-updated, template-read state — signals so OnPush re-renders after
  // HTTP callbacks complete (an XHR callback mutating a plain field does not
  // mark an OnPush component dirty, even under zone.js).
  readonly members = signal<Membership[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');

  // Invite modal state
  readonly showInviteModal = signal(false);
  readonly inviteEmail = signal('');
  inviteRole: OrganisationRole = 'viewer'; // plain — [(ngModel)] has no signal two-way
  readonly inviteError = signal('');
  readonly inviting = signal(false);
  // Send invite stays disabled until a syntactically valid email is entered.
  readonly isInviteEmailValid = computed(() => EMAIL_PATTERN.test(this.inviteEmail().trim()));

  // Role change state
  readonly updatingUserId = signal<string | null>(null);

  // Remove confirmation state
  readonly showRemoveConfirm = signal(false);
  readonly removingMember = signal<Membership | null>(null);
  readonly removingUserId = signal<string | null>(null);

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
          this.loadError.set('You do not have Org Admin access to any organisation.');
          this.loading.set(false);
        } else {
          this.loadError.set('You are not a member of any organisation.');
          this.loading.set(false);
        }
      },
      error: () => {
        this.loadError.set('Failed to load organisation context.');
        this.loading.set(false);
      },
    });
  }

  loadMembers(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.actionError.set('');
    this.memberService.listMembers(this.orgId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          err.status === 403
            ? 'Access denied. Org Admin privileges required.'
            : 'Failed to load members.',
        );
        this.loading.set(false);
      },
    });
  }

  openInviteModal(): void {
    this.inviteEmail.set('');
    this.inviteRole = 'viewer';
    this.inviteError.set('');
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  submitInvite(): void {
    if (!this.isInviteEmailValid()) {
      this.inviteError.set('A valid email is required.');
      return;
    }

    this.inviting.set(true);
    this.inviteError.set('');
    this.memberService
      .addMember(this.orgId, { email: this.inviteEmail().trim(), role: this.inviteRole })
      .subscribe({
        next: () => {
          this.inviting.set(false);
          this.showInviteModal.set(false);
          this.loadMembers();
          this.toast.success('Member invited.');
        },
        error: (err) => {
          this.inviteError.set(err.error?.message || 'Failed to invite user.');
          this.inviting.set(false);
        },
      });
  }

  changeRole(member: Membership, newRole: OrganisationRole): void {
    if (newRole === member.role) return;

    this.updatingUserId.set(member.userId);
    this.actionError.set('');
    this.memberService.updateRole(this.orgId, member.userId, { role: newRole }).subscribe({
      next: (updated) => {
        this.members.update((list) =>
          list.map((m) => (m.userId === member.userId ? { ...m, role: updated.role } : m)),
        );
        this.updatingUserId.set(null);
        this.toast.success('Role updated.');
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Failed to update role.');
        this.updatingUserId.set(null);
      },
    });
  }

  confirmRemove(member: Membership): void {
    this.removingMember.set(member);
    this.showRemoveConfirm.set(true);
  }

  cancelRemove(): void {
    this.showRemoveConfirm.set(false);
    this.removingMember.set(null);
  }

  executeRemove(): void {
    const member = this.removingMember();
    if (!member) return;

    this.removingUserId.set(member.userId);
    this.actionError.set('');
    this.memberService.removeMember(this.orgId, member.userId).subscribe({
      next: () => {
        this.removingUserId.set(null);
        this.showRemoveConfirm.set(false);
        this.removingMember.set(null);
        this.loadMembers();
        this.toast.success('Member removed.');
      },
      error: (err) => {
        this.actionError.set(err.error?.message || 'Failed to remove member.');
        this.removingUserId.set(null);
        this.showRemoveConfirm.set(false);
        this.removingMember.set(null);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
