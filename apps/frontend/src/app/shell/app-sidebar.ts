import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { VersionBadge } from '../shared/version-badge';
import { SafeHtmlPipe } from '../shared/safe-html.pipe';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

/**
 * Presentational app sidebar: logo + collapse toggle, the primary nav items,
 * the super-admin link and the logout button. The parent owns the collapsed/
 * mobile-open state and the nav config; this component emits collapse/close/
 * logout intents.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, VersionBadge, SafeHtmlPipe],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
      <div class="sidebar-header">
        @if (!collapsed()) {
          <span class="logo-text">Signage</span>
        }
        <button
          class="collapse-btn desktop-only"
          (click)="toggleCollapse.emit()"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            @if (collapsed()) {
              <path
                d="M7 4l6 6-6 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            } @else {
              <path
                d="M13 4l-6 6 6 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            }
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems(); track item.route) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            (click)="closeMobile.emit()"
            [attr.title]="collapsed() ? item.label : null"
          >
            <span class="nav-icon" [innerHTML]="item.icon | safeHtml"></span>
            @if (!collapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }

        @if (isSuperAdmin()) {
          <div class="nav-divider"></div>
          <a
            class="nav-item admin-nav-item"
            routerLink="/admin/organisations"
            routerLinkActive="active"
            (click)="closeMobile.emit()"
            [attr.title]="collapsed() ? 'Admin' : null"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 1l2.5 3.5H17l-1.5 4L18 13h-4l-2 4h-4l-2-4H2l2.5-4.5L3 5h4.5L10 1z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            @if (!collapsed()) {
              <span class="nav-label">Admin</span>
            }
          </a>
          <a
            class="nav-item admin-nav-item"
            routerLink="/admin/users"
            routerLinkActive="active"
            (click)="closeMobile.emit()"
            [attr.title]="collapsed() ? 'Benutzer' : null"
          >
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M2 17a5 5 0 0110 0M14 7a2.5 2.5 0 010 5M14 12a4 4 0 014 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            @if (!collapsed()) {
              <span class="nav-label">Benutzer</span>
            }
          </a>
        }
      </nav>

      <div class="version-row">
        <app-version-badge [compact]="collapsed()" />
      </div>

      <div class="sidebar-footer">
        <button
          class="nav-item"
          (click)="logout.emit()"
          [attr.title]="collapsed() ? 'Logout' : null"
        >
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          @if (!collapsed()) {
            <span class="nav-label">Logout</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: `
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 240px;
      background: var(--color-bg-sidebar);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      z-index: 50;
      transition:
        width 0.2s ease,
        transform 0.2s ease;
      overflow: hidden;
    }
    .sidebar.collapsed {
      width: 60px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      height: 56px;
      border-bottom: 1px solid var(--color-border);
    }
    .logo-text {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary);
      white-space: nowrap;
    }
    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .collapse-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      white-space: nowrap;
      border: none;
      background: transparent;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition:
        background 0.15s,
        color 0.15s;
    }
    .nav-item:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .nav-item.active {
      background: var(--color-accent);
      color: #fff;
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-divider {
      height: 1px;
      background: var(--color-border);
      margin: 0.5rem 0.75rem;
    }
    .admin-nav-item {
      color: #f59e0b;
    }
    .admin-nav-item:hover {
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
    }
    .admin-nav-item.active {
      background: #f59e0b;
      color: #fff;
    }

    .sidebar-footer {
      padding: 0.5rem;
      border-top: 1px solid var(--color-border);
    }
    .version-row {
      display: flex;
      justify-content: center;
      padding: 0.5rem 0.25rem 0.25rem;
    }

    /* ── Responsive: Tablet (<=1024px) — collapse sidebar ── */
    @media (max-width: 1024px) {
      .sidebar {
        width: 60px;
      }
      .sidebar .nav-label,
      .sidebar .logo-text {
        display: none;
      }
      .sidebar .sidebar-header {
        justify-content: center;
      }
      .desktop-only {
        display: none;
      }
    }

    /* ── Responsive: Mobile (<=768px) — sidebar as overlay ── */
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        width: 240px;
      }
      .sidebar .nav-label,
      .sidebar .logo-text {
        display: inline;
      }
      .sidebar.mobile-open {
        transform: translateX(0);
      }
    }
  `,
})
export class AppSidebar {
  readonly collapsed = input.required<boolean>();
  readonly mobileOpen = input.required<boolean>();
  readonly navItems = input.required<NavItem[]>();
  readonly isSuperAdmin = input.required<boolean>();

  readonly toggleCollapse = output<void>();
  readonly closeMobile = output<void>();
  readonly logout = output<void>();
}
