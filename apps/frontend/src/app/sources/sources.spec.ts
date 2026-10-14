import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Sources } from './sources';
import { SourceAccess } from './source-access';
import { ContentSourceService } from './content-source.service';
import { AdapterDescriptor, ContentSource } from './content-source.model';
import { ToastService } from '../shared/toast/toast.service';
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
    lastSyncStatus: 'partial',
    lastSyncError: null,
    lastSyncSummary: null,
    venueAliases: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('Sources', () => {
  let fixture: ComponentFixture<Sources>;
  let service: {
    getAll: ReturnType<typeof vi.fn>;
    getAdapters: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  const canEdit = signal(true);

  async function setUp(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Sources, getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ContentSourceService, useValue: service },
        { provide: SourceAccess, useValue: { orgId: signal('org1'), canEdit } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Sources);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (): string => fixture.nativeElement.textContent as string;
  const buttonWith = (label: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes(label));

  beforeEach(() => {
    canEdit.set(true);
    service = {
      getAll: vi.fn(() => of([buildSource()])),
      getAdapters: vi.fn(() => of([ADAPTER])),
      create: vi.fn(() => of(buildSource({ id: 'new' }))),
    };
  });

  afterEach(() => fixture.destroy());

  it('lists sources with adapter label and last sync outcome', async () => {
    await setUp();

    expect(service.getAll).toHaveBeenCalledWith('org1');
    expect(text()).toContain('Concertbüro Franken');
    expect(text()).toContain('Partial');
    expect(text()).toContain('1920 × 1080');
  });

  it('hides the add button from viewers', async () => {
    canEdit.set(false);
    await setUp();

    expect(buttonWith('Add source')).toBeUndefined();
  });

  it('validates before creating and opens the new source', async () => {
    await setUp();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    buttonWith('Add source')!.click();
    fixture.detectChanges();
    buttonWith('Create source')!.click();
    fixture.detectChanges();

    expect(service.create).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Enter a name');

    const name = document.querySelector('mns-modal input') as HTMLInputElement;
    name.value = 'Concertbüro';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    buttonWith('Create source')!.click();

    expect(service.create).toHaveBeenCalledWith(
      'org1',
      expect.objectContaining({ name: 'Concertbüro', params: { monthsAhead: 6 } }),
    );
    expect(navigate).toHaveBeenCalledWith(['/sources', 'new']);
  });

  it('toasts when the list cannot be loaded', async () => {
    service.getAll.mockReturnValue(throwError(() => new Error('down')));
    await setUp();

    expect(TestBed.inject(ToastService).toasts().at(-1)?.message).toBe(
      'Could not load the sources.',
    );
  });
});
