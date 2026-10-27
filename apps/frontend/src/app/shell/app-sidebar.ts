import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
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

/**
 * A run of nav entries under one heading. The first group goes without one;
 * a collapsible group folds away pages that are set up once and rarely visited.
 */
export interface NavGroup {
  id: string;
  label?: string;
  collapsible?: boolean;
  items: NavItem[];
}

const ADMIN_SECTION = '/admin';

/**
 * Presentational app sidebar — Phase 2 reskin.
 * 252 px expanded / 78 px collapsed, bg-rail, gradient logo tile, mns-icon nav.
 * Active state: bg-accent-soft + text-accent + 700 + 4×22 gradient pill on left.
 * Nav entries come in groups: Dashboard, Content, Playout, then a collapsible
 * Setup group for the rarely visited pages. Logout in footer.
 * In the icon-only rail (collapsed, or tablet width) headings and folding make
 * no sense, so every entry shows there and dividers separate the groups.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, TranslocoDirective],
  template: `
    <aside
      *transloco="let t"
      class="sidebar"
      [class.collapsed]="collapsed()"
      [class.mobile-open]="mobileOpen()"
    >
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
            [attr.aria-label]="t('shell.sidebar.collapse')"
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
            [attr.aria-label]="t('shell.sidebar.expand')"
          >
            <mns-icon name="Chevron" [size]="17" />
          </button>
        </div>
      }

      <!-- ── Nav ── -->
      <nav class="sidebar-nav">
        @for (group of navGroups(); track group.id; let first = $first) {
          <div class="nav-group" [class.closed]="!isGroupOpen(group)">
            @if (!first) {
              <div class="nav-divider group-divider"></div>
            }
            @if (group.label) {
              @if (group.collapsible) {
                <button
                  type="button"
                  class="group-toggle"
                  [attr.aria-expanded]="isGroupOpen(group)"
                  [attr.aria-controls]="'nav-group-' + group.id"
                  [attr.aria-label]="t('shell.sidebar.toggleGroup', { group: t(group.label) })"
                  (click)="toggleGroup.emit(group.id)"
                >
                  <span class="group-label-text">{{ t(group.label) }}</span>
                  <mns-icon [name]="isGroupOpen(group) ? 'ChevronDown' : 'Chevron'" [size]="15" />
                </button>
              } @else {
                <div class="nav-group-label">{{ t(group.label) }}</div>
              }
            }
            <div class="group-items" [id]="'nav-group-' + group.id">
              @for (item of group.items; track item.route) {
                <a
                  class="nav-item"
                  [routerLink]="item.route"
                  [class.active]="isActive(item.section ?? item.route)"
                  (click)="closeMobile.emit()"
                  [attr.title]="collapsed() ? t(item.label) : null"
                >
                  <!-- Active gradient pill -->
                  <span class="active-pill" aria-hidden="true"></span>
                  <mns-icon [name]="item.icon" [size]="20" class="nav-icon-el" />
                  @if (!collapsed()) {
                    <span class="nav-label">{{ t(item.label) }}</span>
                  }
                </a>
              }
            </div>
          </div>
        }

        <!-- Instance Admin link (super admins only) -->
        @if (isSuperAdmin()) {
          <div class="nav-divider"></div>
          <a
            class="nav-item admin-nav-item"
            routerLink="/admin/dashboard"
            [class.active]="isActive(adminSection)"
            (click)="closeMobile.emit()"
            [attr.title]="collapsed() ? t('shell.nav.instanceAdmin') : null"
          >
            <span class="active-pill" aria-hidden="true"></span>
            <mns-icon name="Settings" [size]="20" class="nav-icon-el" />
            @if (!collapsed()) {
              <span class="nav-label">{{ t('shell.nav.instanceAdmin') }}</span>
            }
          </a>
        }
      </nav>

      <!-- ── Footer: Logout ── -->
      <div class="sidebar-footer">
        <button
          class="nav-item"
          (click)="logout.emit()"
          [attr.title]="collapsed() ? t('common.actions.logout') : null"
        >
          <span class="active-pill" aria-hidden="true"></span>
          <mns-icon name="Logout" [size]="20" class="nav-icon-el" />
          @if (!collapsed()) {
            <span class="nav-label">{{ t('common.actions.logout') }}</span>
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

    /* ── Groups ── */
    .nav-group,
    .group-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-group + .nav-group {
      margin-top: 10px;
    }
    .nav-group.closed .group-items {
      display: none;
    }
    .nav-group-label,
    .group-toggle {
      padding: 6px 13px 2px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .group-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      padding-bottom: 6px;
    }
    .group-toggle:hover {
      background: var(--hover);
      color: var(--text);
    }
    .group-divider {
      display: none;
    }

    /* Icon-only rail: every entry visible, dividers instead of headings. */
    .sidebar.collapsed .nav-group-label,
    .sidebar.collapsed .group-toggle {
      display: none;
    }
    .sidebar.collapsed .nav-group.closed .group-items {
      display: flex;
    }
    .sidebar.collapsed .group-divider {
      display: block;
    }
    .sidebar.collapsed .nav-group + .nav-group {
      margin-top: 0;
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
      .sidebar .logo-text,
      .sidebar .nav-group-label,
      .sidebar .group-toggle {
        display: none;
      }
      .sidebar .nav-group.closed .group-items {
        display: flex;
      }
      .sidebar .group-divider {
        display: block;
      }
      .sidebar .nav-group + .nav-group {
        margin-top: 0;
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
      .sidebar .nav-group-label {
        display: block;
      }
      .sidebar .group-toggle {
        display: flex;
      }
      .sidebar .nav-group.closed .group-items,
      .sidebar .group-divider {
        display: none;
      }
      .sidebar .nav-group + .nav-group {
        margin-top: 10px;
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
  readonly navGroups = input.required<NavGroup[]>();
  /** Ids of the collapsible groups the user has unfolded. */
  readonly openGroups = input<readonly string[]>([]);
  readonly isSuperAdmin = input.required<boolean>();

  readonly toggleCollapse = output<void>();
  readonly toggleGroup = output<string>();
  readonly closeMobile = output<void>();
  readonly logout = output<void>();

  /** A folded group still opens while one of its pages is showing, or the active page would vanish. */
  protected isGroupOpen(group: NavGroup): boolean {
    return (
      !group.collapsible ||
      this.openGroups().includes(group.id) ||
      group.items.some((item) => this.isActive(item.section ?? item.route))
    );
  }

  /** Matches on whole segments, so `/audit-log` never lights up on `/audit-log-x`. */
  protected isActive(section: string): boolean {
    const path = this.currentPath();
    return path === section || path.startsWith(`${section}/`);
  }
}
