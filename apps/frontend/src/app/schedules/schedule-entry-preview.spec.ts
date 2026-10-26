import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ScheduleEntryPreviewComponent } from './schedule-entry-preview';
import { ScheduleService } from './schedule.service';
import { ScheduleEntryPreview } from './schedule.model';
import { ContentService } from '../content/content.service';
import { RulePreviewItem } from '../playlists/playlist.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function event(overrides: Partial<RulePreviewItem>): RulePreviewItem {
  return {
    sourceEventId: 'ev1',
    sourceId: 'src1',
    contentId: 'c1',
    contentUpdatedAt: null,
    title: 'ITCHY',
    eventDate: '2026-10-30',
    startTime: '20:00',
    venue: 'Löwensaal',
    venueCanonical: 'Löwensaal',
    city: null,
    genres: ['Indie/Alternative', 'Rock'],
    statusLabels: [],
    cancelled: false,
    soldOut: false,
    expiresAt: '2026-10-31T02:00:00Z',
    ...overrides,
  };
}

describe('ScheduleEntryPreviewComponent', () => {
  let fixture: ComponentFixture<ScheduleEntryPreviewComponent>;
  let response: Observable<ScheduleEntryPreview>;
  const getPreview = vi.fn(() => response);

  async function setUp(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ScheduleService, useValue: { getPreview } },
        { provide: ContentService, useValue: { getThumbnailUrl: (id: string) => `/thumb/${id}` } },
      ],
    });
    fixture = TestBed.createComponent(ScheduleEntryPreviewComponent);
    fixture.componentRef.setInput('orgId', 'org1');
    fixture.componentRef.setInput('entryId', 'e1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (selector: string): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector)).map((el) =>
      ((el as HTMLElement).textContent ?? '').trim(),
    );

  it("lists a dynamic playlist's events and highlights the genres it filters on", async () => {
    // Arrange
    response = of({
      kind: 'dynamic',
      playlistName: 'Löwensaal · Rock, Metal',
      genres: ['Rock', 'Metal'],
      result: {
        items: [event({}), event({ sourceEventId: 'ev2', title: 'CLAWFINGER', genres: ['Metal'] })],
        totalDurationSeconds: 20,
      },
    });

    // Act
    await setUp();

    // Assert
    expect(getPreview).toHaveBeenCalledWith('org1', 'e1');
    expect(text('.preview-item-title')).toEqual(['ITCHY', 'CLAWFINGER']);
    expect(text('.preview-genre.matches')).toEqual(['Rock', 'Metal']);
    expect(text('.preview-summary')[0]).toContain('2 slides from “Löwensaal · Rock, Metal”');
    expect(text('.preview-summary')[0]).toContain('filtered to Rock, Metal');
  });

  it('lists the items of a static playlist', async () => {
    // Arrange
    response = of({
      kind: 'static',
      playlistName: 'Loop',
      items: [{ contentId: 'c9', title: 'Sponsors', contentUpdatedAt: '', durationSeconds: 8 }],
    });

    // Act
    await setUp();

    // Assert
    expect(text('.preview-item-title')).toEqual(['Sponsors']);
    expect(fixture.nativeElement.querySelector('img')?.getAttribute('src')).toBe('/thumb/c9');
    expect(fixture.nativeElement.querySelector('.preview-genre')).toBeNull();
  });

  it('says so when the playlist shows nothing or cannot be loaded', async () => {
    response = of({ kind: 'static', playlistName: 'Loop', items: [] });
    await setUp();
    expect(fixture.nativeElement.querySelector('.preview-empty')).toBeTruthy();

    TestBed.resetTestingModule();
    response = throwError(() => new Error('down'));
    await setUp();
    expect(fixture.nativeElement.querySelector('.preview-failed')).toBeTruthy();
  });
});
