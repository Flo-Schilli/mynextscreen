const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });

/**
 * Comparator for `Array.prototype.sort` that orders by `name` the way a person
 * reads it: "Screen 2" before "Screen 10", case- and accent-insensitive.
 * A plain `ORDER BY name` in Postgres sorts "Screen 10" before "Screen 2".
 */
export function byNaturalName(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}
