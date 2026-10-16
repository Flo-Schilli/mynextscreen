import type { VenueAlias } from './content-source.types';

/** Raw venue name → canonical name, for one source. */
export type VenueAliasMap = ReadonlyMap<string, string>;

/** Alias maps keyed by source id. */
export type VenueAliasesBySource = ReadonlyMap<string, VenueAliasMap>;

export const EMPTY_ALIAS_MAP: VenueAliasMap = new Map();

export function toVenueAliasMap(aliases: readonly VenueAlias[] | null | undefined): VenueAliasMap {
  return new Map((aliases ?? []).map((alias) => [alias.raw, alias.canonical]));
}

/** The name a venue is shown and filtered by; unaliased names stay as they are. */
export function canonicalVenue(aliases: VenueAliasMap, venue: string): string {
  return aliases.get(venue) ?? venue;
}

/**
 * Raw venue names whose canonical name is one of `canonicals`: the aliased
 * names that map onto them plus each canonical itself, unless it is aliased
 * away. Lets a database filter on the stored raw column.
 */
export function rawVenuesFor(aliases: VenueAliasMap, canonicals: readonly string[]): string[] {
  const wanted = new Set(canonicals);
  const raw = new Set<string>();
  for (const [name, canonical] of aliases) {
    if (wanted.has(canonical)) raw.add(name);
  }
  for (const name of wanted) {
    if (!aliases.has(name)) raw.add(name);
  }
  return [...raw];
}

/** Two alias lists hold the same mapping, regardless of order. */
export function sameVenueAliases(a: readonly VenueAlias[], b: readonly VenueAlias[]): boolean {
  if (a.length !== b.length) return false;
  const map = toVenueAliasMap(a);
  return b.every((alias) => map.get(alias.raw) === alias.canonical);
}
