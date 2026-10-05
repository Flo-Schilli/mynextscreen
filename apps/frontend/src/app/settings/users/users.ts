import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MemberService } from './member.service';
import { Membership, MyMembership, OrganisationRole } from './member.model';
import { ToastService } from '../../shared/toast/toast.service';
import { SettingsTabsComponent } from '../settings-tabs.component';
import {
  AvatarComponent,
  BadgeComponent,
  BtnComponent,
  CardComponent,
  EmptyComponent,
  ModalComponent,
  OverlayComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectOption,
  SFieldComponent,
  SInputComponent,
} from '../../ui';

/** Pragmatic email check for client-side gating; the server is the source of truth. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    SettingsTabsComponent,
    AvatarComponent,
    BadgeComponent,
    BtnComponent,
    CardComponent,
    EmptyComponent,
    ModalComponent,
    OverlayComponent,
    PageHeaderComponent,
    SelectComponent,
    SFieldComponent,
    SInputComponent,
    TranslocoDirective,
  ],
  template: `
    <ng-container *transloco="let t">
      <app-settings-tabs />

      <mns-page-header
        [title]="t('settings.users.page.title')"
        [sub]="t('settings.users.page.subtitle')"
        icon="User"
      >
        <mns-btn variant="primary" icon="Plus" (mnsClick)="openInviteModal()">{{
          t('settings.users.page.invite')
        }}</mns-btn>
      </mns-page-header>

      @if (loadError()) {
        <p class="error text-sm text-offline mt-3">{{ loadError() }}</p>
      }

      @if (loading()) {
        <p class="loading-text text-sm text-muted mt-6">{{ t('settings.users.loading') }}</p>
      }

      @if (!loading() && members().length > 0) {
        <!-- Seat summary -->
        <div class="flex items-center gap-6 flex-wrap mb-[var(--gap,1.5rem)]">
          <div class="flex items-center gap-3">
            <span
              class="w-[38px] h-[38px] rounded-[11px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
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
              <div class="font-mono text-lg font-bold leading-tight">{{ activeCount() }}</div>
              <div class="text-xs text-muted">{{ t('settings.users.summary.members') }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span
              class="w-[38px] h-[38px] rounded-[11px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
            <div>
              <div class="font-mono text-lg font-bold leading-tight">{{ pendingCount() }}</div>
              <div class="text-xs text-muted">{{ t('settings.users.summary.pending') }}</div>
            </div>
          </div>
        </div>

        <!-- Members grid-card -->
        <mns-card [pad]="false" [animate]="true" class="block overflow-hidden">
          <!-- header row -->
          <div
            class="hidden min-[880px]:grid min-[880px]:[grid-template-columns:2fr_1.7fr_160px_140px_116px_96px] gap-3 px-[22px] py-[13px] bg-surface-2 border-b border-border"
          >
            <div class="text-[10.5px] font-bold uppercase tracking-[.07em] text-faint">
              {{ t('settings.users.table.name') }}
            </div>
            <div class="text-[10.5px] font-bold uppercase tracking-[.07em] text-faint">
              {{ t('settings.users.table.email') }}
            </div>
            <div class="text-[10.5px] font-bold uppercase tracking-[.07em] text-faint">
              {{ t('settings.users.table.role') }}
            </div>
            <div class="text-[10.5px] font-bold uppercase tracking-[.07em] text-faint">
              {{ t('settings.users.table.status') }}
            </div>
            <div class="text-[10.5px] font-bold uppercase tracking-[.07em] text-faint">
              {{ t('settings.users.table.joined') }}
            </div>
            <div class="text-[10.5px] font-bold uppercase tracking-[.07em] text-faint text-right">
              {{ t('settings.users.table.actions') }}
            </div>
          </div>

          @for (member of members(); track member.id; let i = $index) {
            <div
              class="grid grid-cols-1 min-[880px]:grid min-[880px]:[grid-template-columns:2fr_1.7fr_160px_140px_116px_96px] gap-3 px-[22px] py-3.5 min-[880px]:items-center hover:bg-surface-2 transition-colors duration-[120ms]"
              [class.border-t]="i > 0"
              [class.border-border]="i > 0"
            >
              <!-- name + avatar -->
              <div class="flex items-center gap-3 min-w-0">
                <mns-avatar [name]="member.user.name || member.user.email" [size]="34" />
                <div class="flex-1 min-w-0">
                  @if (member.user.name) {
                    <div class="text-sm font-bold truncate">{{ member.user.name }}</div>
                  } @else {
                    <div class="text-sm font-bold italic text-faint truncate">
                      {{ t('settings.users.table.invitePending') }}
                    </div>
                  }
                </div>
              </div>
              <!-- email -->
              <div class="text-[13.5px] text-muted truncate min-[880px]:self-center">
                <span class="min-[880px]:hidden text-faint mr-1">{{
                  t('settings.users.table.emailPrefix')
                }}</span
                >{{ member.user.email }}
              </div>
              <!-- role -->
              <div class="min-[880px]:self-center">
                <mns-select
                  [options]="roleOptions()"
                  [value]="member.role"
                  (changed)="changeRole(member, $event)"
                />
              </div>
              <!-- status -->
              <div class="min-[880px]:self-center">
                @if (member.status === 'pending') {
                  <mns-badge tone="warning">{{
                    t('settings.users.table.statusPending')
                  }}</mns-badge>
                } @else {
                  <mns-badge tone="online">{{ t('settings.users.table.statusActive') }}</mns-badge>
                }
              </div>
              <!-- joined -->
              <div class="font-mono text-[12.5px] text-muted min-[880px]:self-center">
                <span class="min-[880px]:hidden text-faint mr-1 font-sans">{{
                  t('settings.users.table.joinedPrefix')
                }}</span>
                {{ member.createdAt | date: 'mediumDate' }}
              </div>
              <!-- actions -->
              <div class="flex min-[880px]:justify-end min-[880px]:self-center">
                <mns-btn
                  variant="danger"
                  size="sm"
                  icon="Trash"
                  [disabled]="removingUserId() === member.userId"
                  (mnsClick)="confirmRemove(member)"
                >
                  {{
                    member.status === 'pending'
                      ? t('settings.users.table.revoke')
                      : t('settings.users.table.remove')
                  }}
                </mns-btn>
              </div>
            </div>
          }
        </mns-card>
      }

      @if (!loading() && members().length === 0 && !loadError()) {
        <div class="empty-text">
          <mns-empty
            icon="User"
            [title]="t('settings.users.empty.title')"
            [desc]="t('settings.users.empty.desc')"
          >
            <mns-btn variant="primary" icon="Plus" (mnsClick)="openInviteModal()">
              {{ t('settings.users.page.invite') }}
            </mns-btn>
          </mns-empty>
        </div>
      }

      @if (actionError()) {
        <p class="error text-sm text-offline mt-3">{{ actionError() }}</p>
      }

      <!-- Invite modal -->
      @if (showInviteModal()) {
        <mns-overlay (closed)="closeInviteModal()">
          <mns-modal
            [title]="t('settings.users.inviteModal.title')"
            icon="Mail"
            (closed)="closeInviteModal()"
          >
            <div class="flex flex-col gap-4">
              <mns-sfield [label]="t('settings.users.inviteModal.emailLabel')">
                <mns-sinput
                  [(value)]="inviteEmail"
                  [placeholder]="t('settings.users.inviteModal.emailPlaceholder')"
                  type="email"
                  icon="Mail"
                />
              </mns-sfield>

              <mns-sfield [label]="t('settings.users.inviteModal.roleLabel')">
                <mns-select [options]="roleOptions()" [(value)]="inviteRole" />
              </mns-sfield>

              @if (inviteError()) {
                <p class="error text-sm text-offline">{{ inviteError() }}</p>
              }
            </div>

            <div slot="footer" class="flex gap-2.5 px-6 pb-5">
              <mns-btn
                class="flex-1"
                variant="outline"
                [full]="true"
                (mnsClick)="closeInviteModal()"
              >
                {{ t('settings.users.inviteModal.cancel') }}
              </mns-btn>
              <mns-btn
                class="flex-1"
                variant="primary"
                [full]="true"
                icon="Mail"
                [disabled]="inviting() || !isInviteEmailValid()"
                (mnsClick)="submitInvite()"
              >
                {{
                  inviting()
                    ? t('settings.users.inviteModal.submitting')
                    : t('settings.users.inviteModal.submit')
                }}
              </mns-btn>
            </div>
          </mns-modal>
        </mns-overlay>
      }

      <!-- Remove confirm modal -->
      @if (showRemoveConfirm()) {
        <mns-overlay (closed)="cancelRemove()">
          <div
            class="relative w-full max-w-[420px] bg-surface border border-border-strong rounded-xl p-6"
            style="box-shadow: var(--shadow-lg); animation: fadeUp .3s cubic-bezier(.22,.61,.36,1) both"
            tabindex="0"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
          >
            <h2 class="text-[17px] font-bold mb-2">{{ t('settings.users.removeModal.title') }}</h2>
            <p class="text-[13.5px] text-muted mb-5">
              {{ t('settings.users.removeConfirm.prefix') }}
              <strong class="text-text">{{ removingMember()?.user?.email }}</strong>
              {{ t('settings.users.removeConfirm.suffix') }}
            </p>
            <div class="flex gap-2.5">
              <mns-btn variant="outline" [full]="true" (mnsClick)="cancelRemove()">{{
                t('settings.users.removeModal.cancel')
              }}</mns-btn>
              <mns-btn
                variant="danger"
                [full]="true"
                [disabled]="removingUserId() !== null"
                (mnsClick)="executeRemove()"
              >
                {{
                  removingUserId()
                    ? t('settings.users.removeModal.removing')
                    : t('settings.users.removeModal.remove')
                }}
              </mns-btn>
            </div>
          </div>
        </mns-overlay>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
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
  private transloco = inject(TranslocoService);

  readonly roleOptions = computed<SelectOption[]>(() => [
    { value: 'org_admin', label: this.transloco.translate('settings.users.roles.orgAdmin') },
    { value: 'editor', label: this.transloco.translate('settings.users.roles.editor') },
    { value: 'viewer', label: this.transloco.translate('settings.users.roles.viewer') },
  ]);

  orgId = '';
  // Async-updated, template-read state — signals so OnPush re-renders after
  // HTTP callbacks complete (an XHR callback mutating a plain field does not
  // mark an OnPush component dirty, even under zone.js).
  readonly members = signal<Membership[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly actionError = signal('');

  // Seat summary derived from the real member list (no fabricated owner/seats).
  readonly activeCount = computed(() => this.members().filter((m) => m.status === 'active').length);
  readonly pendingCount = computed(
    () => this.members().filter((m) => m.status === 'pending').length,
  );

  // Invite modal state
  readonly showInviteModal = signal(false);
  readonly inviteEmail = signal('');
  // mns-select binds a Signal model (not ngModel), so the role is a signal.
  readonly inviteRole = signal<OrganisationRole>('viewer');
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
          this.loadError.set(this.transloco.translate('settings.users.errors.noOrgAdmin'));
          this.loading.set(false);
        } else {
          this.loadError.set(this.transloco.translate('settings.users.errors.noMembership'));
          this.loading.set(false);
        }
      },
      error: () => {
        this.loadError.set(this.transloco.translate('settings.users.errors.loadOrgContext'));
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
            ? this.transloco.translate('settings.users.errors.accessDenied')
            : this.transloco.translate('settings.users.errors.loadMembers'),
        );
        this.loading.set(false);
      },
    });
  }

  openInviteModal(): void {
    this.inviteEmail.set('');
    this.inviteRole.set('viewer');
    this.inviteError.set('');
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
  }

  submitInvite(): void {
    if (!this.isInviteEmailValid()) {
      this.inviteError.set(this.transloco.translate('settings.users.errors.invalidEmail'));
      return;
    }

    this.inviting.set(true);
    this.inviteError.set('');
    this.memberService
      .addMember(this.orgId, { email: this.inviteEmail().trim(), role: this.inviteRole() })
      .subscribe({
        next: () => {
          this.inviting.set(false);
          this.showInviteModal.set(false);
          this.loadMembers();
          this.toast.success(this.transloco.translate('settings.users.toast.invited'));
        },
        error: (err) => {
          this.inviteError.set(
            err.error?.message || this.transloco.translate('settings.users.errors.inviteFailed'),
          );
          this.inviting.set(false);
        },
      });
  }

  changeRole(member: Membership, newRole: string): void {
    const role = newRole as OrganisationRole;
    if (role === member.role) return;

    this.updatingUserId.set(member.userId);
    this.actionError.set('');
    this.memberService.updateRole(this.orgId, member.userId, { role }).subscribe({
      next: (updated) => {
        this.members.update((list) =>
          list.map((m) => (m.userId === member.userId ? { ...m, role: updated.role } : m)),
        );
        this.updatingUserId.set(null);
        this.toast.success(this.transloco.translate('settings.users.toast.roleUpdated'));
      },
      error: (err) => {
        this.actionError.set(
          err.error?.message || this.transloco.translate('settings.users.errors.updateRole'),
        );
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
        this.toast.success(this.transloco.translate('settings.users.toast.removed'));
      },
      error: (err) => {
        this.actionError.set(
          err.error?.message || this.transloco.translate('settings.users.errors.removeMember'),
        );
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
