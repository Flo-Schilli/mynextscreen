import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui';

/**
 * Shared underline tab bar for the three org-settings routes (User Management,
 * Notification Config, Storage). Active tab is driven by `routerLinkActive`, so
 * each consuming view just embeds `<app-settings-tabs />` — no per-view duplicate.
 *
 * On narrow screens the row scrolls horizontally; a right-edge fade hint signals
 * there is more to scroll (only shown below the breakpoint where the tabs fit).
 */
@Component({
  selector: 'app-settings-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="tabs-wrap relative mb-[var(--gap,1.5rem)]">
      <nav
        class="flex gap-1 border-b border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <a
          routerLink="/settings/users"
          routerLinkActive="!text-text !border-accent"
          class="flex shrink-0 items-center gap-2 px-3.5 py-3 -mb-px text-sm font-semibold whitespace-nowrap border-b-2 border-transparent text-muted hover:text-text transition-colors"
        >
          <mns-icon name="User" [size]="16" />
          User Management
        </a>
        <a
          routerLink="/settings/org/notifications"
          routerLinkActive="!text-text !border-accent"
          class="flex shrink-0 items-center gap-2 px-3.5 py-3 -mb-px text-sm font-semibold whitespace-nowrap border-b-2 border-transparent text-muted hover:text-text transition-colors"
        >
          <mns-icon name="Bell" [size]="16" />
          Notification Config
        </a>
        <a
          routerLink="/settings/org/storage"
          routerLinkActive="!text-text !border-accent"
          class="flex shrink-0 items-center gap-2 px-3.5 py-3 -mb-px text-sm font-semibold whitespace-nowrap border-b-2 border-transparent text-muted hover:text-text transition-colors"
        >
          <mns-icon name="Storage" [size]="16" />
          Storage
        </a>
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
export class SettingsTabsComponent {}
