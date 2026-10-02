import type { SchedulePriority } from '../db/schema';

/**
 * The fields that decide which of several simultaneously active schedule
 * entries wins. Deliberately structural: the sort is a pure function so the
 * tie-break can be asserted without a database.
 */
export interface OrderableScheduleEntry {
  priority: SchedulePriority;
  startTime: Date;
  id: string;
}

const PRIORITY_RANK: Record<SchedulePriority, number> = { high: 0, normal: 1 };

/**
 * Total order over schedule entries: `high` before `normal`, then the earlier
 * start, then the id.
 *
 * The id is the point of the whole thing. Resolution used to take the first row
 * an unordered `findMany` happened to return, so two screens of the same group
 * resolving an overlap independently could pick different entries — and with
 * them different playback epochs, which is exactly how a group drifts apart.
 * Every comparison here is total, so the result never depends on row order.
 *
 * The rank is mapped explicitly rather than sorted on the column: `'high' <
 * 'normal'` holds lexicographically today by accident, and would quietly invert
 * the moment a third priority is added.
 */
export function compareScheduleEntries(
  a: OrderableScheduleEntry,
  b: OrderableScheduleEntry,
): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;

  const byStart = a.startTime.getTime() - b.startTime.getTime();
  if (byStart !== 0) return byStart;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Entries in resolution order. Returns a new array; the input is untouched. */
export function sortScheduleEntries<T extends OrderableScheduleEntry>(entries: readonly T[]): T[] {
  return [...entries].sort(compareScheduleEntries);
}
