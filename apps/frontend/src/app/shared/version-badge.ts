import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { VersionService } from './version.service';

/** Where users can obtain the source of the running instance (AGPL-3.0 §13). */
export const SOURCE_URL = 'https://github.com/Flo-Schilli/mynextscreen';

/**
 * Badge showing the running app version (e.g. `v0.2.1`) from
 * {@link VersionService}, linking to the source.
 *
 * The link is not decoration: this project is AGPL-3.0, and §13 requires that
 * users interacting with the software over a network are offered its complete
 * source. It therefore renders even when the version is unknown (dev/test,
 * where `/version.json` is absent) — the version is optional, the offer is not.
 *
 * `compact` drops the `v` prefix and shrinks the badge so it fits the collapsed
 * sidebar rail.
 */
@Component({
  selector: 'app-version-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="version-badge"
      [class.compact]="compact()"
      [href]="sourceUrl"
      target="_blank"
      rel="noopener noreferrer"
      [attr.title]="
        (version.version() ? 'Version ' + version.version() + ' — ' : '') + 'Source code (AGPL-3.0)'
      "
    >
      @if (version.version(); as v) {
        {{ compact() ? v : 'v' + v }}
      } @else {
        {{ compact() ? 'src' : 'Source' }}
      }
    </a>
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
      text-decoration: none;
    }
    .version-badge:hover {
      color: var(--text);
      border-color: var(--text-muted);
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
  protected readonly sourceUrl = SOURCE_URL;
}
