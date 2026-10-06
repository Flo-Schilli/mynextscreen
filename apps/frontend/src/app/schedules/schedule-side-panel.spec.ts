import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleSidePanel } from './schedule-side-panel';
import { DayTimeline } from './schedule-calendar.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeTimeline(overrides: Partial<DayTimeline> = {}): DayTimeline {
  return {
    playlistName: 'Morning Loop',
    colour: '#3b82f6',
    startTime: '08:00',
    endTime: '10:00',
    isRecurring: false,
    isGroup: false,
    targetName: 'Lobby Screen',
    ...overrides,
  };
}

describe('ScheduleSidePanel', () => {
  let fixture: ComponentFixture<ScheduleSidePanel>;

  async function setUp(timeline: DayTimeline[], dateLabel = 'Monday, June 1, 2026'): Promise<void> {
    fixture = TestBed.createComponent(ScheduleSidePanel);
    fixture.componentRef.setInput('dateLabel', dateLabel);
    fixture.componentRef.setInput('timeline', timeline);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders the date label and scheduled count in the card-head sub', async () => {
    // Arrange / Act
    await setUp([], 'Tuesday, June 2, 2026');

    // Assert — card-head shows "Today" with the date + count as the sub line
    expect(fixture.nativeElement.textContent).toContain('Today');
    expect(fixture.nativeElement.textContent).toContain('Tuesday, June 2, 2026');
    expect(fixture.nativeElement.textContent).toContain('0 scheduled');
  });

  it('shows the empty-state message when the timeline is empty', async () => {
    // Arrange / Act
    await setUp([]);

    // Assert
    const empty = fixture.nativeElement.querySelector('.empty-text') as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('No schedule entries');
    expect(fixture.nativeElement.querySelectorAll('.timeline-item').length).toBe(0);
  });

  it('renders one timeline item per entry with playlist, target and time', async () => {
    // Arrange / Act
    await setUp([
      makeTimeline({ playlistName: 'A', startTime: '08:00', endTime: '09:00' }),
      makeTimeline({ playlistName: 'B', startTime: '12:00', endTime: '13:00', targetName: 'Bar' }),
    ]);

    // Assert
    const items = fixture.nativeElement.querySelectorAll('.timeline-item');
    expect(items.length).toBe(2);
    const firstName = items[0].querySelector('.timeline-name') as HTMLElement;
    const firstTime = items[0].querySelector('.timeline-time') as HTMLElement;
    expect(firstName.textContent).toContain('A');
    expect(firstTime.textContent).toContain('08:00 - 09:00');
    const secondTarget = items[1].querySelector('.timeline-target') as HTMLElement;
    expect(secondTarget.textContent?.trim()).toBe('Bar');
  });

  it('shows the group badge only for group entries', async () => {
    // Arrange / Act
    await setUp([makeTimeline({ isGroup: true }), makeTimeline({ isGroup: false })]);

    // Assert
    const items = fixture.nativeElement.querySelectorAll('.timeline-item');
    expect(items[0].querySelector('.group-badge-inline')).toBeTruthy();
    expect(items[1].querySelector('.group-badge-inline')).toBeNull();
  });

  it('shows the recurrence icon only for recurring entries', async () => {
    // Arrange / Act
    await setUp([makeTimeline({ isRecurring: true }), makeTimeline({ isRecurring: false })]);

    // Assert
    const items = fixture.nativeElement.querySelectorAll('.timeline-item');
    expect(items[0].querySelector('.repeat-icon-sm')).toBeTruthy();
    expect(items[1].querySelector('.repeat-icon-sm')).toBeNull();
  });

  it('applies the entry colour to the timeline colour bar', async () => {
    // Arrange / Act
    await setUp([makeTimeline({ colour: 'rgb(255, 0, 0)' })]);

    // Assert
    const bar = fixture.nativeElement.querySelector('.timeline-colour') as HTMLElement;
    expect(bar.style.background).toBe('rgb(255, 0, 0)');
  });
});
