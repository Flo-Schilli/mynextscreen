import {
  addAlias,
  aliasErrors,
  aliasRows,
  aliasRowsValid,
  aliasesFromRows,
  canonicalRuleVenues,
  canonicalSuggestions,
  removeAlias,
  sameAliases,
  setCanonical,
} from './venue-alias-state';

const VENUES = [
  { name: 'Hirsch', canonical: 'Hirsch', events: 85 },
  { name: 'Der Hirsch', canonical: 'Hirsch', events: 4 },
  { name: 'Z-Bau', canonical: 'Z-Bau', events: 4 },
];

describe('venue alias state', () => {
  it('lists every raw venue plus stored aliases no event uses, sorted', () => {
    const rows = aliasRows(VENUES, [
      { raw: 'Der Hirsch', canonical: 'Hirsch' },
      { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
    ]);

    expect(rows).toEqual([
      { raw: 'Der Hirsch', canonical: 'Hirsch', events: 4 },
      { raw: 'Hirsch', canonical: '', events: 85 },
      { raw: 'Z-Bau', canonical: '', events: 4 },
      { raw: 'Z-Bau Galerie', canonical: 'Z-Bau', events: null },
    ]);
  });

  it('turns rows into aliases, skipping empty and self mappings and trimming', () => {
    let rows = aliasRows(VENUES, []);
    rows = setCanonical(rows, 'Der Hirsch', ' Hirsch ');
    rows = setCanonical(rows, 'Z-Bau', 'Z-Bau');

    expect(aliasesFromRows(rows)).toEqual([{ raw: 'Der Hirsch', canonical: 'Hirsch' }]);
  });

  it('adds an alias for an unlisted name and updates a listed one', () => {
    let rows = aliasRows(VENUES, []);
    rows = addAlias(rows, ' KIA Metropol Arena ', 'Kia Metropol Arena');
    rows = addAlias(rows, 'Der Hirsch', 'Hirsch');
    rows = addAlias(rows, '  ', 'ignored');

    expect(aliasesFromRows(rows)).toEqual([
      { raw: 'Der Hirsch', canonical: 'Hirsch' },
      { raw: 'KIA Metropol Arena', canonical: 'Kia Metropol Arena' },
    ]);
    expect(rows).toHaveLength(4);
  });

  it('removes an alias and drops a row no event uses', () => {
    const rows = aliasRows(VENUES, [
      { raw: 'Der Hirsch', canonical: 'Hirsch' },
      { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
    ]);

    const cleared = removeAlias(removeAlias(rows, 'Der Hirsch'), 'Z-Bau Galerie');

    expect(cleared.map((row) => [row.raw, row.canonical])).toEqual([
      ['Der Hirsch', ''],
      ['Hirsch', ''],
      ['Z-Bau', ''],
    ]);
  });

  it('flags chains, since aliases have one level', () => {
    let rows = aliasRows(VENUES, []);
    rows = setCanonical(rows, 'Der Hirsch', 'Hirsch');
    rows = setCanonical(rows, 'Hirsch', 'Hirsch Nürnberg');

    expect(aliasErrors(rows)).toEqual(new Map([['Der Hirsch', 'chain']]));
    expect(aliasRowsValid(rows)).toBe(false);
    expect(aliasRowsValid(setCanonical(rows, 'Hirsch', ''))).toBe(true);
  });

  it('flags a canonical name that is too long', () => {
    const rows = setCanonical(aliasRows(VENUES, []), 'Der Hirsch', 'x'.repeat(201));

    expect(aliasErrors(rows).get('Der Hirsch')).toBe('tooLong');
  });

  it('suggests unaliased raw names and canonical names in use', () => {
    const rows = aliasRows(VENUES, [
      { raw: 'Der Hirsch', canonical: 'Hirsch' },
      { raw: 'Z-Bau Galerie', canonical: 'Z-Bau Nürnberg' },
    ]);

    expect(canonicalSuggestions(rows)).toEqual(['Hirsch', 'Z-Bau', 'Z-Bau Nürnberg']);
  });

  it('compares alias lists regardless of order', () => {
    const a = [
      { raw: 'Der Hirsch', canonical: 'Hirsch' },
      { raw: 'Z-Bau Galerie', canonical: 'Z-Bau' },
    ];

    expect(sameAliases(a, [...a].reverse())).toBe(true);
    expect(sameAliases(a, a.slice(1))).toBe(false);
  });

  it('reads rule venues through the aliases of the rule sources, once each', () => {
    const sources = [
      { id: 's1', venueAliases: [{ raw: 'Der Hirsch', canonical: 'Hirsch' }] },
      { id: 's2', venueAliases: [] },
    ];

    expect(canonicalRuleVenues(['Hirsch', 'Der Hirsch', 'Z-Bau'], ['s1'], sources)).toEqual([
      'Hirsch',
      'Z-Bau',
    ]);
    // A source without the alias keeps the spelling.
    expect(canonicalRuleVenues(['Der Hirsch'], ['s1', 's2'], sources)).toEqual([
      'Hirsch',
      'Der Hirsch',
    ]);
    expect(canonicalRuleVenues(['Der Hirsch'], [], sources)).toEqual(['Der Hirsch']);
  });
});
