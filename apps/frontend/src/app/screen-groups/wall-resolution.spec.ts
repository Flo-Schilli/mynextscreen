import { ScreenGroup, ScreenGroupScreen } from './screen-group.model';
import { wallResolution } from './wall-resolution';

function makeScreen(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 'screen-1',
    name: 'Screen',
    location: '',
    resolution: '1920x1080',
    isOnline: true,
    groupId: 'group-1',
    gridRow: 1,
    gridColumn: 1,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'group-1',
    organisationId: 'org-1',
    name: 'Bar Wall',
    mode: 'split',
    gridColumns: 2,
    gridRows: 1,
    color: '#fff',
    icon: 'Grid',
    screens: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('wallResolution', () => {
  it('adds the columns up across a row', () => {
    const group = makeGroup({
      screens: [makeScreen({ id: 'a', gridColumn: 1 }), makeScreen({ id: 'b', gridColumn: 2 })],
    });

    expect(wallResolution(group)).toBe('3840 × 1080');
  });

  it('adds the rows up down a column', () => {
    const group = makeGroup({
      gridColumns: 1,
      gridRows: 3,
      screens: [
        makeScreen({ id: 'a', gridRow: 1, resolution: '1080x1920' }),
        makeScreen({ id: 'b', gridRow: 2, resolution: '1080x1920' }),
        makeScreen({ id: 'c', gridRow: 3, resolution: '1080x1920' }),
      ],
    });

    expect(wallResolution(group)).toBe('1080 × 5760');
  });

  it('counts an unassigned cell as the largest screen in the group', () => {
    // Half-built walls are the normal state while one is being set up; the
    // figure should say what it will be, not what the assigned half measures.
    const group = makeGroup({
      gridColumns: 2,
      gridRows: 2,
      screens: [makeScreen({ id: 'a', gridRow: 1, gridColumn: 1 })],
    });

    expect(wallResolution(group)).toBe('3840 × 2160');
  });

  it('takes the widest screen in a column and the tallest in a row', () => {
    const group = makeGroup({
      gridColumns: 2,
      gridRows: 1,
      screens: [
        makeScreen({ id: 'a', gridColumn: 1, resolution: '1920x1080' }),
        makeScreen({ id: 'b', gridColumn: 2, resolution: '3840x2160' }),
      ],
    });

    expect(wallResolution(group)).toBe('5760 × 2160');
  });

  it('reports a mirror group at the resolution its screens share', () => {
    const group = makeGroup({
      mode: 'mirror',
      gridColumns: null,
      gridRows: null,
      screens: [makeScreen({ id: 'a' }), makeScreen({ id: 'b' })],
    });

    expect(wallResolution(group)).toBe('1920 × 1080');
  });

  it('says nothing for a mirror group whose screens disagree', () => {
    // There is no single figure: each screen gets the picture at its own size.
    const group = makeGroup({
      mode: 'mirror',
      gridColumns: null,
      gridRows: null,
      screens: [makeScreen({ id: 'a' }), makeScreen({ id: 'b', resolution: '3840x2160' })],
    });

    expect(wallResolution(group)).toBeNull();
  });

  it('says nothing for an empty group', () => {
    expect(wallResolution(makeGroup())).toBeNull();
  });

  it('ignores a resolution it cannot read rather than guessing', () => {
    const group = makeGroup({
      screens: [
        makeScreen({ id: 'a', gridColumn: 1, resolution: 'Full HD' }),
        makeScreen({ id: 'b', gridColumn: 2 }),
      ],
    });

    expect(wallResolution(group)).toBe('3840 × 1080');
  });

  it('accepts the × that screens are sometimes paired with', () => {
    const group = makeGroup({
      gridColumns: 1,
      screens: [makeScreen({ id: 'a', resolution: '1920 × 1080' })],
    });

    expect(wallResolution(group)).toBe('1920 × 1080');
  });
});
