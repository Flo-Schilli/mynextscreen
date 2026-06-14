import { Component, inject, signal, OnInit, HostListener, effect, computed } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from './organisation-state.service';
import { ThemeService } from './theme.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { AppSidebar, NavItem } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { OrgSwitchModal } from './org-switch-modal';

const SIDEBAR_KEY = 'signage_sidebar_collapsed';

/**
 * Smart container for the app shell — Phase 2 reskin.
 * Grid layout: sidebar (252 / 78 px) + main column.
 * Responsive breakpoints: 1100 / 880 / 560 px per spec.
 * <main> padding: 28px 28px 48px, inner max-width: 1320 px.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, AppSidebar, AppTopbar, OrgSwitchModal],
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
      [navItems]="visibleNavItems()"
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
        [selectedOrg]="orgState.selectedOrg()"
        [isSuperAdmin]="orgState.isSuperAdmin()"
        [isDark]="theme.isDark()"
        [userEmail]="userEmail()"
        [avatarUrl]="orgState.avatarUrl()"
        (openMobile)="mobileOpen.set(true)"
        (openOrgSwitch)="showOrgSwitch.set(true)"
        (toggleTheme)="theme.toggle()"
        (openProfile)="goToProfile()"
        (openInstanceAdmin)="goToInstanceAdmin()"
        (logout)="logout()"
      />

      <!-- Main content -->
      <main class="content">
        <div class="content-inner">
          <router-outlet />
        </div>
      </main>
    </div>

    <!-- Organisation switch modal -->
    @if (showOrgSwitch()) {
      <app-org-switch-modal
        [organisations]="orgState.organisations()"
        [selectedOrgId]="orgState.selectedOrgId()"
        (selectOrg)="onSelectOrg($event)"
        (dismiss)="showOrgSwitch.set(false)"
      />
    }
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100vh;
      overflow: hidden;
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
      margin-left: 252px;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      transition: margin-left 0.22s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    .main-wrapper.sidebar-collapsed {
      margin-left: 78px;
    }

    /* ── Content ── */
    .content {
      flex: 1;
      padding: 28px 28px 48px;
    }
    .content-inner {
      max-width: 1320px;
      margin: 0 auto;
    }

    /* ── Responsive: <=1100px — collapse sidebar ── */
    @media (max-width: 1100px) {
      .main-wrapper,
      .main-wrapper.sidebar-collapsed {
        margin-left: 78px;
      }
    }

    /* ── Responsive: <=880px ── */
    @media (max-width: 880px) {
      .content {
        padding: 20px 20px 40px;
      }
    }

    /* ── Responsive: Mobile (<=560px) ── */
    @media (max-width: 560px) {
      .main-wrapper,
      .main-wrapper.sidebar-collapsed {
        margin-left: 0;
      }
      .content {
        padding: 16px 16px 32px;
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
  readonly showOrgSwitch = signal(false);
  readonly userEmail = computed(() => this.authService.user()?.email ?? null);

  /**
   * Every primary nav item is organisation-scoped, so a user who belongs to no
   * organisation (e.g. a pure instance admin) sees none of them — only the
   * super-admin link the sidebar renders on its own remains.
   */
  readonly visibleNavItems = computed(() =>
    this.orgState.organisations().length > 0 ? this.navItems : [],
  );

  private socketEffect = effect(() => {
    const orgId = this.orgState.selectedOrgId();
    if (orgId) {
      this.socketService.connect();
    }
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'Dashboard' },
    { label: 'Screens', route: '/screens', icon: 'Screens' },
    { label: 'Screen Groups', route: '/screen-groups', icon: 'Groups' },
    { label: 'Content Library', route: '/content', icon: 'Content' },
    { label: 'Playlists', route: '/playlists', icon: 'Playlists' },
    { label: 'Schedules', route: '/schedules', icon: 'Schedules' },
    { label: 'Live Streams', route: '/live-streams', icon: 'Stream' },
    { label: 'Audit Log', route: '/audit-log', icon: 'Audit' },
    { label: 'Settings', route: '/settings/users', icon: 'Settings' },
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

  goToInstanceAdmin(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  onSelectOrg(orgId: string): void {
    this.orgState.select(orgId);
    this.showOrgSwitch.set(false);
  }

  async logout(): Promise<void> {
    this.socketService.disconnect();
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
