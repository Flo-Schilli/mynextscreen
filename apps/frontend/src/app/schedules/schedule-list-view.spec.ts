import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleListView } from './schedule-list-view';
import { ListDay } from './schedule-calendar.service';
import { ScheduleConflict, ScheduleOccurrence } from './schedule-conflicts';
import { DisplacedSlot, ScheduleEntry } from './schedule.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

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
    screen: { id: 's1', name: 'Lobby' },
    ...overrides,
  };
}

function occurrence(entry: ScheduleEntry): ScheduleOccurrence {
  const start = new Date(entry.startTime);
  return { key: `${entry.id}@${start.getTime()}`, entry, start, end: new Date(entry.endTime) };
}

describe('ScheduleListView', () => {
  let fixture: ComponentFixture<ScheduleListView>;

  const show = makeEntry({
    id: 'show',
    name: 'Abendkasse: ITCHY',
    managedByRule: { id: 'r1', name: 'Abendkasse', sourceId: 'src1' },
    genreGroup: { genres: ['Rock', 'Metal'], basePlaylistName: 'Demnächst' },
  });
  const press = makeEntry({ id: 'press', name: 'Pressekonferenz' });
  const day: ListDay = {
    date: new Date('2026-06-10T00:00:00Z'),
    occurrences: [occurrence(show), occurrence(press)],
    displaced: [],
  };
  const displaced: DisplacedSlot = {
    ruleId: 'r2',
    ruleName: 'Abendkasse',
    sourceId: 'src1',
    colour: '#6d6cf6',
    eventTitle: 'LAFEE',
    startTime: '2026-06-10T09:30:00Z',
    endTime: '2026-06-10T10:30:00Z',
    screenId: 's1',
    groupId: null,
    targetName: 'Lobby',
    playlistName: 'Demnächst',
    genres: ['Rock'],
    blockingEntry: { id: 'press', name: 'Pressekonferenz', playlistName: 'Morning Loop' },
  };

  async function setUp(
    days: ListDay[],
    conflicts = new Map<string, ScheduleConflict[]>(),
    hasMore = false,
  ) {
    fixture = TestBed.createComponent(ScheduleListView);
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('conflicts', conflicts);
    fixture.componentRef.setInput('hasMore', hasMore);
    fixture.componentRef.setInput('orgTimeZone', 'UTC');
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.list-row'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('shows the event, its playlist, genre group and target per row', async () => {
    // Arrange / Act
    await setUp([day]);

    // Assert
    const [first] = rows();
    expect(first.querySelector('.row-title')?.textContent?.trim()).toBe('ITCHY');
    expect(first.querySelector('.row-playlist')?.textContent?.trim()).toBe('Demnächst');
    expect(first.querySelector('.genre-pill')?.textContent?.trim()).toBe('Rock, Metal');
    expect(first.querySelector('.row-target')?.textContent?.trim()).toBe('Lobby');
    expect(first.querySelector('.row-time')?.textContent?.trim()).toBe('09:00–10:00');
  });

  it('marks a conflicting row and says which entry plays', async () => {
    // Arrange
    const conflicts = new Map([
      [day.occurrences[1].key, [{ other: show, screenNames: ['Lobby'], wins: false }]],
    ]);

    // Act
    await setUp([day], conflicts);

    // Assert
    const [, second] = rows();
    expect(second.classList.contains('has-conflict')).toBe(true);
    expect(second.querySelector('.row-conflict')?.textContent?.trim()).toBe(
      'Overlaps “ITCHY” on Lobby – “ITCHY” plays there.',
    );
    expect(fixture.nativeElement.querySelector('.conflict-count')?.textContent).toContain(
      '1 overlap',
    );
  });

  it('can narrow the list to conflicting rows', async () => {
    // Arrange
    const conflicts = new Map([
      [day.occurrences[1].key, [{ other: show, screenNames: ['Lobby'], wins: true }]],
    ]);
    await setUp([day], conflicts);

    // Act
    fixture.componentInstance.onlyConflicts.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert
    expect(rows().map((row) => row.querySelector('.row-title')?.textContent?.trim())).toEqual([
      'Pressekonferenz',
    ]);
  });

  it('shows a slot a rule left to another entry right after that entry', async () => {
    // Arrange / Act
    await setUp([{ ...day, displaced: [displaced] }]);

    // Assert
    const titles = rows().map((row) => row.querySelector('.row-title')?.textContent?.trim());
    expect(titles).toEqual(['ITCHY', 'Pressekonferenz', 'LAFEE']);
    const ghost = rows()[2];
    expect(ghost.classList.contains('ghost-row')).toBe(true);
    expect(ghost.querySelector('.row-displaced')?.textContent?.trim()).toBe(
      'Scheduled by rule “Abendkasse” · covered by “Pressekonferenz”',
    );
    expect(fixture.nativeElement.querySelector('.displaced-count')?.textContent).toContain(
      '1 displaced automatic entry',
    );
  });

  it('emits a clicked displaced slot', async () => {
    // Arrange
    await setUp([{ ...day, displaced: [displaced] }]);
    const selected: DisplacedSlot[] = [];
    fixture.componentInstance.displacedSelect.subscribe((slot) => selected.push(slot));

    // Act
    (fixture.nativeElement.querySelector('.ghost-row') as HTMLButtonElement).click();

    // Assert
    expect(selected).toEqual([displaced]);
  });

  it('keeps displaced slots and what holds them when narrowed to overlaps', async () => {
    // Arrange
    await setUp([{ ...day, displaced: [displaced] }]);

    // Act
    fixture.componentInstance.onlyConflicts.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert
    expect(rows().map((row) => row.querySelector('.row-title')?.textContent?.trim())).toEqual([
      'Pressekonferenz',
      'LAFEE',
    ]);
  });

  it('emits the entry of a clicked row', async () => {
    // Arrange
    await setUp([day]);
    const selected: ScheduleEntry[] = [];
    fixture.componentInstance.entrySelect.subscribe((entry) => selected.push(entry));

    // Act
    rows()[1].click();

    // Assert
    expect(selected).toEqual([press]);
  });

  it('says so when the period is empty', async () => {
    // Arrange / Act
    await setUp([]);

    // Assert
    expect(rows()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No upcoming entries');
    expect(fixture.nativeElement.querySelector('.no-conflicts')).toBeTruthy();
  });

  it('asks for more days from its end while there are any', async () => {
    // Arrange
    await setUp([day], new Map(), true);
    let requested = 0;
    fixture.componentInstance.loadMore.subscribe(() => requested++);

    // Act
    const more = fixture.nativeElement.querySelector('.list-more button') as HTMLButtonElement;
    more.click();

    // Assert
    expect(requested).toBe(1);
    expect(fixture.nativeElement.querySelector('.list-end')).toBeNull();
  });

  it('marks its end once nothing further can come', async () => {
    // Arrange / Act
    await setUp([day]);

    // Assert
    expect(fixture.nativeElement.querySelector('.list-more')).toBeNull();
    expect(fixture.nativeElement.querySelector('.list-end')?.textContent?.trim()).toBe(
      'No further entries',
    );
  });

  it('does not claim to be empty while more can still load', async () => {
    // Arrange / Act
    await setUp([], new Map(), true);

    // Assert
    expect(fixture.nativeElement.textContent).not.toContain('No upcoming entries');
    expect(fixture.nativeElement.querySelector('.list-more')).toBeTruthy();
  });
});
