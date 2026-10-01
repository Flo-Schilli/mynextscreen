import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { IconComponent, IconName } from '../ui/icon.component';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  /**
   * Section this entry stands for, when that is wider than where it links.
   * Settings links to its first tab but owns every `/settings` route, and an
   * entry that goes dark the moment a second tab is opened is worse than none.
   */
  section?: string;
}

const ADMIN_SECTION = '/admin';

/**
 * Presentational app sidebar — Phase 2 reskin.
 * 252 px expanded / 78 px collapsed, bg-rail, gradient logo tile, mns-icon nav.
 * Active state: bg-accent-soft + text-accent + 700 + 4×22 gradient pill on left.
 * Nav order per README: Dashboard, Screens, Screen Groups, Content Library,
 * Playlists, Schedules, Live Streams, Audit Log, Settings. Logout in footer.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
      <!-- ── Header ── -->
      <div class="sidebar-header">
        <!-- Logo tile + wordmark -->
        <div class="logo-wrap">
          <!-- gradient tile -->
          <div class="logo-tile">
            <mns-icon name="Layers" [size]="19" style="color:#fff" />
          </div>
          <!-- wordmark — hidden when collapsed -->
          @if (!collapsed()) {
            <span class="logo-text">
              <span class="logo-my">my</span><span class="logo-next">NextScreen</span>
            </span>
          }
        </div>

        <!-- Collapse/expand chevron (only when expanded) -->
        @if (!collapsed()) {
          <button
            class="collapse-btn desktop-only"
            (click)="toggleCollapse.emit()"
            [attr.aria-label]="'Collapse sidebar'"
          >
            <mns-icon name="ChevronLeft" [size]="17" />
          </button>
        }
      </div>

      <!-- Expand chevron when collapsed -->
      @if (collapsed()) {
        <div class="expand-wrap">
          <button
            class="collapse-btn"
            (click)="toggleCollapse.emit()"
            [attr.aria-label]="'Expand sidebar'"
          >
            <mns-icon name="Chevron" [size]="17" />
          </button>
        </div>
      }

      <!-- ── Nav ── -->
      <nav class="sidebar-nav">
        @for (item of navItems(); track item.route) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            [class.active]="isActive(item.section ?? item.route)"
            (click)="closeMobile.emit()"
            [attr.title]="collapsed() ? item.label : null"
          >
            <!-- Active gradient pill -->
            <span class="active-pill" aria-hidden="true"></span>
            <mns-icon [name]="item.icon" [size]="20" class="nav-icon-el" />
            @if (!collapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }

        <!-- Instance Admin link (super admins only) -->
        @if (isSuperAdmin()) {
          <div class="nav-divider"></div>
          <a
            class="nav-item admin-nav-item"
            routerLink="/admin/dashboard"
            [class.active]="isActive(adminSection)"
            (click)="closeMobile.emit()"
            [attr.title]="collapsed() ? 'Instance Admin' : null"
          >
            <span class="active-pill" aria-hidden="true"></span>
            <mns-icon name="Settings" [size]="20" class="nav-icon-el" />
            @if (!collapsed()) {
              <span class="nav-label">Instance Admin</span>
            }
          </a>
        }
      </nav>

      <!-- ── Footer: Logout ── -->
      <div class="sidebar-footer">
        <button
          class="nav-item"
          (click)="logout.emit()"
          [attr.title]="collapsed() ? 'Logout' : null"
        >
          <span class="active-pill" aria-hidden="true"></span>
          <mns-icon name="Logout" [size]="20" class="nav-icon-el" />
          @if (!collapsed()) {
            <span class="nav-label">Logout</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: `
    .sidebar {
      width: 252px;
      flex-shrink: 0;
      background: var(--rail);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100%;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 50;
      transition: width 0.22s cubic-bezier(0.22, 0.61, 0.36, 1);
      overflow: hidden;
    }
    .sidebar.collapsed {
      width: 78px;
    }

    /* ── Header ── */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 20px 18px;
      border-bottom: 1px solid var(--border);
      min-height: 73px;
      flex-shrink: 0;
    }
    .sidebar.collapsed .sidebar-header {
      padding: 20px 0;
      justify-content: center;
    }
    .logo-wrap {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }
    .logo-tile {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      display: grid;
      place-items: center;
      box-shadow: 0 8px 18px -8px var(--accent-ring);
    }
    .logo-text {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }
    .logo-my {
      color: var(--text);
    }
    .logo-next {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .collapse-btn {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
    }
    .collapse-btn:hover {
      background: var(--hover);
      color: var(--text);
    }
    .expand-wrap {
      display: flex;
      justify-content: center;
      padding: 12px 14px 0;
    }

    /* ── Nav ── */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 14px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sidebar.collapsed .sidebar-nav {
      padding: 12px 14px;
    }

    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 11px 13px;
      border-radius: 11px;
      border: none;
      text-align: left;
      background: transparent;
      color: var(--text-muted);
      font-weight: 500;
      font-size: 14.5px;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background 0.12s,
        color 0.12s;
    }
    .sidebar.collapsed .nav-item {
      padding: 11px;
      justify-content: center;
    }
    .nav-item:hover {
      background: var(--hover);
      color: var(--text);
    }
    .nav-item.active {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
    }

    /* Active gradient pill on the left edge */
    .active-pill {
      display: none;
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 22px;
      border-radius: 99px;
      background: linear-gradient(var(--accent), var(--accent-2));
    }
    .nav-item.active .active-pill {
      display: block;
    }

    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-divider {
      height: 1px;
      background: var(--border);
      margin: 6px 2px;
    }

    /* Instance Admin amber overrides */
    .admin-nav-item {
      color: var(--text-muted);
    }
    .admin-nav-item:hover {
      background: rgba(245, 166, 35, 0.1);
      color: #fbbf24;
    }
    .admin-nav-item.active {
      background: rgba(245, 166, 35, 0.14);
      color: #f5a623;
    }
    .admin-nav-item.active .active-pill {
      background: linear-gradient(#f5a623, #f97316);
    }

    /* ── Footer ── */
    .sidebar-footer {
      padding: 14px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    /* ── Responsive: Tablet (<=1100px) — collapse sidebar ── */
    @media (max-width: 1100px) {
      .sidebar {
        width: 78px;
      }
      .sidebar .nav-label,
      .sidebar .logo-text {
        display: none;
      }
      .sidebar .sidebar-header {
        justify-content: center;
        padding: 20px 0;
      }
      .desktop-only {
        display: none;
      }
    }

    /* ── Responsive: Mobile (<=768px) — sidebar as overlay ── */
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        width: 252px;
      }
      .sidebar .nav-label,
      .sidebar .logo-text {
        display: inline;
      }
      .sidebar.mobile-open {
        transform: translateX(0);
      }
      .sidebar .sidebar-header {
        justify-content: space-between;
        padding: 20px 18px;
      }
    }
  `,
})
export class AppSidebar {
  private readonly router = inject(Router);

  /**
   * `routerLinkActive` can only ever match the link's own target, so an entry
   * pointing at a landing tab went inactive on every other tab of its section.
   * The current path is compared against the section instead.
   */
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly currentPath = computed(() => this.path().split(/[?#]/)[0]);

  protected readonly adminSection = ADMIN_SECTION;

  readonly collapsed = input.required<boolean>();
  readonly mobileOpen = input.required<boolean>();
  readonly navItems = input.required<NavItem[]>();
  readonly isSuperAdmin = input.required<boolean>();

  readonly toggleCollapse = output<void>();
  readonly closeMobile = output<void>();
  readonly logout = output<void>();

  /** Matches on whole segments, so `/audit-log` never lights up on `/audit-log-x`. */
  protected isActive(section: string): boolean {
    const path = this.currentPath();
    return path === section || path.startsWith(`${section}/`);
  }
}
