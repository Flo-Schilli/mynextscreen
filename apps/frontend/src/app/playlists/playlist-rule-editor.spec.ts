import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { PlaylistRuleEditor, PREVIEW_DEBOUNCE_MS } from './playlist-rule-editor';
import { Playlist, PlaylistRule, RulePreviewResult } from './playlist.model';
import { PlaylistService } from './playlist.service';
import { ContentSourceService } from '../sources/content-source.service';
import { ContentSource, SlideFormat } from '../sources/content-source.model';
import { ContentService } from '../content/content.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

const RULE: PlaylistRule = {
  sourceIds: ['s1', 'deleted'],
  genres: { match: 'any', values: ['Metal'] },
  venues: [],
  dateFrom: { mode: 'today' },
  dateTo: { mode: 'none' },
  excludeCancelled: true,
  excludeSoldOut: false,
  sort: 'date_asc',
  limit: 30,
  graceHours: 4,
  refreshIntervalMinutes: 15,
  format: '1080x1920',
  itemDurationSeconds: 10,
  transition: 'fade',
  transitionDurationMs: 500,
};

const PREVIEW: RulePreviewResult = {
  items: [
    {
      sourceEventId: 'e1',
      sourceId: 's1',
      contentId: 'c1',
      contentUpdatedAt: '2026-11-01T10:00:00.000Z',
      title: 'Heaven Shall Burn',
      eventDate: '2026-11-07',
      startTime: '20:00',
      venue: 'Löwensaal',
      venueCanonical: 'Löwensaal',
      city: 'Nürnberg',
      genres: ['Metal'],
      statusLabels: ['AUSVERKAUFT'],
      cancelled: false,
      soldOut: true,
      expiresAt: '2026-11-08T03:00:00.000Z',
    },
  ],
  totalDurationSeconds: 10,
};

function source(id: string, name: string, formats: SlideFormat[]): ContentSource {
  return {
    id,
    organisationId: 'org1',
    name,
    adapterType: 'concertbuero-franken',
    params: {},
    formats,
    style: { background: 'black', accentColor: '#e30613' },
    syncIntervalMinutes: 360,
    enabled: true,
    nextSyncAt: null,
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncError: null,
    lastSyncSummary: null,
    venueAliases: [],
    createdAt: '',
    updatedAt: '',
  };
}

