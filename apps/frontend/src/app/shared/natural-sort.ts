/**
 * Natural, case-insensitive ordering ("Bild 2" before "Bild 10"). Same
 * collator as the backend's `byNaturalName`, so lists sort alike everywhere.
 */
const collator = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });

export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}
