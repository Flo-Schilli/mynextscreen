import { Injectable } from '@angular/core';

/**
 * Pure geometry helpers for the split video-wall preview: a single source
 * image is scaled up to span the whole grid and each cell shows the slice that
 * maps to its (col,row). Extracted from the screen-group detail component so the
 * math stays view-free and unit-testable.
 */
@Injectable({ providedIn: 'root' })
export class ScreenWallPreviewService {
  /** CSS `background-size` that blows the image up to cover the whole grid. */
  backgroundSize(gridColumns: number | null, gridRows: number | null): string {
    if (!gridColumns || !gridRows) return '100% 100%';
    return `${gridColumns * 100}% ${gridRows * 100}%`;
  }

  /** CSS `background-position` that selects the slice for the given cell. */
  backgroundPosition(
    col: number,
    row: number,
    gridColumns: number | null,
    gridRows: number | null,
  ): string {
    const cols = gridColumns ?? 1;
    const rows = gridRows ?? 1;
    const xPct = cols > 1 ? (col / (cols - 1)) * 100 : 0;
    const yPct = rows > 1 ? (row / (rows - 1)) * 100 : 0;
    return `${xPct}% ${yPct}%`;
  }
}
