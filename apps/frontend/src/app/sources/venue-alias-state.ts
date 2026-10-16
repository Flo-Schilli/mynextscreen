import {
  ContentSource,
  MAX_VENUE_ALIASES,
  MAX_VENUE_NAME_LENGTH,
  SourceVenue,
  VenueAlias,
} from './content-source.model';

/**
 * One raw venue name in the alias editor. `canonical` is what the user typed;
 * empty (or the raw name itself) means "no alias". `events` is null for an
 * alias whose raw name no current event uses.
 */
export interface VenueAliasRow {
  raw: string;
  canonical: string;
  events: number | null;
}

export type VenueAliasError = 'chain' | 'tooLong';

const byName = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** Every raw venue of the current events plus every stored alias, sorted by raw name. */
export function aliasRows(
  venues: readonly SourceVenue[],
  aliases: readonly VenueAlias[],
): VenueAliasRow[] {
  const canonicalOf = new Map(aliases.map((alias) => [alias.raw, alias.canonical]));
  const rows: VenueAliasRow[] = venues.map((venue) => ({
    raw: venue.name,
    canonical: canonicalOf.get(venue.name) ?? '',
    events: venue.events,
  }));
  const listed = new Set(rows.map((row) => row.raw));
  for (const alias of aliases) {
    if (!listed.has(alias.raw)) {
      rows.push({ raw: alias.raw, canonical: alias.canonical, events: null });
    }
  }
  return rows.sort((a, b) => byName(a.raw, b.raw));
}

function effectiveCanonical(row: VenueAliasRow): string | null {
  const canonical = row.canonical.trim();
  return canonical === '' || canonical === row.raw ? null : canonical;
}

/** Sets the canonical name of one raw venue; returns a new list. */
export function setCanonical(
  rows: readonly VenueAliasRow[],
  raw: string,
  canonical: string,
): VenueAliasRow[] {
  return rows.map((row) => (row.raw === raw ? { ...row, canonical } : row));
}

/**
 * Adds an alias for a raw name the current events may not use (e.g. a
 * spelling the site used before). An existing row just gets the new canonical.
 */
export function addAlias(
  rows: readonly VenueAliasRow[],
  raw: string,
  canonical: string,
): VenueAliasRow[] {
  const name = raw.trim();
  if (name === '') return [...rows];
  if (rows.some((row) => row.raw === name)) return setCanonical(rows, name, canonical.trim());
  return [...rows, { raw: name, canonical: canonical.trim(), events: null }].sort((a, b) =>
    byName(a.raw, b.raw),
  );
}

/** Clears an alias; a row no current event uses disappears with it. */
export function removeAlias(rows: readonly VenueAliasRow[], raw: string): VenueAliasRow[] {
  return rows
    .filter((row) => row.raw !== raw || row.events !== null)
    .map((row) => (row.raw === raw ? { ...row, canonical: '' } : row));
}

/** The aliases the rows describe, ready for the API. */
export function aliasesFromRows(rows: readonly VenueAliasRow[]): VenueAlias[] {
  return rows.flatMap((row) => {
    const canonical = effectiveCanonical(row);
    return canonical === null ? [] : [{ raw: row.raw, canonical }];
  });
}

/**
 * Problems per raw name. Aliases have one level: a canonical name must not be
 * a raw name that is itself aliased (`A → B` with `B → C`).
 */
export function aliasErrors(rows: readonly VenueAliasRow[]): Map<string, VenueAliasError> {
  const aliased = new Set(rows.filter((row) => effectiveCanonical(row) !== null).map((r) => r.raw));
  const errors = new Map<string, VenueAliasError>();
  for (const row of rows) {
    const canonical = effectiveCanonical(row);
    if (canonical === null) continue;
    if (canonical.length > MAX_VENUE_NAME_LENGTH) errors.set(row.raw, 'tooLong');
    else if (aliased.has(canonical)) errors.set(row.raw, 'chain');
  }
  return errors;
}

/** True when the rows can be saved as they are. */
export function aliasRowsValid(rows: readonly VenueAliasRow[]): boolean {
  return aliasErrors(rows).size === 0 && aliasesFromRows(rows).length <= MAX_VENUE_ALIASES;
}

/** Names a raw venue can be mapped onto: unaliased raw names and the canonical names in use. */
export function canonicalSuggestions(rows: readonly VenueAliasRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const canonical = effectiveCanonical(row);
    if (canonical === null) names.add(row.raw);
    else names.add(canonical);
  }
  return [...names].sort(byName);
}

/** Two alias lists hold the same mapping, regardless of order. */
export function sameAliases(a: readonly VenueAlias[], b: readonly VenueAlias[]): boolean {
  if (a.length !== b.length) return false;
  const map = new Map(a.map((alias) => [alias.raw, alias.canonical]));
  return b.every((alias) => map.get(alias.raw) === alias.canonical);
}

/**
 * Venue names of a rule as the sources' aliases read them, without
 * duplicates: a rule that still names `Der Hirsch` next to `Hirsch` reads
 * "Hirsch" once. A venue keeps its spelling for a source without that alias.
 */
export function canonicalRuleVenues(
  venues: readonly string[],
  sourceIds: readonly string[],
  sources: readonly Pick<ContentSource, 'id' | 'venueAliases'>[],
): string[] {
  const maps = sources
    .filter((source) => sourceIds.includes(source.id))
    .map((source) => new Map((source.venueAliases ?? []).map((a) => [a.raw, a.canonical])));
  const result: string[] = [];
  for (const venue of venues) {
    const names = maps.length === 0 ? [venue] : maps.map((map) => map.get(venue) ?? venue);
    for (const name of names) {
      if (!result.includes(name)) result.push(name);
    }
  }
  return result;
}
