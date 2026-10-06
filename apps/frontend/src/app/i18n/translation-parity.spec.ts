import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';

interface Json {
  [key: string]: string | Json;
}

/** Flattens a nested translation object into dot-notation key paths. */
function flattenKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flattenKeys(value as Json, path) : [path];
  });
}

/** Collects key paths whose value is an empty string (untranslated stubs). */
function emptyValueKeys(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return emptyValueKeys(value as Json, path);
    }
    return value === '' ? [path] : [];
  });
}

describe('translation parity (de/en)', () => {
  const deKeys = flattenKeys(de as Json).sort();
  const enKeys = flattenKeys(en as Json).sort();

  it('has the exact same key set in de and en (no drift)', () => {
    const onlyInDe = deKeys.filter((k) => !enKeys.includes(k));
    const onlyInEn = enKeys.filter((k) => !deKeys.includes(k));
    expect(onlyInDe, `keys only in de.json: ${onlyInDe.join(', ')}`).toEqual([]);
    expect(onlyInEn, `keys only in en.json: ${onlyInEn.join(', ')}`).toEqual([]);
  });

  it('has no empty (placeholder) values in de.json', () => {
    expect(emptyValueKeys(de as Json)).toEqual([]);
  });

  it('has no empty (placeholder) values in en.json', () => {
    expect(emptyValueKeys(en as Json)).toEqual([]);
  });
});
