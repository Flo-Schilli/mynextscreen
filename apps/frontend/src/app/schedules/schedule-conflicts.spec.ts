import { ScheduleEntry } from './schedule.model';
import {
  ConflictScreen,
  ScheduleOccurrence,
  entriesOnTarget,
  findConflicts,
} from './schedule-conflicts';

function makeEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: 'e1',
    organisationId: 'org1',
    screenId: 's1',
    groupId: null,
    playlistId: 'p1',
    name: null,
    priority: 'normal',
    startTime: '2026-06-10T09:00:00Z',
    endTime: '2026-06-10T10:00:00Z',
    rrule: null,
    colour: '#3b82f6',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function occurrence(entry: ScheduleEntry): ScheduleOccurrence {
  const start = new Date(entry.startTime);
  return { key: `${entry.id}@${start.getTime()}`, entry, start, end: new Date(entry.endTime) };
}

const SCREENS: ConflictScreen[] = [
  { id: 's1', name: 'Lobby', groupId: 'g1' },
  { id: 's2', name: 'Bar', groupId: 'g1' },
  { id: 's3', name: 'Foyer', groupId: null },
];

describe('findConflicts', () => {
  it('lets an entry on the screen win over one on its group', () => {
    // Arrange
    const direct = occurrence(makeEntry({ id: 'direct', startTime: '2026-06-10T09:30:00Z' }));
    const group = occurrence(makeEntry({ id: 'group', screenId: null, groupId: 'g1' }));

    // Act
    const conflicts = findConflicts([direct, group], SCREENS);

    // Assert
    expect(conflicts.get(direct.key)).toEqual([
      { other: group.entry, screenNames: ['Lobby'], wins: true },
    ]);
    expect(conflicts.get(group.key)).toEqual([
      { other: direct.entry, screenNames: ['Lobby'], wins: false },
    ]);
  });

  it('lets a high priority entry win over a normal one on the same screen', () => {
    // Arrange
    const normal = occurrence(makeEntry({ id: 'a' }));
    const high = occurrence(
      makeEntry({ id: 'b', priority: 'high', startTime: '2026-06-10T09:30:00Z' }),
    );

    // Act
    const conflicts = findConflicts([normal, high], SCREENS);

    // Assert
    expect(conflicts.get(high.key)?.[0].wins).toBe(true);
    expect(conflicts.get(normal.key)?.[0].wins).toBe(false);
  });

  it('prefers the earlier start, then the lower id, between equal entries', () => {
    // Arrange
    const earlier = occurrence(makeEntry({ id: 'z' }));
    const later = occurrence(makeEntry({ id: 'a', startTime: '2026-06-10T09:15:00Z' }));
    const sameStart = occurrence(makeEntry({ id: 'y' }));

    // Act
    const conflicts = findConflicts([earlier, later, sameStart], SCREENS);

    // Assert
    const winsAgainst = (key: string, otherId: string) =>
      conflicts.get(key)?.find((c) => c.other.id === otherId)?.wins;
    expect(winsAgainst(earlier.key, 'a')).toBe(true);
    expect(winsAgainst(sameStart.key, 'z')).toBe(true);
  });

  it('names every screen of a group on which the overlap happens', () => {
    // Arrange
    const groupA = occurrence(makeEntry({ id: 'a', screenId: null, groupId: 'g1' }));
    const groupB = occurrence(
      makeEntry({ id: 'b', screenId: null, groupId: 'g1', startTime: '2026-06-10T09:45:00Z' }),
    );

    // Act
    const conflicts = findConflicts([groupA, groupB], SCREENS);

    // Assert
    expect(conflicts.get(groupA.key)?.[0].screenNames).toEqual(['Lobby', 'Bar']);
  });

  it('finds nothing for back-to-back entries or different screens', () => {
    // Arrange
    const first = occurrence(makeEntry({ id: 'a' }));
    const next = occurrence(
      makeEntry({ id: 'b', startTime: '2026-06-10T10:00:00Z', endTime: '2026-06-10T11:00:00Z' }),
    );
    const elsewhere = occurrence(makeEntry({ id: 'c', screenId: 's3' }));

    // Act
    const conflicts = findConflicts([first, next, elsewhere], SCREENS);

    // Assert
    expect(conflicts.size).toBe(0);
  });
});

describe('entriesOnTarget', () => {
  const onLobby = makeEntry({ id: 'lobby' });
  const onGroup = makeEntry({ id: 'group', screenId: null, groupId: 'g1' });
  const onBar = makeEntry({ id: 'bar', screenId: 's2' });
  const onFoyer = makeEntry({ id: 'foyer', screenId: 's3' });
  const all = [onLobby, onGroup, onBar, onFoyer];

  it('keeps everything without a target', () => {
    expect(entriesOnTarget(all, null, SCREENS)).toEqual(all);
  });

  it("adds the screen's group entries to a screen", () => {
    expect(entriesOnTarget(all, { type: 'screen', id: 's1' }, SCREENS)).toEqual([onLobby, onGroup]);
  });

  it("adds its members' own entries to a group", () => {
    expect(entriesOnTarget(all, { type: 'group', id: 'g1' }, SCREENS)).toEqual([
      onLobby,
      onGroup,
      onBar,
    ]);
  });
});
