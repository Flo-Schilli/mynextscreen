import {
  Component,
  inject,
  signal,
  OnInit,
  HostListener,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from './organisation-state.service';
import { ThemeService } from './theme.service';

const SIDEBAR_KEY = 'signage_sidebar_collapsed';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile overlay -->
    @if (mobileOpen()) {
      <div
        class="overlay"
        (click)="mobileOpen.set(false)"
        (keydown.escape)="mobileOpen.set(false)"
        tabindex="-1"
        role="presentation"
      ></div>
    }

    <!-- Sidebar -->
    <aside
      class="sidebar"
      [class.collapsed]="collapsed()"
      [class.mobile-open]="mobileOpen()"
    >
      <div class="sidebar-header">
        @if (!collapsed()) {
          <span class="logo-text">Signage</span>
        }
        <button
          class="collapse-btn desktop-only"
          (click)="toggleCollapse()"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            @if (collapsed()) {
              <path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            } @else {
              <path d="M13 4l-6 6 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            }
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            (click)="mobileOpen.set(false)"
            [attr.title]="collapsed() ? item.label : null"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            @if (!collapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item" (click)="logout()" [attr.title]="collapsed() ? 'Logout' : null">
          <span class="nav-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3M13 14l4-4-4-4M17 10H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          @if (!collapsed()) {
            <span class="nav-label">Logout</span>
          }
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="main-wrapper" [class.sidebar-collapsed]="collapsed()">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="hamburger mobile-only"
            (click)="mobileOpen.set(true)"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <!-- Organisation switcher -->
          <div class="org-switcher">
            <select
              class="org-select"
              [value]="orgState.selectedOrgId() ?? ''"
              (change)="onOrgChange($event)"
              [disabled]="orgState.organisations().length <= 1"
            >
              @for (org of orgState.organisations(); track org.id) {
                <option [value]="org.id">{{ org.name }} ({{ formatRole(org.role) }})</option>
              }
            </select>
          </div>
        </div>

        <div class="topbar-right">
          <!-- Global search placeholder -->
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search..."
              disabled
            />
          </div>

          <!-- Theme toggle -->
          <button
            class="topbar-btn"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (theme.isDark()) {
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            } @else {
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M17.39 11.39A8 8 0 018.61 2.61 8 8 0 1017.39 11.39z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            }
          </button>

          <!-- Notification bell placeholder -->
          <button class="topbar-btn notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a5 5 0 00-5 5v3l-1.5 2h13L15 10V7a5 5 0 00-5-5zM8.5 17a1.5 1.5 0 003 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="badge">0</span>
          </button>

          <!-- User avatar -->
          <div class="user-avatar" aria-label="Current user">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100vh;
    }

    /* ── Overlay ── */
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 40;
    }

    /* ── Sidebar ── */
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 240px;
      background: var(--color-bg-secondary);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      z-index: 50;
      transition: width 0.2s ease, transform 0.2s ease;
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
      transition: background 0.15s, color 0.15s;
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

    .sidebar-footer {
      padding: 0.5rem;
      border-top: 1px solid var(--color-border);
    }

    /* ── Main wrapper ── */
    .main-wrapper {
      flex: 1;
      margin-left: 240px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left 0.2s ease;
    }
    .main-wrapper.sidebar-collapsed {
      margin-left: 60px;
    }

    /* ── Top bar ── */
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

    /* ── Search ── */
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 0.375rem 0.75rem;
    }
    .search-icon {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
    .search-input {
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      width: 160px;
      outline: none;
    }
    .search-input::placeholder {
      color: var(--color-text-muted);
    }
    .search-input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
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

    .notification-btn {
      position: relative;
    }
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      background: var(--color-accent);
      color: #fff;
      font-size: 0.625rem;
      font-weight: 600;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }

    .user-avatar {
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

    /* ── Content ── */
    .content {
      flex: 1;
      padding: 1.5rem;
    }

    /* ── Desktop-only / Mobile-only ── */
    .mobile-only { display: none; }

    /* ── Responsive: Tablet (<=1024px) — collapse sidebar ── */
    @media (max-width: 1024px) {
      .sidebar { width: 60px; }
      .sidebar .nav-label,
      .sidebar .logo-text { display: none; }
      .sidebar .sidebar-header { justify-content: center; }
      .desktop-only { display: none; }
      .main-wrapper { margin-left: 60px; }
      .main-wrapper.sidebar-collapsed { margin-left: 60px; }
    }

    /* ── Responsive: Mobile (<=768px) — sidebar as overlay ── */
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        width: 240px;
      }
      .sidebar .nav-label,
      .sidebar .logo-text { display: inline; }
      .sidebar.mobile-open {
        transform: translateX(0);
      }
      .main-wrapper,
      .main-wrapper.sidebar-collapsed {
        margin-left: 0;
      }
      .mobile-only { display: flex; }
      .search-box { display: none; }
      .content { padding: 1rem; }
    }
  `,
})
export class Layout implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly orgState = inject(OrganisationStateService);
  readonly theme = inject(ThemeService);

  readonly collapsed = signal(localStorage.getItem(SIDEBAR_KEY) === 'true');
  readonly mobileOpen = signal(false);

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
    },
    {
      label: 'Screens',
      route: '/screens',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 17h6M10 14v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    },
    {
      label: 'Screen Groups',
      route: '/screen-groups',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="2" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="13" width="7" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M9 7v2.5a1 1 0 001 1h0a1 1 0 001-1V7M10 10.5V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    },
    {
      label: 'Content Library',
      route: '/content',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 13l4-4 3 3 2-2 5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      label: 'Playlists',
      route: '/playlists',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h10M3 10h7M3 15h5M15 10v7M15 17l4-3.5-4-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      label: 'Schedules',
      route: '/schedules',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h14M7 2v4M13 2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    },
    {
      label: 'Audit Log',
      route: '/audit-log',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 3h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    },
    {
      label: 'Settings',
      route: '/settings/users',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    },
  ];

  ngOnInit(): void {
    this.orgState.loadOrganisations();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.mobileOpen.set(false);
    }
  }

  toggleCollapse(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }

  onOrgChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.orgState.select(value);
    }
  }

  formatRole(role: string): string {
    switch (role) {
      case 'org_admin': return 'Admin';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
