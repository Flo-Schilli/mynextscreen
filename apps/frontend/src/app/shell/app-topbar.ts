import {
  ChangeDetectionStrategy,
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
import { IconComponent } from '../ui/icon.component';

/**
 * Presentational app top bar — Phase 2 reskin.
 * 73 px sticky, backdrop-blur(14px). Search field (max 460 px, ⌘K chip),
 * theme-toggle 40×40, bell, divider, user-menu button (org + role + 36 px avatar).
 * User-menu popover 280 px: identity header, org chip, actions:
 *   - Instance Admin (amber, super-admin only)
 *   - Switch organisation
 *   - Profile & settings
 *   - Log out
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NotificationBell, GlobalSearch, IconComponent],
  template: `
    <header class="topbar">
      <!-- Hamburger — mobile only, opens the sidebar drawer -->
      <button
        type="button"
        class="topbar-btn hamburger-btn"
        (click)="openMobile.emit()"
        aria-label="Open navigation menu"
      >
        <mns-icon name="Menu" [size]="20" />
      </button>

      <!-- Search -->
      <div class="search-wrap">
        <span class="search-icon">
          <mns-icon name="Search" [size]="18" />
        </span>
        <app-global-search />
        <span class="cmd-chip mono">⌘K</span>
      </div>

      <div class="spacer"></div>

      <!-- Theme toggle 40×40 -->
      <button
        class="topbar-btn"
        (click)="toggleTheme.emit()"
        [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        @if (isDark()) {
          <mns-icon name="Sun" [size]="19" />
        } @else {
          <mns-icon name="Moon" [size]="19" />
        }
      </button>

      <!-- Bell -->
      <div class="bell-wrap">
        <app-notification-bell />
      </div>

      <!-- 1×30 divider -->
      <div class="divider" aria-hidden="true"></div>

      <!-- User menu -->
      <div class="user-menu">
        <button
          type="button"
          class="user-trigger"
          [class.open]="menuOpen()"
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

          <!-- 36 px avatar -->
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
              <mns-icon name="User" [size]="18" />
            }
            @if (isSuperAdmin()) {
              <span class="admin-badge" title="Instance Admin">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path
                    d="M5 0.5L6.1 3.5H9.3L6.6 5.3L7.7 8.5L5 6.5L2.3 8.5L3.4 5.3L0.7 3.5H3.9L5 0.5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            }
          </span>

          <mns-icon name="Chevron" [size]="15" class="chevron-icon" />
        </button>

        <!-- Popover 280 px -->
        @if (menuOpen()) {
          <div class="user-dropdown" role="menu">
            <!-- Identity header -->
            <div class="dropdown-identity">
              <span class="user-avatar identity-avatar">
                @if (avatarUrl() && !avatarFailed()) {
                  <img class="avatar-img" [src]="avatarUrl()" alt="" referrerpolicy="no-referrer" />
                } @else {
                  <mns-icon name="User" [size]="20" />
                }
              </span>
              <div class="identity-text">
                <span class="user-email">{{ userEmail() ?? 'Signed in' }}</span>
                <span class="user-role">{{ isSuperAdmin() ? 'Instance Admin' : 'Member' }}</span>
              </div>
            </div>

            <!-- Current org chip -->
            @if (selectedOrg(); as org) {
              <div class="org-section">
                <div class="org-label">Current organisation</div>
                <div class="org-chip">
                  <span class="org-chip-avatar">{{ org.name.slice(0, 1) }}</span>
                  <div class="org-chip-text">
                    <span class="org-chip-name">{{ org.name }}</span>
                    <span class="org-chip-role">{{ formatRole(org.role) }}</span>
                  </div>
                </div>
              </div>
            }

            <!-- Actions -->
            <div class="dropdown-actions">
              <!-- Instance Admin — amber, super-admin only -->
              @if (isSuperAdmin()) {
                <button
                  type="button"
                  class="dropdown-item dropdown-item-admin"
                  role="menuitem"
                  (click)="onInstanceAdmin()"
                >
                  <mns-icon name="Settings" [size]="18" class="item-icon item-icon-admin" />
                  Instance Admin
                  <span class="superuser-chip">Superuser</span>
                </button>
              }

              <!-- Switch organisation -->
              @if (canSwitchOrg()) {
                <button
                  type="button"
                  class="dropdown-item dropdown-item-switch"
                  role="menuitem"
                  (click)="onSwitchOrg()"
                >
                  <mns-icon name="Building" [size]="18" class="item-icon" />
                  Switch organisation
                </button>
              }

              <!-- Profile & settings -->
              <button type="button" class="dropdown-item" role="menuitem" (click)="onProfile()">
                <mns-icon name="Settings" [size]="18" class="item-icon" />
                Profile &amp; settings
              </button>

              <div class="dropdown-sep" role="separator"></div>

              <!-- Log out -->
              <button
                type="button"
                class="dropdown-item dropdown-item-danger"
                role="menuitem"
                (click)="onLogout()"
              >
                <mns-icon name="Logout" [size]="18" class="item-icon" />
                Log out
              </button>
            </div>
          </div>
        }
      </div>
    </header>
  `,
  styles: `
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 16px;
      height: 73px;
      padding: 0 26px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border);
      background: color-mix(in srgb, var(--bg) 72%, transparent);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    /* ── Search ── */
    .search-wrap {
      flex: 1;
      max-width: 460px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-faint);
      display: flex;
      pointer-events: none;
      z-index: 1;
    }
    .search-wrap app-global-search {
      flex: 1;
    }
    /* Override GlobalSearch input to match design */
    .search-wrap :global(input),
    .search-wrap ::ng-deep input {
      padding-left: 42px !important;
      padding-right: 52px !important;
    }
    .cmd-chip {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      color: var(--text-faint);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 2px 6px;
      pointer-events: none;
    }

    .spacer {
      flex: 1;
    }

    /* ── Buttons ── */
    .topbar-btn {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 11px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background 0.12s,
        color 0.12s;
    }
    .topbar-btn:hover {
      background: var(--hover);
      color: var(--text);
    }

    /* Hamburger — only visible on mobile (see <=768px block) */
    .hamburger-btn {
      display: none;
    }

    /* Bell wrapper */
    .bell-wrap {
      display: flex;
      align-items: center;
    }

    /* Divider */
    .divider {
      width: 1px;
      height: 30px;
      background: var(--border);
      flex-shrink: 0;
    }

    /* ── User menu ── */
    .user-menu {
      position: relative;
    }
    .user-trigger {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 5px 7px 5px 11px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      transition:
        background 0.12s,
        border-color 0.12s;
    }
    .user-trigger:hover {
      background: var(--hover);
    }
    .user-trigger.open {
      border-color: var(--border-strong);
      background: var(--surface);
    }
    .user-trigger:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 1px;
    }
    .org-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
      line-height: 1.25;
    }
    .org-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    .org-role {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* 36 px avatar */
    .user-avatar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--surface-3);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .user-avatar.super-admin {
      border-color: #f5a623;
      box-shadow: 0 0 0 1px rgba(245, 166, 35, 0.3);
    }
    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: inherit;
      object-fit: cover;
    }
    .admin-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #f59e0b;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--bg);
    }
    .chevron-icon {
      color: var(--text-faint);
    }

    /* ── Dropdown ── */
    .user-dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 280px;
      max-width: calc(100vw - 24px);
      z-index: 60;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: fadeUp 0.14s ease both;
    }
    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .user-dropdown {
        animation: none;
      }
    }

    /* Identity header */
    .dropdown-identity {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }
    .identity-avatar {
      width: 42px;
      height: 42px;
      border-radius: 11px;
    }
    .identity-text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .user-email {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-role {
      font-size: 12.5px;
      color: var(--text-muted);
    }

    /* Org chip section */
    .org-section {
      padding: 12px 12px 6px;
    }
    .org-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-faint);
      padding: 0 4px 8px;
    }
    .org-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 11px;
      border-radius: 10px;
      background: var(--accent-soft);
    }
    .org-chip-avatar {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
    }
    .org-chip-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .org-chip-name {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text);
    }
    .org-chip-role {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    /* Actions */
    .dropdown-actions {
      padding: 6px 8px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      text-align: left;
      padding: 10px 12px;
      border-radius: 9px;
      border: none;
      background: transparent;
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.1s;
    }
    .dropdown-item:hover {
      background: var(--hover);
    }
    .item-icon {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    /* Instance Admin item — amber */
    .dropdown-item-admin {
      color: #f5a623;
    }
    .dropdown-item-admin:hover {
      background: rgba(245, 166, 35, 0.14);
    }
    .item-icon-admin {
      color: #f5a623;
    }
    .superuser-chip {
      margin-left: auto;
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 99px;
      background: rgba(245, 166, 35, 0.14);
      color: #f5a623;
    }

    /* Log out — danger */
    .dropdown-item-danger {
      color: var(--color-offline);
    }
    .dropdown-item-danger:hover {
      background: var(--offline-dim);
    }
    .dropdown-sep {
      height: 1px;
      background: var(--border);
      margin: 5px 4px;
    }

    /* ── Responsive: Mobile (<=768px) ── */
    @media (max-width: 768px) {
      .hamburger-btn {
        display: grid;
      }
      .org-info {
        display: none;
      }
      .search-wrap {
        display: none;
      }
      .spacer {
        flex: 1;
      }
    }
  `,
})
export class AppTopbar {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly organisations = input.required<OrgWithRole[]>();
  readonly selectedOrgId = input.required<string | null>();
  readonly selectedOrg = input.required<OrgWithRole | null>();
  readonly isSuperAdmin = input.required<boolean>();
  readonly isDark = input.required<boolean>();
  readonly userEmail = input.required<string | null>();
  readonly avatarUrl = input<string | null>(null);

  readonly avatarFailed = linkedSignal<string | null, boolean>({
    source: () => this.avatarUrl(),
    computation: () => false,
  });

  readonly canSwitchOrg = computed(() => this.organisations().length > 1);

  readonly openMobile = output<void>();
  readonly openOrgSwitch = output<void>();
  readonly toggleTheme = output<void>();
  readonly openProfile = output<void>();
  readonly openInstanceAdmin = output<void>();
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

  onInstanceAdmin(): void {
    this.menuOpen.set(false);
    this.openInstanceAdmin.emit();
  }

  onLogout(): void {
    this.menuOpen.set(false);
    this.logout.emit();
  }

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
