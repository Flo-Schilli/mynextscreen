import { Component, inject, signal, OnInit, HostListener, effect, computed } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from './organisation-state.service';
import { ThemeService } from './theme.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { AppSidebar, NavItem } from './app-sidebar';
import { AppTopbar } from './app-topbar';

const SIDEBAR_KEY = 'signage_sidebar_collapsed';

/**
 * Smart container for the app shell. Owns the collapsed/mobile-open state, the
 * org/theme/auth wiring and the SSE connection lifecycle, and composes the
 * sidebar + top bar around the routed content outlet.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppSidebar, AppTopbar],
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
    <app-sidebar
      [collapsed]="collapsed()"
      [mobileOpen]="mobileOpen()"
      [navItems]="navItems"
      [isSuperAdmin]="orgState.isSuperAdmin()"
      (toggleCollapse)="toggleCollapse()"
      (closeMobile)="mobileOpen.set(false)"
      (logout)="logout()"
    />

    <!-- Main area -->
    <div class="main-wrapper" [class.sidebar-collapsed]="collapsed()">
      <app-topbar
        [organisations]="orgState.organisations()"
        [selectedOrgId]="orgState.selectedOrgId()"
        [isSuperAdmin]="orgState.isSuperAdmin()"
        [isDark]="theme.isDark()"
        [userEmail]="userEmail()"
        (openMobile)="mobileOpen.set(true)"
        (selectOrg)="orgState.select($event)"
        (toggleTheme)="theme.toggle()"
        (openProfile)="goToProfile()"
        (logout)="logout()"
      />

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

    /* ── Content ── */
    .content {
      flex: 1;
      padding: 1.5rem;
    }

    /* ── Responsive: Tablet (<=1024px) ── */
    @media (max-width: 1024px) {
      .main-wrapper,
      .main-wrapper.sidebar-collapsed {
        margin-left: 60px;
      }
    }

    /* ── Responsive: Mobile (<=768px) ── */
    @media (max-width: 768px) {
      .main-wrapper,
      .main-wrapper.sidebar-collapsed {
        margin-left: 0;
      }
      .content {
        padding: 1rem;
      }
    }
  `,
})
export class Layout implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private socketService = inject(DashboardSseService);
  readonly orgState = inject(OrganisationStateService);
  readonly theme = inject(ThemeService);

  readonly collapsed = signal(localStorage.getItem(SIDEBAR_KEY) === 'true');
  readonly mobileOpen = signal(false);
  readonly userEmail = computed(() => this.authService.user()?.email ?? null);

  private socketEffect = effect(() => {
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      this.socketService.connect();
    }
  });

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
      label: 'Live Streams',
      route: '/live-streams',
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M5 5a7 7 0 000 10M15 5a7 7 0 010 10M3 3a11 11 0 000 14M17 3a11 11 0 010 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
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

  goToProfile(): void {
    this.router.navigate(['/settings/user']);
  }

  async logout(): Promise<void> {
    this.socketService.disconnect();
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
