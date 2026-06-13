import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  computed,
} from '@angular/core';
import { NotificationBell } from '../notifications/notification-bell';
import { GlobalSearch } from '../search/global-search';
import { OrgWithRole } from './organisation-state.service';
import { formatRole } from './format-role';

/**
 * Presentational app top bar: mobile hamburger, global search, theme toggle,
 * notification bell and the user menu. The user menu shows the current
 * organisation name + role next to the avatar; switching organisations happens
 * via a modal opened from the dropdown (only when the user belongs to more than
 * one org). The parent owns the org/theme state and the modal; this component
 * emits the open-mobile/open-org-switch/toggle-theme/open-profile/logout intents.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NotificationBell, GlobalSearch],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <button class="hamburger mobile-only" (click)="openMobile.emit()" aria-label="Open menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="topbar-right">
        <!-- Global search -->
        <app-global-search />

        <!-- Theme toggle -->
        <button
          class="topbar-btn"
          (click)="toggleTheme.emit()"
          [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          @if (isDark()) {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          } @else {
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M17.39 11.39A8 8 0 018.61 2.61 8 8 0 1017.39 11.39z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
        </button>

        <!-- Notification bell -->
        <app-notification-bell />

        <!-- User menu -->
        <div class="user-menu">
          <button
            type="button"
            class="user-trigger"
            [attr.aria-label]="isSuperAdmin() ? 'Instance Admin' : 'Current user'"
            [attr.aria-expanded]="menuOpen()"
            aria-haspopup="menu"
            (click)="toggleMenu($event)"
          >
            @if (selectedOrg(); as org) {
              <span class="org-info">
                <span class="org-name">{{ org.name }}</span>
                <span class="org-role">{{ formatRole(org.role) }}</span>
              </span>
            }
            <span class="user-avatar" [class.super-admin]="isSuperAdmin()">
              @if (avatarUrl() && !avatarFailed()) {
                <img
                  class="avatar-img"
                  [src]="avatarUrl()"
                  alt=""
                  referrerpolicy="no-referrer"
                  (error)="avatarFailed.set(true)"
                />
              } @else {
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
                  <path
                    d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              }
              @if (isSuperAdmin()) {
                <span class="admin-badge" title="Instance Admin">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M5 0.5L6.1 3.5H9.3L6.6 5.3L7.7 8.5L5 6.5L2.3 8.5L3.4 5.3L0.7 3.5H3.9L5 0.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              }
            </span>
          </button>

          @if (menuOpen()) {
            <div class="user-dropdown" role="menu">
              <div class="user-identity">
                <span class="user-email">{{ userEmail() ?? 'Signed in' }}</span>
                <span class="user-role">{{ isSuperAdmin() ? 'Instance Admin' : 'Member' }}</span>
              </div>
              @if (canSwitchOrg()) {
                <button
                  type="button"
                  class="dropdown-item dropdown-item-switch"
                  role="menuitem"
                  (click)="onSwitchOrg()"
                >
                  Switch organisation
                </button>
              }
              <button type="button" class="dropdown-item" role="menuitem" (click)="onProfile()">
                Profile &amp; settings
              </button>
              <button
                type="button"
                class="dropdown-item dropdown-item-danger"
                role="menuitem"
                (click)="onLogout()"
              >
                Log out
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 1rem;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 1px 3px var(--color-shadow);
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--color-text-primary);
      cursor: pointer;
      border-radius: 6px;
    }
    .hamburger:hover {
      background: var(--color-bg-tertiary);
    }

    /* ── Top bar buttons ── */
    .topbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-radius: 6px;
    }
    .topbar-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .user-menu {
      position: relative;
    }
    .user-trigger {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.25rem 0.375rem 0.25rem 0.625rem;
      border: none;
      background: transparent;
      border-radius: 999px;
      cursor: pointer;
    }
    .user-trigger:hover {
      background: var(--color-bg-tertiary);
    }
    .user-trigger:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 1px;
    }
    .org-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.0625rem;
      line-height: 1.2;
      max-width: 180px;
    }
    .org-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .org-role {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
    .user-avatar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 999px;
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
    }
    .user-trigger:hover .user-avatar {
      color: var(--color-text-primary);
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      object-fit: cover;
    }
    .user-avatar.super-admin {
      border-color: #f59e0b;
      box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 50;
      min-width: 200px;
      display: flex;
      flex-direction: column;
      padding: 0.375rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px var(--color-shadow);
    }
    .user-identity {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      padding: 0.5rem 0.625rem 0.625rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 0.375rem;
    }
    .user-email {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-role {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .dropdown-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.5rem 0.625rem;
      border: none;
      border-radius: 0.375rem;
      background: transparent;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      cursor: pointer;
    }
    .dropdown-item:hover {
      background: var(--color-bg-tertiary);
    }
    .dropdown-item-danger {
      color: #f87171;
    }
    .admin-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: #f59e0b;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--color-bg-secondary);
    }

    /* ── Desktop-only / Mobile-only ── */
    .mobile-only {
      display: none;
    }

    /* ── Responsive: Mobile (<=768px) ── */
    @media (max-width: 768px) {
      .mobile-only {
        display: flex;
      }
      app-global-search {
        display: none;
      }
      /* Keep the avatar; the org name/role is available in the dropdown identity. */
      .org-info {
        display: none;
      }
    }
  `,
})
export class AppTopbar {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly organisations = input.required<OrgWithRole[]>();
  readonly selectedOrgId = input.required<string | null>();
  /** The currently active organisation (with the user's role in it), or null when the user belongs to none. */
  readonly selectedOrg = input.required<OrgWithRole | null>();
  readonly isSuperAdmin = input.required<boolean>();
  readonly isDark = input.required<boolean>();
  readonly userEmail = input.required<string | null>();
  /** Gravatar URL, or null when the user opted out — then the placeholder SVG shows. */
  readonly avatarUrl = input<string | null>(null);

  /** Falls back to the placeholder SVG if the Gravatar image fails to load. Resets when the URL changes. */
  readonly avatarFailed = linkedSignal<string | null, boolean>({
    source: () => this.avatarUrl(),
    computation: () => false,
  });

  /** The switch option only makes sense when the user belongs to more than one organisation. */
  readonly canSwitchOrg = computed(() => this.organisations().length > 1);

  readonly openMobile = output<void>();
  readonly openOrgSwitch = output<void>();
  readonly toggleTheme = output<void>();
  readonly openProfile = output<void>();
  readonly logout = output<void>();

  readonly menuOpen = signal(false);

  protected readonly formatRole = formatRole;

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  onSwitchOrg(): void {
    this.menuOpen.set(false);
    this.openOrgSwitch.emit();
  }

  onProfile(): void {
    this.menuOpen.set(false);
    this.openProfile.emit();
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.logout.emit();
  }

  /** Close the dropdown on any click outside the menu. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }
}
