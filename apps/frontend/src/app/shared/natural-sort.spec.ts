import { naturalCompare } from './natural-sort';

describe('naturalCompare', () => {
  it('orders embedded numbers by value', () => {
    expect(['Bild 10', 'Bild 2', 'Bild 1'].sort(naturalCompare)).toEqual([
      'Bild 1',
      'Bild 2',
      'Bild 10',
    ]);
  });

  it('ignores case and accents', () => {
    expect(['beta', 'Alpha', 'Äpfel'].sort(naturalCompare)).toEqual(['Alpha', 'Äpfel', 'beta']);
  });
});
