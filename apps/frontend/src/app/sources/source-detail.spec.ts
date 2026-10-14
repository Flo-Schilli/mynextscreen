import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SourceDetail } from './source-detail';
import { SourceAccess } from './source-access';
import { ContentSourceService } from './content-source.service';
import { AdapterDescriptor, ContentSource, SourceEvent } from './content-source.model';
import { ContentService } from '../content/content.service';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

const ADAPTER: AdapterDescriptor = {
  type: 'concertbuero-franken',
  label: 'Concertbüro Franken',
  paramsSchema: [
    {
      key: 'monthsAhead',
      type: 'integer',
      label: 'Months ahead',
      labelKey: 'sources.form.params.monthsAhead',
      min: 1,
      max: 24,
      default: 6,
    },
  ],
};

function buildSource(overrides: Partial<ContentSource> = {}): ContentSource {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Concertbüro',
    adapterType: ADAPTER.type,
    params: { monthsAhead: 6 },
    formats: ['1920x1080'],
    style: { background: 'black', accentColor: '#e30613' },
    syncIntervalMinutes: 360,
    enabled: true,
    nextSyncAt: null,
    lastSyncAt: '2026-10-14T08:00:00Z',
    lastSyncStatus: 'success',
    lastSyncError: null,
    lastSyncSummary: {
      listed: 12,
      created: 2,
      updated: 1,
      gone: 0,
      rendered: 3,
      failed: 0,
      errors: [],
    },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const EVENT: SourceEvent = {
  id: 'e1',
  sourceId: 's1',
  externalId: 'x',
  title: 'Heaven Shall Burn',
  eventDate: '2026-11-07',
  startTime: '20:00',
  venue: 'Löwensaal',
  city: 'Nürnberg',
  genres: ['Metal'],
  statusLabels: ['AUSVERKAUFT', 'NEUER TERMIN'],
  cancelled: false,
  soldOut: true,
  detailUrl: null,
  ticketUrl: null,
  goneAt: null,
  slides: [{ format: '1920x1080', contentId: 'c1', updatedAt: '2026-11-01T10:00:00.000Z' }],
};

describe('SourceDetail', () => {
  let fixture: ComponentFixture<SourceDetail>;
  let service: Record<
    'getOne' | 'getAdapters' | 'getEvents' | 'sync' | 'update' | 'delete',
    ReturnType<typeof vi.fn>
  >;
  const canEdit = signal(true);

  async function setUp(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        SourceDetail,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ContentSourceService, useValue: service },
        { provide: SourceAccess, useValue: { orgId: signal('org1'), canEdit } },
        {
          provide: ContentService,
          useValue: {
            getThumbnailUrl: (id: string) => `/thumb/${id}`,
            getTranscodedUrl: (id: string) => `/media/${id}`,
          },
        },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 's1' })) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SourceDetail);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  const text = (): string => fixture.nativeElement.textContent as string;
  const button = (css: string): HTMLButtonElement =>
    fixture.nativeElement.querySelector(`${css} button`);

  beforeEach(() => {
    vi.useFakeTimers();
    canEdit.set(true);
    service = {
      getOne: vi.fn(() => of(buildSource())),
      getAdapters: vi.fn(() => of([ADAPTER])),
      getEvents: vi.fn(() => of([EVENT])),
      sync: vi.fn(() => of({ queued: true })),
      update: vi.fn(() => of(buildSource({ name: 'Renamed' }))),
      delete: vi.fn(() => of(undefined)),
    };
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('shows the last sync summary and the event pool with slide thumbnails', async () => {
    await setUp();

    expect(text()).toContain('12 listed · 2 new · 1 changed');
    expect(text()).toContain('Heaven Shall Burn');
    expect(text()).toContain('Sold out');
    // The sold-out badge already says it; only the other label is repeated.
    expect(text()).toContain('NEUER TERMIN');
    expect(text()).not.toContain('AUSVERKAUFT');
    const thumb = fixture.nativeElement.querySelector('.slide-thumb img') as HTMLImageElement;
    expect(thumb.getAttribute('src')).toBe('/thumb/c1');
    expect(service.getEvents).toHaveBeenCalledWith('org1', 's1', {
      includeGone: false,
      limit: 200,
    });
  });

  it('polls after "sync now" until the sync has finished, then reloads the pool', async () => {
    await setUp();
    service.getOne.mockReturnValueOnce(of(buildSource({ lastSyncStatus: 'running' })));
    service.getOne.mockReturnValueOnce(
      of(buildSource({ lastSyncAt: '2026-10-14T09:00:00Z', lastSyncStatus: 'success' })),
    );
    service.getEvents.mockClear();

    button('.sync-now').click();
    fixture.detectChanges();
    expect(service.sync).toHaveBeenCalledWith('org1', 's1');
    expect(button('.sync-now').disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(3000);
    expect(service.getEvents).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();

    expect(service.getEvents).toHaveBeenCalledTimes(1);
    expect(button('.sync-now').disabled).toBe(false);
    await vi.advanceTimersByTimeAsync(9000);
    expect(service.getOne).toHaveBeenCalledTimes(3);
  });

  it('saves the settings without the adapter type', async () => {
    await setUp();

    button('.save-source').click();

    expect(service.update).toHaveBeenCalledWith(
      'org1',
      's1',
      expect.not.objectContaining({ adapterType: expect.anything() }),
    );
  });

  it('is read-only for viewers', async () => {
    canEdit.set(false);
    await setUp();

    expect(fixture.nativeElement.querySelector('.sync-now')).toBeNull();
    expect(fixture.nativeElement.querySelector('.save-source')).toBeNull();
    expect(text()).toContain('Only admins and editors can change sources.');
    const background = fixture.nativeElement.querySelector(
      'mns-select button[aria-haspopup]',
    ) as HTMLButtonElement;
    expect(background.getAttribute('aria-label')).toBe('Background');
    expect(background.disabled).toBe(true);
  });

  it('labels adapter parameters and the back link in the UI language', async () => {
    await setUp();
    TestBed.inject(TranslocoService).setActiveLang('de');
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(text()).toContain('Monate im Voraus');
    expect(text()).not.toContain('Months ahead');
    expect(text()).toContain('Zurück');
  });

  it("falls back to the adapter's own label for an unknown parameter key", async () => {
    service.getAdapters.mockReturnValue(
      of([
        {
          ...ADAPTER,
          paramsSchema: [{ ...ADAPTER.paramsSchema[0], labelKey: 'sources.form.params.unknown' }],
        },
      ]),
    );
    await setUp();

    expect(text()).toContain('Months ahead');
    expect(text()).not.toContain('sources.form.params.unknown');
  });
});
