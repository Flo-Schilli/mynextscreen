import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DashboardActivityFeed } from './dashboard-activity-feed';
import { ActivityEntry } from './dashboard.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeEntry(overrides: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    timestamp: '2026-01-01T09:30:15.000Z',
    category: 'info',
    description: 'Something happened',
    ...overrides,
  };
}

describe('DashboardActivityFeed', () => {
  let fixture: ComponentFixture<DashboardActivityFeed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardActivityFeed],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardActivityFeed);
  });

  function setEntries(entries: ActivityEntry[]): void {
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
  }

  it('renders one item per entry', () => {
    // Arrange & Act
    setEntries([
      makeEntry({ timestamp: '2026-01-01T01:00:00.000Z' }),
      makeEntry({ timestamp: '2026-01-01T02:00:00.000Z' }),
    ]);

    // Assert
    expect(fixture.debugElement.queryAll(By.css('.activity-item')).length).toBe(2);
  });

  it('renders the description text', () => {
    // Arrange & Act
    setEntries([makeEntry({ description: 'Screen came online' })]);

    // Assert
    const text = fixture.debugElement.query(By.css('.activity-text')).nativeElement as HTMLElement;
    expect(text.textContent?.trim()).toBe('Screen came online');
  });

  it('formats the timestamp as HH:mm:ss via the date pipe', () => {
    // Arrange & Act
    setEntries([makeEntry({ timestamp: '2026-01-01T09:30:15.000Z' })]);

    // Assert: format is HH:mm:ss regardless of timezone offset
    const time = fixture.debugElement.query(By.css('.activity-time')).nativeElement as HTMLElement;
    expect(time.textContent?.trim()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  describe('category dot class', () => {
    const cases: ActivityEntry['category'][] = ['screen', 'schedule', 'transcoding', 'info'];

    for (const category of cases) {
      it(`applies activity-dot--${category} for the ${category} category`, () => {
        // Arrange & Act
        setEntries([makeEntry({ category })]);

        // Assert
        const dot = fixture.debugElement.query(By.css('.activity-dot'))
          .nativeElement as HTMLElement;
        expect(dot.classList.contains(`activity-dot--${category}`)).toBe(true);
      });
    }
  });

  it('renders nothing when the entries list is empty', () => {
    // Arrange & Act
    setEntries([]);

    // Assert
    expect(fixture.debugElement.queryAll(By.css('.activity-item')).length).toBe(0);
  });
});
