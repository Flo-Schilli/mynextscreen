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
  /** Playlist id per variant index of the rule. */
  playlistIds: string[];
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
 * Creates and updates the hidden playlists that carry a rule's genre variants:
 * one per variant, a copy of the rule's dynamic playlist with its genre filter
 * replaced. A rule without variants, or whose playlist is not dynamic, has
 * none, and every variant it still holds is stale.
 */
export async function syncVariantPlaylists(
  tx: Tx,
  rule: EventScheduleRule,
): Promise<VariantPlaylists> {
  const existing = await tx.select().from(playlists).where(eq(playlists.managedByRuleId, rule.id));
  const [base] =
    rule.genreVariants.length === 0
      ? []
      : await tx.select().from(playlists).where(eq(playlists.id, rule.playlistId));
  if (!base || base.kind !== PlaylistKind.Dynamic || !base.rule) {
    return { playlistIds: [], toResolve: [], stale: existing.map((playlist) => playlist.id) };
  }

  const byKey = new Map(existing.map((playlist) => [playlist.variantKey, playlist]));
  const result: VariantPlaylists = { playlistIds: [], toResolve: [], stale: [] };
  for (const variant of rule.genreVariants) {
    const key = variantKey(variant);
    const wanted = {
      name: variantName(base.name, variant),
      color: base.color,
      rule: variantRule(base.rule, variant),
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
