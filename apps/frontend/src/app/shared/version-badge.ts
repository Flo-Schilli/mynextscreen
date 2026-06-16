import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { VersionService } from './version.service';

/**
 * Small presentational badge that renders the running app version (e.g. `v0.2.1`)
 * read from {@link VersionService}. Renders nothing when the version is unknown
 * (dev/test, where `/version.json` is absent). `compact` drops the `v` prefix and
 * shrinks the badge so it fits the collapsed sidebar rail.
 */
@Component({
  selector: 'app-version-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (version.version(); as v) {
      <span class="version-badge" [class.compact]="compact()" [attr.title]="'Version ' + v">
        {{ compact() ? v : 'v' + v }}
      </span>
    }
  `,
  styles: `
    .version-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      background: var(--surface-3);
      color: var(--text-muted);
      border: 1px solid var(--border);
      white-space: nowrap;
    }
    .version-badge.compact {
      padding: 0.125rem 0.25rem;
      font-size: 0.625rem;
    }
  `,
})
export class VersionBadge {
  readonly version = inject(VersionService);
  readonly compact = input(false);
}
