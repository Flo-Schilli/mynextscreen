import { compareScheduleEntries, sortScheduleEntries } from './schedule-entry-order.util';
import type { OrderableScheduleEntry } from './schedule-entry-order.util';
import type { SchedulePriority } from '../db/schema';

describe('schedule entry order', () => {
  const BASE = new Date('2026-04-01T10:00:00Z');

  function entry(
    id: string,
    overrides: Partial<OrderableScheduleEntry> = {},
  ): OrderableScheduleEntry {
    return { id, priority: 'normal' as SchedulePriority, startTime: BASE, ...overrides };
  }

  describe('compareScheduleEntries', () => {
    it('ranks a high-priority entry before a normal one', () => {
      const high = entry('b', { priority: 'high' });
      const normal = entry('a');

      expect(compareScheduleEntries(high, normal)).toBeLessThan(0);
      expect(compareScheduleEntries(normal, high)).toBeGreaterThan(0);
    });

    it('ranks priority above an earlier start', () => {
      const earlierNormal = entry('a', { startTime: new Date(BASE.getTime() - 60_000) });
      const laterHigh = entry('b', { priority: 'high' });

      expect(compareScheduleEntries(laterHigh, earlierNormal)).toBeLessThan(0);
    });

    it('ranks the earlier start first at equal priority', () => {
      const earlier = entry('z', { startTime: new Date(BASE.getTime() - 60_000) });
      const later = entry('a');

      expect(compareScheduleEntries(earlier, later)).toBeLessThan(0);
    });

    it('breaks a full tie on the id', () => {
      expect(compareScheduleEntries(entry('a'), entry('b'))).toBeLessThan(0);
      expect(compareScheduleEntries(entry('b'), entry('a'))).toBeGreaterThan(0);
      expect(compareScheduleEntries(entry('a'), entry('a'))).toBe(0);
    });
  });

  describe('sortScheduleEntries', () => {
    // The point of the id tie-break: two screens resolving the same overlap
    // must land on the same entry whatever order the driver hands them back.
    it('yields the same order regardless of input order', () => {
      const entries = [entry('c'), entry('a'), entry('b')];

      const forwards = sortScheduleEntries(entries).map((e) => e.id);
      const backwards = sortScheduleEntries([...entries].reverse()).map((e) => e.id);

      expect(forwards).toEqual(['a', 'b', 'c']);
      expect(backwards).toEqual(forwards);
    });

    it('orders by priority, then start, then id', () => {
      const entries = [
        entry('d', { startTime: new Date(BASE.getTime() + 60_000) }),
        entry('c'),
        entry('b'),
        entry('a', { priority: 'high', startTime: new Date(BASE.getTime() + 120_000) }),
      ];

      expect(sortScheduleEntries(entries).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('leaves the input array untouched', () => {
      const entries = [entry('c'), entry('a')];

      sortScheduleEntries(entries);

      expect(entries.map((e) => e.id)).toEqual(['c', 'a']);
    });
  });
});
