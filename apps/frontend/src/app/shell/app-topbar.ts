import { Component, input, output } from '@angular/core';
import { NotificationBell } from '../notifications/notification-bell';
import { GlobalSearch } from '../search/global-search';
import { OrgWithRole } from './organisation-state.service';

/**
 * Presentational app top bar: mobile hamburger, organisation switcher, global
 * search, theme toggle, notification bell and the user avatar. The parent owns
 * the org/theme state; this component emits the open-mobile/select-org/
 * toggle-theme intents.
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

        <!-- Organisation switcher -->
        <div class="org-switcher">
          <select
            class="org-select"
            [value]="selectedOrgId() ?? ''"
            (change)="onOrgChange($event)"
            [disabled]="organisations().length <= 1"
          >
            @for (org of organisations(); track org.id) {
              <option [value]="org.id">{{ org.name }} ({{ formatRole(org.role) }})</option>
            }
          </select>
        </div>
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

        <!-- User avatar -->
        <div
          class="user-avatar"
          [class.super-admin]="isSuperAdmin()"
          [attr.aria-label]="isSuperAdmin() ? 'Super Admin' : 'Current user'"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          @if (isSuperAdmin()) {
            <span class="admin-badge" title="Super Admin">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M5 0.5L6.1 3.5H9.3L6.6 5.3L7.7 8.5L5 6.5L2.3 8.5L3.4 5.3L0.7 3.5H3.9L5 0.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
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

    /* ── Org switcher ── */
    .org-select {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
      border: 1px solid var(--color-border);
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 160px;
      cursor: pointer;
    }
    .org-select:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }
    .org-select:disabled {
      opacity: 0.7;
      cursor: default;
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

    .user-avatar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: var(--color-bg-tertiary);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
    }
    .user-avatar.super-admin {
      border-color: #f59e0b;
      box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);
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
    }
  `,
})
export class AppTopbar {
  readonly organisations = input.required<OrgWithRole[]>();
  readonly selectedOrgId = input.required<string | null>();
  readonly isSuperAdmin = input.required<boolean>();
  readonly isDark = input.required<boolean>();

  readonly openMobile = output<void>();
  readonly selectOrg = output<string>();
  readonly toggleTheme = output<void>();

  onOrgChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.selectOrg.emit(value);
    }
  }

  formatRole(role: string): string {
    switch (role) {
      case 'org_admin':
        return 'Admin';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  }
}
