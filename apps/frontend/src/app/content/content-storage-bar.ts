import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { StorageInfo } from './content.model';
import { ContentFormatService } from './content-format.service';

/**
 * Presentational storage-usage bar: shows used/limit totals and a two-segment
 * bar split between original and transcoded bytes. All math lives in
 * {@link ContentFormatService}; this component only renders it.
 */
@Component({
  selector: 'app-content-storage-bar',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <div class="storage-bar-container" *transloco="let t">
      <div class="storage-info">
        <span class="storage-label">{{ t('content.storage.label') }}</span>
        <span class="storage-values">
          {{ format.formatBytes(storage().originalUsedBytes + storage().transcodedUsedBytes) }}
          @if (storage().originalLimitBytes > 0 || storage().transcodedLimitBytes > 0) {
            /
            {{
              format.formatBytes(
                (storage().originalLimitBytes || Infinity) +
                  (storage().transcodedLimitBytes || Infinity)
              )
            }}
          }
        </span>
      </div>
      <div class="storage-bar">
        <div class="storage-bar-original" [style.width.%]="format.originalPercent(storage())"></div>
        <div
          class="storage-bar-transcoded"
          [style.width.%]="format.transcodedPercent(storage())"
          [style.left.%]="format.originalPercent(storage())"
        ></div>
      </div>
      <div class="storage-legend">
        <span class="legend-item"
          ><span class="legend-dot original"></span>
          {{
            t('content.storage.original', { size: format.formatBytes(storage().originalUsedBytes) })
          }}</span
        >
        <span class="legend-item"
          ><span class="legend-dot transcoded"></span>
          {{
            t('content.storage.transcoded', {
              size: format.formatBytes(storage().transcodedUsedBytes),
            })
          }}</span
        >
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .storage-bar-container {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .storage-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .storage-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .storage-values {
      font-size: 0.8125rem;
      color: var(--text);
    }
    .storage-bar {
      height: 0.5rem;
      background: var(--surface-3);
      border-radius: 9999px;
      position: relative;
      overflow: hidden;
    }
    .storage-bar-original {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--accent);
      border-radius: 9999px 0 0 9999px;
      transition: width 0.3s;
    }
    .storage-bar-transcoded {
      position: absolute;
      top: 0;
      height: 100%;
      background: #8b5cf6;
      border-radius: 0;
      transition:
        width 0.3s,
        left 0.3s;
    }
    .storage-legend {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .legend-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }
    .legend-dot.original {
      background: var(--accent);
    }
    .legend-dot.transcoded {
      background: #8b5cf6;
    }
  `,
})
export class ContentStorageBar {
  readonly storage = input.required<StorageInfo>();
  protected readonly format = inject(ContentFormatService);
  protected readonly Infinity = Infinity;
}
