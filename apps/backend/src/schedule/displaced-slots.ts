import { and, eq, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  eventScheduleRules,
  playlists,
  scheduleEntries,
  screenGroups,
  screens,
} from '../db/schema';

/**
 * A slot an event schedule rule would fill but leaves to another entry that
 * holds it. Nothing plays it; it exists so the calendar can show that the rule
 * stepped aside, and for whom.
 */
export interface DisplacedSlot {
  ruleId: string;
  ruleName: string;
  sourceId: string;
  colour: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  screenId: string | null;
  groupId: string | null;
  /** Name of the screen or group. */
  targetName: string | null;
  /** The playlist the rule would play; for a genre group, the playlist it narrows. */
  playlistName: string | null;
  /** The genre group the event matched, if it did. */
  genres: string[] | null;
  blockingEntry: { id: string; name: string | null; playlistName: string | null };
}

/**
 * The organisation's displaced slots that have not ended, read from the
 * conflicts each enabled rule recorded on its last reconcile. Conflicts stored
 * before slots carried their times, and those whose blocking entry is gone
 * since, are left out.
 */
export async function findDisplacedSlots(
  db: DrizzleDB,
  organisationId: string,
  now: Date,
): Promise<DisplacedSlot[]> {
  const rules = await db
    .select()
    .from(eventScheduleRules)
    .where(
      and(
        eq(eventScheduleRules.organisationId, organisationId),
        eq(eventScheduleRules.enabled, true),
      ),
    );
  const pending = rules.flatMap((rule) =>
    (rule.lastReconcileSummary?.conflicts ?? []).flatMap((conflict) => {
      const { startTime, endTime, playlistId } = conflict;
      if (!startTime || !endTime || !playlistId || new Date(endTime) <= now) return [];
      return [{ rule, conflict, startTime, endTime, playlistId }];
    }),
  );
  if (pending.length === 0) return [];

  const blockers = await db.query.scheduleEntries.findMany({
    where: and(
      eq(scheduleEntries.organisationId, organisationId),
      inArray(scheduleEntries.id, [...new Set(pending.map((p) => p.conflict.blockingEntryId))]),
    ),
    with: { playlist: true },
  });
  const blockerById = new Map(blockers.map((entry) => [entry.id, entry]));
  const playlistIds = new Set(pending.flatMap((p) => [p.playlistId, p.rule.playlistId]));
  const playlistRows = await db
    .select()
    .from(playlists)
    .where(inArray(playlists.id, [...playlistIds]));
  const playlistById = new Map(playlistRows.map((playlist) => [playlist.id, playlist]));
  const targetNames = await loadTargetNames(db, organisationId);

  return pending.flatMap(({ rule, conflict, startTime, endTime, playlistId }) => {
    const blocker = blockerById.get(conflict.blockingEntryId);
    if (!blocker) return [];
    const played = playlistById.get(playlistId);
    const isVariant = played?.managedByRuleId === rule.id;
    return [
      {
        ruleId: rule.id,
        ruleName: rule.name,
        sourceId: rule.sourceId,
        colour: rule.colour,
        eventTitle: conflict.eventTitle,
        startTime,
        endTime,
        screenId: conflict.screenId,
        groupId: conflict.groupId,
        targetName: targetNames.get(conflict.screenId ?? conflict.groupId ?? '') ?? null,
        playlistName: playlistById.get(rule.playlistId)?.name ?? played?.name ?? null,
        genres: isVariant && played?.rule ? [...played.rule.genres.values] : null,
        blockingEntry: {
          id: blocker.id,
          name: blocker.name,
          playlistName: blocker.playlist?.name ?? null,
        },
      },
    ];
  });
}

async function loadTargetNames(
  db: DrizzleDB,
  organisationId: string,
): Promise<Map<string, string>> {
  const [screenRows, groupRows] = await Promise.all([
    db
      .select({ id: screens.id, name: screens.name })
      .from(screens)
      .where(eq(screens.organisationId, organisationId)),
    db
      .select({ id: screenGroups.id, name: screenGroups.name })
      .from(screenGroups)
      .where(eq(screenGroups.organisationId, organisationId)),
  ]);
  return new Map([...screenRows, ...groupRows].map((row) => [row.id, row.name]));
}
