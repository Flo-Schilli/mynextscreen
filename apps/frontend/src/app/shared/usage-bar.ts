import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { formatBytes } from './format-bytes';

export type UsageBarVariant = 'accent' | 'purple' | 'teal';

/**
 * Presentational single usage bar: a labelled `used / total` row, a colored
 * progress track and a percent caption. The fill colour follows `variant`, and
 * the track turns amber above 80% and red above 95% to flag near-full storage.
 * A `total` of 0 (unlimited / unknown) renders an empty bar at 0%.
 */
@Component({
  selector: 'app-usage-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="usage-section">
      <div class="usage-label-row">
        <span class="usage-label">{{ label() }}</span>
        <span class="usage-value"
          >{{ formatBytes(usedBytes()) }} / {{ formatBytes(totalBytes()) }}</span
        >
      </div>
      <div
        class="usage-bar"
        [class.warning]="percent() > 80 && percent() <= 95"
        [class.danger]="percent() > 95"
      >
        <div class="usage-fill" [class]="variant()" [style.width.%]="percent()"></div>
      </div>
      <span class="usage-percent">{{ percent().toFixed(1) }}%</span>
    </div>
  `,
  styles: `
    .usage-section {
      margin-bottom: 1rem;
    }
    .usage-section:last-child {
      margin-bottom: 0;
    }
    .usage-label-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }
    .usage-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    .usage-value {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .usage-bar {
      height: 8px;
      background: var(--surface-3);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }
    .usage-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .usage-fill.accent {
      background: var(--accent);
    }
    .usage-fill.purple {
      background: #8b5cf6;
    }
    .usage-fill.teal {
      background: #14b8a6;
    }
    .usage-bar.warning .usage-fill {
      background: #f59e0b;
    }
    .usage-bar.danger .usage-fill {
      background: #ef4444;
    }
    .usage-percent {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }
  `,
})
export class UsageBar {
  readonly label = input.required<string>();
  readonly usedBytes = input.required<number>();
  readonly totalBytes = input.required<number>();
  readonly variant = input<UsageBarVariant>('accent');

  readonly percent = computed(() => {
    const total = this.totalBytes();
    if (total <= 0) return 0;
    return Math.min((this.usedBytes() / total) * 100, 100);
  });

  protected readonly formatBytes = formatBytes;
}
