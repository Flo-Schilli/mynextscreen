import { byNaturalName } from './natural-sort.util';

describe('byNaturalName', () => {
  const sortNames = (names: string[]): string[] =>
    names
      .map((name) => ({ name }))
      .sort(byNaturalName)
      .map((s) => s.name);

  it('orders embedded numbers numerically, not lexically', () => {
    expect(sortNames(['Löwensaal 10', 'Löwensaal 2', 'Löwensaal 9', 'Löwensaal 1'])).toEqual([
      'Löwensaal 1',
      'Löwensaal 2',
      'Löwensaal 9',
      'Löwensaal 10',
    ]);
  });

  it('ignores case and accents when comparing letters', () => {
    expect(sortNames(['bar', 'Äpfel', 'Zelt', 'apfel'])).toEqual(['Äpfel', 'apfel', 'bar', 'Zelt']);
  });
});