function playlist(rule: PlaylistRule = RULE): Playlist {
  return {
    id: 'p1',
    organisationId: 'org1',
    name: 'Löwensaal',
    color: '#6d6cf6',
    kind: 'dynamic',
    rule,
    nextResolveAt: null,
    lastResolvedAt: null,
    items: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('PlaylistRuleEditor', () => {
  let fixture: ComponentFixture<PlaylistRuleEditor>;
  let component: PlaylistRuleEditor;
  let saved: PlaylistRule[];
  const sourceStub = {
    getAll: vi.fn(),
    getFacets: vi.fn(),
  };
  const playlistStub = { previewRule: vi.fn() };
  const contentStub = {
    getThumbnailUrl: (id: string) => `/thumb/${id}`,
    getTranscodedUrl: (id: string) => `/media/${id}`,
  };

  async function setUp(canEdit = true): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        PlaylistRuleEditor,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ContentSourceService, useValue: sourceStub },
        { provide: PlaylistService, useValue: playlistStub },
        { provide: ContentService, useValue: contentStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlaylistRuleEditor);
    component = fixture.componentInstance;
    saved = [];
    component.save.subscribe((rule) => saved.push(rule));
    fixture.componentRef.setInput('playlist', playlist());
    fixture.componentRef.setInput('orgId', 'org1');
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Lets the debounce elapse and the preview request resolve. */
  async function elapseDebounce(): Promise<void> {
    await vi.advanceTimersByTimeAsync(PREVIEW_DEBOUNCE_MS + 10);
    fixture.detectChanges();
  }

  const text = (): string => fixture.nativeElement.textContent as string;

  beforeEach(() => {
    vi.useFakeTimers();
    sourceStub.getAll.mockReturnValue(
      of([
        source('s1', 'Concertbüro', ['1920x1080', '1080x1920']),
        source('s2', 'Other', ['1920x1080']),
      ]),
    );
    sourceStub.getFacets.mockReturnValue(
      of({ venues: ['Hirsch', 'Löwensaal'], genres: ['Metal'] }),
    );
    playlistStub.previewRule.mockReturnValue(of(PREVIEW));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('drops a deleted source from the selection and says so', async () => {
    await setUp();

    expect(fixture.nativeElement.querySelector('.missing-sources')).not.toBeNull();
    expect(text()).toContain('A deleted source was removed from the selection');

    component.submit();
    expect(saved).toEqual([{ ...RULE, sourceIds: ['s1'] }]);
  });

  it('shows what the edited rule does', async () => {
    await setUp();

    component.patch({ limit: 10, excludeSoldOut: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.rule-summary').textContent).toContain(
      'Metal · All venues · from today · without cancelled · without sold out · max. 10',
    );
  });

  it('steps the limit one at a time, so any count is reachable', async () => {
    await setUp();
    component.patch({ limit: 31 });
    fixture.detectChanges();

    const stepper = Array.from(
      fixture.nativeElement.querySelectorAll('mns-stepper') as NodeListOf<HTMLElement>,
    ).find((el) => el.textContent?.includes('Max. events'));
    (stepper!.querySelector('button[aria-label="Decrease"]') as HTMLButtonElement).click();
    component.submit();

    expect(saved.at(-1)?.limit).toBe(30);
  });

  it('keeps the format one of those the picked sources render', async () => {
    await setUp();

    component.setSources(['s2']);
    component.submit();

    expect(saved.at(-1)?.format).toBe('1920x1080');
    expect(saved.at(-1)?.sourceIds).toEqual(['s2']);
  });

  it('loads facets of the picked sources for the genre and venue pickers', async () => {
    await setUp();

    expect(sourceStub.getFacets).toHaveBeenLastCalledWith('org1', ['s1']);
  });

  it('asks for one preview per burst of edits, with the latest rule', async () => {
    await setUp();
    await elapseDebounce();
    playlistStub.previewRule.mockClear();

    component.patch({ limit: 20 });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(100);
    component.patch({ limit: 25 });
    fixture.detectChanges();
    await elapseDebounce();

    expect(playlistStub.previewRule).toHaveBeenCalledTimes(1);
    expect(playlistStub.previewRule.mock.calls[0][1]).toMatchObject({ limit: 25 });
    expect(text()).toContain('Heaven Shall Burn');
    expect(text()).toContain('1 event');
  });

  it('skips the preview while the rule is incomplete', async () => {
    await setUp();
    await elapseDebounce();
    playlistStub.previewRule.mockClear();

    component.setSources([]);
    fixture.detectChanges();
    await elapseDebounce();

    expect(playlistStub.previewRule).not.toHaveBeenCalled();
    expect(text()).toContain('Complete the rule to see a preview.');
    expect(text()).toContain('Choose at least one source.');
  });

  it('offers no save for an unchanged rule', async () => {
    sourceStub.getAll.mockReturnValue(of([source('s1', 'Concertbüro', ['1080x1920'])]));
    await setUp();
    fixture.componentRef.setInput('playlist', playlist({ ...RULE, sourceIds: ['s1'] }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector('.save-rule button') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('shows viewers the summary only and never calls the preview', async () => {
    await setUp(false);
    await elapseDebounce();

    expect(text()).toContain('Only admins and editors can change the rule.');
    expect(fixture.nativeElement.querySelector('.rule-summary')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.save-rule')).toBeNull();
    expect(playlistStub.previewRule).not.toHaveBeenCalled();

    component.submit();
    expect(saved).toEqual([]);
  });
});
