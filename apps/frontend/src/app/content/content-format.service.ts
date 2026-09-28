import { Injectable } from '@angular/core';
import { StorageInfo } from './content.model';
import { UI_LOCALE } from '../shared/locale';

/**
 * Pure presentation helpers for content sizes, dates and storage-bar
 * percentages. Extracted verbatim from the content-library component so the
 * math stays unit-testable and free of view concerns.
 */
@Injectable({ providedIn: 'root' })
export class ContentFormatService {
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (!isFinite(bytes)) return 'Unlimited';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(UI_LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Width (in %) of the "original" segment of the storage bar. When no limits
   * are configured the segments split the bar proportionally by usage.
   */
  originalPercent(storage: StorageInfo | null): number {
    if (!storage) return 0;
    const combinedLimit = (storage.originalLimitBytes || 0) + (storage.transcodedLimitBytes || 0);
    if (combinedLimit === 0) {
      const totalUsed = storage.originalUsedBytes + storage.transcodedUsedBytes;
      if (totalUsed === 0) return 0;
      return (storage.originalUsedBytes / totalUsed) * 100;
    }
    return (storage.originalUsedBytes / combinedLimit) * 100;
  }

  /** Width (in %) of the "transcoded" segment of the storage bar. */
  transcodedPercent(storage: StorageInfo | null): number {
    if (!storage) return 0;
    const combinedLimit = (storage.originalLimitBytes || 0) + (storage.transcodedLimitBytes || 0);
    if (combinedLimit === 0) {
      const totalUsed = storage.originalUsedBytes + storage.transcodedUsedBytes;
      if (totalUsed === 0) return 0;
      return (storage.transcodedUsedBytes / totalUsed) * 100;
    }
    return (storage.transcodedUsedBytes / combinedLimit) * 100;
  }
}
