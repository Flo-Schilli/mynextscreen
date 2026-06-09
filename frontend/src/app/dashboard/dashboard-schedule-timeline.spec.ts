import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DashboardScheduleTimeline } from './dashboard-schedule-timeline';
import { TimelineRow, TimelineEntry } from './dashboard.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    playlistName: 'Morning',
    colour: '#3b82f6',
    startPercent: 10,
    widthPercent: 25,
    startTime: '08:00',
    endTime: '14:00',
    ...overrides,
  };
}

describe('DashboardScheduleTimeline', () => {
  let fixture: ComponentFixture<DashboardScheduleTimeline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardScheduleTimeline],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardScheduleTimeline);
  });

  function setInputs(rows: TimelineRow[], hours: string[]): void {
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('hours', hours);
    fixture.detectChanges();
  }

  it('renders the hour axis labels', () => {
    // Arrange & Act
    setInputs([], ['00:00', '03:00', '06:00']);

    // Assert
    const hours = fixture.debugElement
      .queryAll(By.css('.timeline-hour'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
    expect(hours).toEqual(['00:00', '03:00', '06:00']);
  });

  it('renders one track row per screen with its label', () => {
    // Arrange & Act
    setInputs(
      [
        { screenName: 'Lobby', entries: [] },
        { screenName: 'Bar', entries: [makeEntry()] },
      ],
      [],
    );

    // Assert
    const labels = fixture.debugElement
      .queryAll(By.css('.timeline-row .timeline-screen-label'))
      .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
    expect(labels).toEqual(['Lobby', 'Bar']);
  });

  it('positions and styles each playlist block from the entry', () => {
    // Arrange & Act
    setInputs(
      [
        {
          screenName: 'Lobby',
          entries: [makeEntry({ startPercent: 20, widthPercent: 30, colour: '#ff0000' })],
        },
      ],
      [],
    );

    // Assert
    const block = fixture.debugElement.query(By.css('.timeline-block'))
      .nativeElement as HTMLElement;
    expect(block.style.left).toBe('20%');
    expect(block.style.width).toBe('30%');
    expect(block.style.background).toBe('rgb(255, 0, 0)');
  });

  it('builds the block tooltip from playlist name and times', () => {
    // Arrange & Act
    setInputs(
      [
        {
          screenName: 'Lobby',
          entries: [makeEntry({ playlistName: 'Evening', startTime: '18:00', endTime: '22:00' })],
        },
      ],
      [],
    );

    // Assert
    const block = fixture.debugElement.query(By.css('.timeline-block'))
      .nativeElement as HTMLElement;
    expect(block.getAttribute('title')).toBe('Evening (18:00 - 22:00)');
  });

  it('renders multiple blocks within a single track', () => {
    // Arrange & Act
    setInputs(
      [
        {
          screenName: 'Lobby',
          entries: [
            makeEntry({ startPercent: 0 }),
            makeEntry({ startPercent: 50 }),
            makeEntry({ startPercent: 80 }),
          ],
        },
      ],
      [],
    );

    // Assert
    expect(fixture.debugElement.queryAll(By.css('.timeline-block')).length).toBe(3);
  });

  it('renders no track rows when there are no rows', () => {
    // Arrange & Act
    setInputs([], ['00:00']);

    // Assert
    expect(fixture.debugElement.queryAll(By.css('.timeline-row')).length).toBe(0);
  });
});
