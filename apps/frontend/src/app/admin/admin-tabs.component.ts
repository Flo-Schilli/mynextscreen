import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { IconComponent, IconName } from '../ui';

interface AdminTab {
  /** i18n key resolved in the template. */
  labelKey: string;
  route: string;
  icon: IconName;
}

const ADMIN_TABS: AdminTab[] = [
  { labelKey: 'admin.tabs.dashboard', route: '/admin/dashboard', icon: 'Dashboard' },
  { labelKey: 'admin.tabs.organisations', route: '/admin/organisations', icon: 'Building' },
  { labelKey: 'admin.tabs.users', route: '/admin/users', icon: 'User' },
  { labelKey: 'admin.tabs.auditLog', route: '/admin/audit-log', icon: 'Audit' },
];

/**
 * Shared underline tab bar for the four instance-admin routes, mirroring
 * {@link SettingsTabsComponent}. It used to be copied verbatim into each of the
 * four views, which is how all four ended up showing a scrollbar.
 *
 * On narrow screens the row scrolls horizontally, with a right-edge fade as the
 * hint; the bar itself is hidden, as it is in settings. `overflow-y` is pinned
 * because `overflow-x: auto` alone computes the other axis to `auto` as well,
 * and the tabs' -1px bottom margin is enough to make a 41px-tall strip scroll.
 */
@Component({
  selector: 'app-admin-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, TranslocoDirective],
  template: `
    <div class="tabs-wrap relative mb-[var(--gap)]" *transloco="let t">
      <nav
        class="flex gap-1 border-b border-border overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        @for (tab of tabs; track tab.route) {
          <a
            [routerLink]="tab.route"
            class="flex shrink-0 items-center gap-2 px-[14px] py-3 -mb-px text-[14px] font-semibold whitespace-nowrap border-b-2 border-transparent text-muted hover:text-text transition-colors no-underline"
            routerLinkActive="!text-text !border-accent"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <mns-icon [name]="tab.icon" [size]="16" />
            {{ t(tab.labelKey) }}
          </a>
        }
      </nav>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    /* Right-edge fade hints that the tab row scrolls horizontally on narrow
       screens. Hidden once the tabs fit (>=768px) so it never misleads. */
    .tabs-wrap::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 1px;
      width: 2.25rem;
      pointer-events: none;
      background: linear-gradient(to right, transparent, var(--bg));
    }
    @media (min-width: 768px) {
      .tabs-wrap::after {
        display: none;
      }
    }
  `,
})
export class AdminTabsComponent {
  protected readonly tabs = ADMIN_TABS;
}
