/**
 * Deterministic playlist clock.
 *
 * Every screen in a group computes its playback position from the same two
 * inputs — a shared `epoch` (ms) and a clock synchronized to the server — so all
 * members land on the same item at the same offset and switch together, without
 * any per-screen drift from independent local timers.
 */

/** Fallback duration (seconds) for items without a positive duration. */
export const DEFAULT_ITEM_DURATION_S = 10;

export interface ClockItem {
  /** Display duration in seconds (image override or video metadata length). */
  duration: number;
  type: string;
}

export interface PlaylistPosition {
  /** Index of the item that should be on screen right now. */
  index: number;
  /** How far (ms) into that item we currently are. */
  offsetMs: number;
  /** Absolute time (ms, server clock) at which the next item should start. */
  nextBoundaryAtMs: number;
}

/** Duration of a single item in milliseconds, clamped to a sane minimum. */
export function itemDurationMs(item: ClockItem): number {
  const ms = (item.duration || DEFAULT_ITEM_DURATION_S) * 1000;
  return ms > 0 ? ms : DEFAULT_ITEM_DURATION_S * 1000;
}

/** Total length (ms) of one full playlist cycle. */
export function cycleDurationMs(items: readonly ClockItem[]): number {
  return items.reduce((sum, item) => sum + itemDurationMs(item), 0);
}

/**
 * Resolve the deterministic playback position for `nowMs` (server clock).
 *
 * Returns index 0 / no auto-advance (`Infinity` boundary) for an empty playlist
 * or a zero-length cycle, so callers can safely skip scheduling.
 */
export function computePosition(
  items: readonly ClockItem[],
  epochMs: number,
  nowMs: number,
): PlaylistPosition {
  if (items.length === 0) {
    return { index: 0, offsetMs: 0, nextBoundaryAtMs: Number.POSITIVE_INFINITY };
  }

  const cycle = cycleDurationMs(items);
  if (cycle <= 0) {
    return { index: 0, offsetMs: 0, nextBoundaryAtMs: Number.POSITIVE_INFINITY };
  }

  // Position within the current cycle, normalized to [0, cycle) even when the
  // clock is (briefly) behind the epoch.
  const elapsed = (((nowMs - epochMs) % cycle) + cycle) % cycle;

  let acc = 0;
  for (let index = 0; index < items.length; index++) {
    const dur = itemDurationMs(items[index]);
    if (elapsed < acc + dur) {
      const offsetMs = elapsed - acc;
      return { index, offsetMs, nextBoundaryAtMs: nowMs + (dur - offsetMs) };
    }
    acc += dur;
  }

  // Floating-point guard: treat the exact cycle boundary as the start of item 0.
  return { index: 0, offsetMs: 0, nextBoundaryAtMs: nowMs + itemDurationMs(items[0]) };
}
