import { ScheduleEntry, entryTitle } from './schedule.model';

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
    playlist: { id: 'p1', name: 'Morning Loop' },
    ...overrides,
  };
}

describe('entryTitle', () => {
  it('shows the event of a generated entry without the rule prefix', () => {
    const entry = makeEntry({
      name: 'Abendkasse: ITCHY',
      managedByRule: { id: 'r1', name: 'Abendkasse', sourceId: 'src1' },
    });
    expect(entryTitle(entry)).toBe('ITCHY');
  });

  it("keeps a manual entry's own name", () => {
    expect(entryTitle(makeEntry({ name: 'Abendkasse: Pressekonferenz' }))).toBe(
      'Abendkasse: Pressekonferenz',
    );
  });

  it('falls back to the playlist when the entry has no name', () => {
    expect(entryTitle(makeEntry({ name: '  ' }))).toBe('Morning Loop');
  });

  it('names the narrowed playlist for a genre group entry without a name', () => {
    const entry = makeEntry({
      playlist: { id: 'v1', name: 'Demnächst · Rock' },
      genreGroup: { genres: ['Rock'], basePlaylistName: 'Demnächst' },
    });
    expect(entryTitle(entry)).toBe('Demnächst');
  });
});
