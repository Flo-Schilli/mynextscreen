import { canonicalVenue, rawVenuesFor, sameVenueAliases, toVenueAliasMap } from './venue-aliases';

describe('venue aliases', () => {
  const aliases = toVenueAliasMap([
    { raw: 'Der Hirsch', canonical: 'Hirsch' },
    { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
    { raw: 'KIA Metropol Arena', canonical: 'Kia Metropol Arena' },
  ]);

  it('maps an aliased name and keeps every other one', () => {
    expect(canonicalVenue(aliases, 'Der Hirsch')).toBe('Hirsch');
    expect(canonicalVenue(aliases, 'Hirsch')).toBe('Hirsch');
    expect(canonicalVenue(aliases, 'Löwensaal')).toBe('Löwensaal');
    expect(canonicalVenue(toVenueAliasMap(null), 'Der Hirsch')).toBe('Der Hirsch');
  });

  it('widens canonical filter values to the raw names behind them', () => {
    expect(rawVenuesFor(aliases, ['Hirsch', 'Löwensaal']).sort()).toEqual(
      ['Der Hirsch', 'Hirsch', 'Löwensaal'].sort(),
    );
    // An aliased raw name is not a filter value of its own.
    expect(rawVenuesFor(aliases, ['Der Hirsch'])).toEqual([]);
    expect(rawVenuesFor(aliases, [])).toEqual([]);
  });

  it('compares alias lists regardless of order', () => {
    const a = [
      { raw: 'Der Hirsch', canonical: 'Hirsch' },
      { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
    ];
    expect(sameVenueAliases(a, [...a].reverse())).toBe(true);
    expect(sameVenueAliases(a, [a[0]])).toBe(false);
    expect(sameVenueAliases(a, [a[0], { raw: 'Z-Bau Galerie', canonical: 'Galerie' }])).toBe(false);
  });
});
