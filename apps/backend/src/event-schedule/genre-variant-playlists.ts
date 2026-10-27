import { isDeepStrictEqual } from 'node:util';
import { eq, inArray } from 'drizzle-orm';
import type { DrizzleDB } from '../db/drizzle.types';
import { playlists, type EventScheduleRule, type Playlist } from '../db/schema';
import { PlaylistKind } from '../playlist/playlist-kind.enum';
import type { PlaylistRule } from '../playlist/playlist-rule.types';
import type { GenreVariant } from './event-schedule.types';

type Tx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

const MAX_VARIANT_NAME_LENGTH = 120;

/** The variant playlists of a rule, after bringing them in line with it. */
export interface VariantPlaylists {
  /**
   * Playlist id per variant index of the rule; undefined where the group has
   * no playable source, so its events play the rule's playlist.
   */
  playlistIds: (string | undefined)[];
  /** Variants created or changed: they need resolving. */
  toResolve: string[];
  /** Variants the rule no longer has; deleted once no upcoming entry uses them. */
  stale: string[];
}

/** Identifies a variant within its rule independent of the order of its genres. */
export function variantKey(variant: GenreVariant): string {
  return JSON.stringify([...variant.genres].sort());
}

/** The base rule narrowed to the variant's genres; everything else stays as the base has it. */
export function variantRule(base: PlaylistRule, variant: GenreVariant): PlaylistRule {
  return { ...base, genres: { match: 'any', values: [...variant.genres] } };
}

export function variantName(baseName: string, variant: GenreVariant): string {
  return `${baseName} · ${variant.genres.join(', ')}`.slice(0, MAX_VARIANT_NAME_LENGTH);
}

/**
 * Brings a rule's genre groups in line with their playlists.
 *
 * Each group plays its own playlist when it has one, otherwise the rule's:
 * - a **static** source is played as it is, so the group points straight at it;
 * - a **dynamic** source is narrowed to the group's genres through a hidden
 *   copy — one per group, keyed by its genres, so a group that switches source
 *   updates its copy instead of leaving a new one behind.
 *
 * A group whose source is missing (or dynamic without a rule) gets no playlist
 * and its events play the rule's playlist. Hidden copies no group needs any
 * more are stale.
 */
export async function syncVariantPlaylists(
  tx: Tx,
  rule: EventScheduleRule,
): Promise<VariantPlaylists> {
  const existing = await tx.select().from(playlists).where(eq(playlists.managedByRuleId, rule.id));
  const sourceIds = [
    ...new Set(rule.genreVariants.map((variant) => variant.playlistId ?? rule.playlistId)),
  ];
  const sources =
    sourceIds.length === 0
      ? []
      : await tx.select().from(playlists).where(inArray(playlists.id, sourceIds));
  const sourceById = new Map(sources.map((playlist) => [playlist.id, playlist]));

  const byKey = new Map(existing.map((playlist) => [playlist.variantKey, playlist]));
  const result: VariantPlaylists = { playlistIds: [], toResolve: [], stale: [] };
  for (const variant of rule.genreVariants) {
    const source = sourceById.get(variant.playlistId ?? rule.playlistId);
    if (source && source.kind !== PlaylistKind.Dynamic) {
      // Played as it is: nothing to copy, and any old copy of this group is stale.
      result.playlistIds.push(source.id);
      continue;
    }
    if (!source?.rule) {
      // Falls back to the rule's playlist in the reconcile.
      result.playlistIds.push(undefined);
      continue;
    }

    const key = variantKey(variant);
    const wanted = {
      name: variantName(source.name, variant),
      color: source.color,
      rule: variantRule(source.rule, variant),
    };
    const current = byKey.get(key);
    byKey.delete(key);
    if (!current) {
      const [created] = await tx
        .insert(playlists)
        .values({
          ...wanted,
          organisationId: rule.organisationId,
          kind: PlaylistKind.Dynamic,
          managedByRuleId: rule.id,
          variantKey: key,
        })
        .returning({ id: playlists.id });
      result.playlistIds.push(created.id);
      result.toResolve.push(created.id);
      continue;
    }
    result.playlistIds.push(current.id);
    if (!isUnchanged(current, wanted)) {
      await tx.update(playlists).set(wanted).where(eq(playlists.id, current.id));
      result.toResolve.push(current.id);
    }
  }
  result.stale = [...byKey.values()].map((playlist) => playlist.id);
  return result;
}

/** Deletes variants the rule gave up; entries that already ended go with them. */
export async function deleteVariantPlaylists(tx: Tx, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await tx.delete(playlists).where(inArray(playlists.id, [...ids]));
}

function isUnchanged(
  current: Playlist,
  wanted: { name: string; color: string; rule: PlaylistRule },
): boolean {
  return (
    current.name === wanted.name &&
    current.color === wanted.color &&
    // Key order differs once Postgres stored the rule as jsonb.
    isDeepStrictEqual(current.rule, wanted.rule)
  );
}
