import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { AdminUserService } from './admin-user.service';
import { AdminUser } from './admin-user.model';
import { UserDeleteModal } from './user-delete-modal';
import { ToastService } from '../../shared/toast/toast.service';
import {
  CardComponent,
  BadgeComponent,
  BtnComponent,
  AvatarComponent,
  IconComponent,
  EmptyComponent,
} from '../../ui';
import type { IconName } from '../../ui';
import { AdminTabsComponent } from '../admin-tabs.component';

/**
 * Smart container for the (super-admin) user overview. Owns data loading and the
 * delete HTTP call; renders every platform user with verification status,
 * super-admin flag and their org memberships, with a per-row delete action.
 */
@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [
    AdminTabsComponent,
    DatePipe,
    UserDeleteModal,
    CardComponent,
    BadgeComponent,
    BtnComponent,
    AvatarComponent,
    IconComponent,
    EmptyComponent,
    TranslocoDirective,
  ],
  template: `
    <div class="page" *transloco="let t">
      <!-- amber page header -->
      <div class="flex items-end justify-between gap-4 flex-wrap mb-[22px]">
        <div class="flex items-center gap-4 min-w-0">
          <div class="flex items-center gap-[13px] min-w-0">
            <span
              class="grid place-items-center w-11 h-11 rounded-[12px] flex-shrink-0 text-white"
              style="background:linear-gradient(135deg,var(--color-elevated),var(--color-elevated-2));box-shadow:0 8px 20px -10px var(--color-elevated)"
            >
              <mns-icon name="User" [size]="23" />
            </span>
            <div class="min-w-0">
              <h1 class="m-0 text-[27px] font-extrabold tracking-[-0.025em]">
                {{ t('admin.instanceAdmin') }}
              </h1>
              <div class="text-muted text-[14px] mt-[3px]">{{ t('admin.users.heading') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- tab bar -->
      <app-admin-tabs />

      @if (loadError) {
        <p class="text-offline text-sm">{{ loadError }}</p>
      }
      @if (loading) {
        <p class="text-muted text-sm">{{ t('admin.users.loading') }}</p>
      }

      @if (!loading && users.length > 0) {
        <!-- summary strip -->
        <div class="flex items-center gap-[26px] flex-wrap mb-[var(--gap)]">
          @for (stat of summaryStats(); track stat.label) {
            <div class="flex items-center gap-[11px]">
              <span
                class="grid place-items-center w-[38px] h-[38px] rounded-[11px]"
                [style.background]="stat.dimColor"
                [style.color]="stat.color"
              >
                <mns-icon [name]="stat.icon" [size]="18" />
              </span>
              <div>
                <div class="mono text-[18px] font-bold leading-[1.1]">{{ stat.value }}</div>
                <div class="text-[12px] text-muted">{{ stat.label }}</div>
              </div>
            </div>
          }
        </div>

        <mns-card [pad]="false" style="overflow:hidden">
          <!-- ── table view (tablet and up) ── -->
          <div class="hidden md:block" style="overflow-x:auto">
            <div style="min-width:900px">
              <!-- header row -->
              <div
                class="grid gap-4 px-[22px] py-[13px] bg-surface-2 border-b border-border"
                style="grid-template-columns:2.4fr 1.3fr 132px 138px 118px 92px"
              >
                @for (h of headers; track $index) {
                  <div
                    class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint"
                    [class.text-right]="$index === 5"
                  >
                    {{ t(h) }}
                  </div>
                }
              </div>
              <!-- rows -->
              @for (user of users; track user.id) {
                <div
                  class="grid gap-4 items-center px-[22px] py-[14px] border-t border-border hover:bg-hover transition-colors"
                  style="grid-template-columns:2.4fr 1.3fr 132px 138px 118px 92px"
                >
                  <!-- user -->
                  <div class="flex items-center gap-3 min-w-0">
                    <mns-avatar [name]="initials(user)" [size]="36" />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-[7px] text-[14px] font-bold min-w-0">
                        <span
                          class="whitespace-nowrap flex-shrink-0"
                          [class.text-faint]="!user.name"
                          [class.italic]="!user.name"
                        >
                          {{ user.name || t('admin.users.invitePending') }}
                        </span>
                        @if (user.isSuperAdmin) {
                          <!-- amber superuser badge -->
                          <span
                            class="inline-flex items-center gap-1 flex-shrink-0 text-[10.5px] font-bold px-[7px] py-[2px] rounded-[99px]"
                            style="background:var(--elevated-soft);color:var(--color-elevated)"
                          >
                            <mns-icon name="Settings" [size]="11" />{{ t('admin.users.superuser') }}
                          </span>
                        }
                      </div>
                      <div
                        class="mono text-[11.5px] text-muted overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        {{ user.email }}
                      </div>
                    </div>
                  </div>
                  <!-- organisations -->
                  <div>
                    @if (user.memberships.length > 0) {
                      <div class="flex flex-wrap gap-[6px]">
                        @for (m of user.memberships; track m.organisationId) {
                          <span
                            class="inline-flex items-center gap-2 px-[10px] py-[4px] rounded-[99px] bg-surface-3 text-[12.5px] font-semibold"
                          >
                            {{ m.organisationName }}
                          </span>
                        }
                      </div>
                    } @else {
                      <span class="text-faint text-[13px]">—</span>
                    }
                  </div>
                  <!-- role -->
                  <div>
                    @if (user.isSuperAdmin) {
                      <mns-badge tone="accent" icon="Lock">{{
                        t('admin.users.instanceAdminBadge')
                      }}</mns-badge>
                    } @else if (user.memberships.length > 0) {
                      <mns-badge tone="neutral">{{
                        roleLabel(user.memberships[0].role)
                      }}</mns-badge>
                    } @else {
                      <span class="text-faint text-[13px]">—</span>
                    }
                  </div>
                  <!-- status -->
                  <div>
                    @if (user.emailVerified) {
                      <mns-badge tone="online" icon="Check">{{
                        t('admin.users.verified')
                      }}</mns-badge>
                    } @else {
                      <mns-badge tone="warning" icon="Mail">{{
                        t('admin.users.pending')
                      }}</mns-badge>
                    }
                  </div>
                  <!-- created -->
                  <div class="text-[13px] text-muted">
                    {{ user.createdAt | date: 'mediumDate' }}
                  </div>
                  <!-- actions -->
                  <div class="flex justify-end">
                    <mns-btn
                      variant="danger"
                      size="sm"
                      icon="Trash"
                      (click)="confirmDelete(user)"
                      [disabled]="deletingUserId === user.id"
                      >{{ t('common.actions.delete') }}</mns-btn
                    >
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- ── stacked-card view (mobile) ── -->
          <div class="md:hidden flex flex-col">
            @for (user of users; track user.id) {
              <div
                class="flex flex-col gap-3 p-[var(--card-pad)] border-t border-border first:border-t-0"
              >
                <!-- user identity -->
                <div class="flex items-center gap-3 min-w-0">
                  <mns-avatar [name]="initials(user)" [size]="36" />
                  <div class="flex-1 min-w-0">
                    <div
                      class="flex items-center gap-[7px] text-[14px] font-bold min-w-0 flex-wrap"
                    >
                      <span [class.text-faint]="!user.name" [class.italic]="!user.name">
                        {{ user.name || t('admin.users.invitePending') }}
                      </span>
                      @if (user.isSuperAdmin) {
                        <span
                          class="inline-flex items-center gap-1 flex-shrink-0 text-[10.5px] font-bold px-[7px] py-[2px] rounded-[99px]"
                          style="background:var(--elevated-soft);color:var(--color-elevated)"
                        >
                          <mns-icon name="Settings" [size]="11" />{{ t('admin.users.superuser') }}
                        </span>
                      }
                    </div>
                    <div class="mono text-[11.5px] text-muted truncate">{{ user.email }}</div>
                  </div>
                </div>
                <!-- organisations -->
                <div class="flex items-start justify-between gap-3">
                  <span
                    class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint pt-[3px]"
                    >{{ t('admin.users.mobile.organisation') }}</span
                  >
                  @if (user.memberships.length > 0) {
                    <div class="flex flex-wrap justify-end gap-[6px]">
                      @for (m of user.memberships; track m.organisationId) {
                        <span
                          class="inline-flex items-center gap-2 px-[10px] py-[4px] rounded-[99px] bg-surface-3 text-[12.5px] font-semibold"
                        >
                          {{ m.organisationName }}
                        </span>
                      }
                    </div>
                  } @else {
                    <span class="text-faint text-[13px]">—</span>
                  }
                </div>
                <!-- role -->
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">{{
                    t('admin.users.mobile.role')
                  }}</span>
                  @if (user.isSuperAdmin) {
                    <mns-badge tone="accent" icon="Lock">{{
                      t('admin.users.instanceAdminBadge')
                    }}</mns-badge>
                  } @else if (user.memberships.length > 0) {
                    <mns-badge tone="neutral">{{ roleLabel(user.memberships[0].role) }}</mns-badge>
                  } @else {
                    <span class="text-faint text-[13px]">—</span>
                  }
                </div>
                <!-- status -->
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">{{
                    t('admin.users.mobile.status')
                  }}</span>
                  @if (user.emailVerified) {
                    <mns-badge tone="online" icon="Check">{{
                      t('admin.users.verified')
                    }}</mns-badge>
                  } @else {
                    <mns-badge tone="warning" icon="Mail">{{ t('admin.users.pending') }}</mns-badge>
                  }
                </div>
                <!-- created -->
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[10.5px] font-bold tracking-[.07em] uppercase text-faint">{{
                    t('admin.users.mobile.created')
                  }}</span>
                  <span class="text-[13px] text-muted">{{
                    user.createdAt | date: 'mediumDate'
                  }}</span>
                </div>
                <!-- actions -->
                <div class="flex justify-end">
                  <mns-btn
                    variant="danger"
                    size="sm"
                    icon="Trash"
                    (click)="confirmDelete(user)"
                    [disabled]="deletingUserId === user.id"
                    >{{ t('common.actions.delete') }}</mns-btn
                  >
                </div>
              </div>
            }
          </div>
        </mns-card>
      }

      @if (!loading && users.length === 0 && !loadError) {
        <mns-empty
          icon="User"
          [title]="t('admin.users.emptyTitle')"
          [desc]="t('admin.users.emptyDesc')"
        />
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``,
})
export class AllUsers implements OnInit {
  private userService = inject(AdminUserService);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);

  users: AdminUser[] = [];
  loading = true;
  loadError = '';

  protected readonly headers = [
    'admin.users.table.user',
    'admin.users.table.organisation',
    'admin.users.table.role',
    'admin.users.table.status',
    'admin.users.table.created',
    'admin.users.table.actions',
  ];

  summaryStats(): {
    label: string;
    value: number;
    icon: IconName;
    color: string;
    dimColor: string;
  }[] {
    const verified = this.users.filter((u) => u.emailVerified).length;
    const pending = this.users.filter((u) => !u.emailVerified).length;
    const admins = this.users.filter((u) => u.isSuperAdmin).length;
    return [
      {
        label: this.transloco.translate('admin.users.stats.total'),
        value: this.users.length,
        icon: 'User',
        color: 'var(--accent)',
        dimColor: 'var(--accent-soft)',
      },
      {
        label: this.transloco.translate('admin.users.stats.verified'),
        value: verified,
        icon: 'Check',
        color: 'var(--color-online)',
        dimColor: 'var(--online-dim)',
      },
      {
        label: this.transloco.translate('admin.users.stats.pending'),
        value: pending,
        icon: 'Mail',
        color: 'var(--color-warn)',
        dimColor: 'var(--warn-dim)',
      },
      {
        label: this.transloco.translate('admin.users.stats.instanceAdmins'),
        value: admins,
        icon: 'Settings',
        color: 'var(--color-info)',
        dimColor: 'var(--info-dim)',
      },
    ];
  }

  /** Human-readable, localized label for a membership role. */
  protected roleLabel(role: string): string {
    return this.transloco.translate('admin.organisations.roles.' + role);
  }

  initials(user: AdminUser): string {
    if (!user.name) return '··';
    return user.name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('');
  }

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
            ? this.transloco.translate('admin.users.errors.accessDenied')
            : this.transloco.translate('admin.users.errors.loadFailed');
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
        this.toast.success(this.transloco.translate('admin.users.toasts.deleted'));
      },
      error: (err) => {
        this.deleteError =
          err.error?.message || this.transloco.translate('admin.users.errors.delete');
        this.deletingUserId = null;
      },
    });
  }
}
