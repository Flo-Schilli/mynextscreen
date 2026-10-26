import { SchedulePriority, ScheduleEntry } from './schedule.model';

/** One concrete run of an entry, as the list view shows it. */
export interface ScheduleOccurrence {
  /** Unique per entry and start: `<entryId>@<epoch ms>`. */
  key: string;
  entry: ScheduleEntry;
  start: Date;
  end: Date;
}

/** The screens a conflict check needs to know: who belongs to which group. */
export interface ConflictScreen {
  id: string;
  name: string;
  groupId: string | null;
}

/** Another entry that overlaps an occurrence on at least one screen. */
export interface ScheduleConflict {
  other: ScheduleEntry;
  /** Screens on which the two overlap. */
  screenNames: string[];
  /** True when this occurrence is the one the screens actually play. */
  wins: boolean;
}

const PRIORITY_RANK: Record<SchedulePriority, number> = { high: 0, normal: 1 };

/**
 * Which of two simultaneously active entries a screen plays, mirroring the
 * server: an entry on the screen itself beats one on its group
 * (`ScheduleService.getCurrentPlaylist`); between entries of the same kind the
 * order of `apps/backend/src/schedule/schedule-entry-order.util.ts` decides —
 * `high` before `normal`, then the earlier start, then the id. Keep the two in
 * step.
 */
function playsBefore(a: ScheduleEntry, b: ScheduleEntry): boolean {
  const byLevel = Number(!a.screenId) - Number(!b.screenId);
  if (byLevel !== 0) return byLevel < 0;
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority < 0;
  const byStart = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  if (byStart !== 0) return byStart < 0;
  return a.id < b.id;
}

/**
 * Overlaps between occurrences that land on the same screen, directly or
 * through the screen's group, keyed by occurrence. Only one of two overlapping
 * occurrences plays; `wins` says which.
 */
export function findConflicts(
  occurrences: readonly ScheduleOccurrence[],
  screens: readonly ConflictScreen[],
): Map<string, ScheduleConflict[]> {
  const byScreen = new Map<string, ScheduleOccurrence[]>();
  for (const occurrence of occurrences) {
    for (const screen of screensOf(occurrence.entry, screens)) {
      byScreen.set(screen.id, [...(byScreen.get(screen.id) ?? []), occurrence]);
    }
  }

  const found = new Map<string, Map<string, ScheduleConflict>>();
  const record = (occurrence: ScheduleOccurrence, other: ScheduleOccurrence, screen: string) => {
    const conflicts = found.get(occurrence.key) ?? new Map<string, ScheduleConflict>();
    const existing = conflicts.get(other.entry.id);
    conflicts.set(other.entry.id, {
      other: other.entry,
      screenNames: [...(existing?.screenNames ?? []), screen],
      wins: playsBefore(occurrence.entry, other.entry),
    });
    found.set(occurrence.key, conflicts);
  };

  for (const [screenId, onScreen] of byScreen) {
    const name = screens.find((screen) => screen.id === screenId)?.name ?? '';
    for (let i = 0; i < onScreen.length; i++) {
      for (let j = i + 1; j < onScreen.length; j++) {
        const a = onScreen[i];
        const b = onScreen[j];
        if (a.entry.id === b.entry.id || a.start >= b.end || b.start >= a.end) continue;
        record(a, b, name);
        record(b, a, name);
      }
    }
  }

  return new Map([...found].map(([key, conflicts]) => [key, [...conflicts.values()]]));
}

function screensOf(entry: ScheduleEntry, screens: readonly ConflictScreen[]): ConflictScreen[] {
  if (entry.screenId) return screens.filter((screen) => screen.id === entry.screenId);
  return screens.filter((screen) => screen.groupId !== null && screen.groupId === entry.groupId);
}

/**
 * The entries that play on a target: for a screen its own and its group's,
 * for a group its own and those of its member screens — the ones that can
 * collide with each other. `null` keeps every entry.
 */
export function entriesOnTarget(
  entries: readonly ScheduleEntry[],
  target: { type: 'screen' | 'group'; id: string } | null,
  screens: readonly ConflictScreen[],
): ScheduleEntry[] {
  if (!target) return [...entries];
  if (target.type === 'screen') {
    const groupId = screens.find((screen) => screen.id === target.id)?.groupId ?? null;
    return entries.filter(
      (entry) => entry.screenId === target.id || (groupId !== null && entry.groupId === groupId),
    );
  }
  const members = new Set(
    screens.filter((screen) => screen.groupId === target.id).map((screen) => screen.id),
  );
  return entries.filter(
    (entry) =>
      entry.groupId === target.id || (entry.screenId !== null && members.has(entry.screenId)),
  );
}
