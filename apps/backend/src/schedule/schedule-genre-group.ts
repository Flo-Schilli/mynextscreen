import { eq, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../db/drizzle.types';
import { eventScheduleRules, playlists, type Playlist } from '../db/schema';

/**
 * The genre group a rule's entry plays because its event matched it, with the
 * name of the playlist the group narrows. The calendar shows the group next to
 * that name instead of the variant playlist's own, longer one.
 */
export interface ScheduleGenreGroup {
  genres: string[];
  basePlaylistName: string;
}

/** Adds `genreGroup` to each entry: set when it plays a rule's genre variant, else null. */
export async function attachGenreGroups<T extends { playlist: Playlist | null }>(
  db: DrizzleDB,
  entries: T[],
): Promise<(T & { genreGroup: ScheduleGenreGroup | null })[]> {
  const ruleIds = [...new Set(entries.flatMap((entry) => entry.playlist?.managedByRuleId ?? []))];
  const bases =
    ruleIds.length === 0
      ? []
      : await db
          .select({ ruleId: eventScheduleRules.id, name: playlists.name })
          .from(eventScheduleRules)
          .innerJoin(playlists, eq(playlists.id, eventScheduleRules.playlistId))
          .where(inArray(eventScheduleRules.id, ruleIds));
  const baseNames = new Map(bases.map((base) => [base.ruleId, base.name]));

  return entries.map((entry) => ({
    ...entry,
    genreGroup: genreGroupOf(entry.playlist, baseNames),
  }));
}

function genreGroupOf(
  playlist: Playlist | null,
  baseNames: ReadonlyMap<string, string>,
): ScheduleGenreGroup | null {
  const baseName = playlist?.managedByRuleId ? baseNames.get(playlist.managedByRuleId) : undefined;
  if (!playlist?.rule || baseName === undefined) return null;
  return { genres: [...playlist.rule.genres.values], basePlaylistName: baseName };
}
