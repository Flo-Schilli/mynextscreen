import { Injectable } from '@angular/core';
import { PlaylistItem } from './playlist.model';
import { UI_LOCALE } from '../shared/locale';

/**
 * Pure formatting and duration helpers for the playlists feature. Extracted
 * verbatim from the playlists component so the math stays unit-testable and
 * free of view concerns.
 */
@Injectable({ providedIn: 'root' })
export class PlaylistFormatService {
  /** Sum of the per-item durations (seconds) of a playlist's items. */
  totalDurationSeconds(items: readonly PlaylistItem[] | undefined): number {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + item.durationSeconds, 0);
  }

  /** Human-readable duration: `45s`, `3m`, `3m 20s`, `1h`, `1h 5m`. */
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(UI_LOCALE);
  }
}
