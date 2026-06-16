import { describe, it, expect } from 'vitest';
import {
  computePosition,
  cycleDurationMs,
  itemDurationMs,
  DEFAULT_ITEM_DURATION_S,
  type ClockItem,
} from './playlist-clock';

function img(duration: number): ClockItem {
  return { duration, type: 'image' };
}
function vid(duration: number): ClockItem {
  return { duration, type: 'video' };
}

describe('itemDurationMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(itemDurationMs(img(5))).toBe(5000);
  });

  it('falls back to the default for zero or negative durations', () => {
    expect(itemDurationMs(img(0))).toBe(DEFAULT_ITEM_DURATION_S * 1000);
    expect(itemDurationMs(img(-3))).toBe(DEFAULT_ITEM_DURATION_S * 1000);
  });
});

describe('cycleDurationMs', () => {
  it('sums all item durations', () => {
    expect(cycleDurationMs([img(5), vid(10), img(15)])).toBe(30_000);
  });

  it('is zero for an empty playlist', () => {
    expect(cycleDurationMs([])).toBe(0);
  });
});

describe('computePosition', () => {
  const items = [img(5), img(10), img(15)]; // boundaries at 0, 5s, 15s, cycle 30s
  const epoch = 1_000_000;

  it('returns index 0 with no auto-advance for an empty playlist', () => {
    const pos = computePosition([], epoch, epoch + 1234);
    expect(pos).toEqual({ index: 0, offsetMs: 0, nextBoundaryAtMs: Number.POSITIVE_INFINITY });
  });

  it('returns the first item at the epoch itself', () => {
    const pos = computePosition(items, epoch, epoch);
    expect(pos.index).toBe(0);
    expect(pos.offsetMs).toBe(0);
    expect(pos.nextBoundaryAtMs).toBe(epoch + 5_000);
  });

  it('resolves an item mid-cycle with the correct offset and boundary', () => {
    // 8s in → inside item 1 (5s..15s), 3s offset, boundary at 15s.
    const pos = computePosition(items, epoch, epoch + 8_000);
    expect(pos.index).toBe(1);
    expect(pos.offsetMs).toBe(3_000);
    expect(pos.nextBoundaryAtMs).toBe(epoch + 15_000);
  });

  it('wraps deterministically across full cycles', () => {
    // 2 full cycles + 8s → same position as 8s in.
    const pos = computePosition(items, epoch, epoch + 2 * 30_000 + 8_000);
    expect(pos.index).toBe(1);
    expect(pos.offsetMs).toBe(3_000);
  });

  it('handles a now value before the epoch (negative elapsed)', () => {
    // 3s before epoch → 27s into the previous cycle → item 2 (15s..30s), 12s offset.
    const pos = computePosition(items, epoch, epoch - 3_000);
    expect(pos.index).toBe(2);
    expect(pos.offsetMs).toBe(12_000);
  });

  it('keeps a single item looping at its own boundary', () => {
    const single = [vid(20)];
    const pos = computePosition(single, epoch, epoch + 25_000); // 5s into 2nd loop
    expect(pos.index).toBe(0);
    expect(pos.offsetMs).toBe(5_000);
    expect(pos.nextBoundaryAtMs).toBe(epoch + 25_000 + 15_000);
  });

  it('treats the exact cycle boundary as the start of item 0', () => {
    const pos = computePosition(items, epoch, epoch + 30_000);
    expect(pos.index).toBe(0);
    expect(pos.offsetMs).toBe(0);
  });
});
