import { Component, computed, input } from '@angular/core';
import { StorageInfo } from '../content/content.model';

/**
 * Presentational storage-usage bars for the dashboard. Derives the
 * original/transcoded fill percentages and human-readable byte labels from the
 * (non-null) `storage` input; the parent owns loading and the empty state.
 */
@Component({
  selector: 'app-dashboard-storage-usage',
  standalone: true,
  template: `
    <div class="storage-section">
      <div class="storage-label-row">
        <span class="storage-label">Originals</span>
        <span class="storage-value"
          >{{ formatBytes(storage().originalUsedBytes) }} /
          {{ formatBytes(storage().originalLimitBytes) }}</span
        >
      </div>
      <div
        class="storage-bar"
        [class.warning]="originalPercent() > 80 && originalPercent() <= 95"
        [class.danger]="originalPercent() > 95"
      >
        <div class="storage-fill originals" [style.width.%]="originalPercent()"></div>
      </div>
      <span class="storage-percent">{{ originalPercent().toFixed(1) }}%</span>
    </div>

    <div class="storage-section">
      <div class="storage-label-row">
        <span class="storage-label">Transcoded</span>
        <span class="storage-value"
          >{{ formatBytes(storage().transcodedUsedBytes) }} /
          {{ formatBytes(storage().transcodedLimitBytes) }}</span
        >
      </div>
      <div
        class="storage-bar"
        [class.warning]="transcodedPercent() > 80 && transcodedPercent() <= 95"
        [class.danger]="transcodedPercent() > 95"
      >
        <div class="storage-fill transcoded" [style.width.%]="transcodedPercent()"></div>
      </div>
      <span class="storage-percent">{{ transcodedPercent().toFixed(1) }}%</span>
    </div>
  `,
  styles: `
    .storage-section {
      margin-bottom: 1rem;
    }
    .storage-section:last-child {
      margin-bottom: 0;
    }
    .storage-label-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.375rem;
    }
    .storage-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    .storage-value {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .storage-bar {
      height: 8px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }
    .storage-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .storage-fill.originals {
      background: var(--color-accent);
    }
    .storage-fill.transcoded {
      background: #8b5cf6;
    }
    .storage-bar.warning .storage-fill {
      background: #f59e0b;
    }
    .storage-bar.danger .storage-fill {
      background: #ef4444;
    }
    .storage-percent {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }
  `,
})
export class DashboardStorageUsage {
  readonly storage = input.required<StorageInfo>();

  readonly originalPercent = computed(() => {
    const s = this.storage();
    if (s.originalLimitBytes === 0) return 0;
    return Math.min((s.originalUsedBytes / s.originalLimitBytes) * 100, 100);
  });

  readonly transcodedPercent = computed(() => {
    const s = this.storage();
    if (s.transcodedLimitBytes === 0) return 0;
    return Math.min((s.transcodedUsedBytes / s.transcodedLimitBytes) * 100, 100);
  });

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
  }
}
