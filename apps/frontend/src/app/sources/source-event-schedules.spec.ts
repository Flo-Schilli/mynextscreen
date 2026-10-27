import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { SourceEventSchedules } from './source-event-schedules';
import { EventScheduleRuleModal } from './event-schedule-rule-modal';
import { EventScheduleService } from './event-schedule.service';
import { EventSchedulePreviewItem, EventScheduleRule } from './event-schedule.model';
import { PlaylistService } from '../playlists/playlist.service';
import { ScreenService } from '../screens/screen.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ContentSourceService } from './content-source.service';
import { ToastService } from '../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

function buildRule(overrides: Partial<EventScheduleRule> = {}): EventScheduleRule {
  return {
    id: 'r1',
    organisationId: 'org1',
    sourceId: 's1',
    name: 'Hirsch-Abend',
    venues: ['Hirsch'],
    playlistId: 'p1',
    windowStart: '18:00',
    windowEnd: '01:00',
    excludeCancelled: true,
    genreVariants: [],
    colour: '#6d6cf6',
    enabled: true,
    screenIds: ['sc1'],
    groupIds: [],
    lastReconciledAt: null,
    lastReconcileSummary: {
      created: 1,
      updated: 0,
      removed: 0,
      conflicts: [
        {
          sourceEventId: 'e2',
          eventTitle: 'Other',
          eventDate: '2026-11-12',
          screenId: 'sc1',
          groupId: null,
          blockingEntryId: 'x',
        },
      ],
    },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const PREVIEW: EventSchedulePreviewItem[] = [
  {
    sourceEventId: 'e1',
    title: 'Heaven Shall Burn',
    eventDate: '2026-11-05',
    venue: 'Hirsch',
    cancelled: false,
    startTime: '2026-11-05T17:00:00.000Z',
    endTime: '2026-11-06T00:00:00.000Z',
    excluded: false,
    targets: [{ screenId: 'sc1', groupId: null, status: 'scheduled' }],
  },
];

describe('SourceEventSchedules', () => {
  /** The modal's protected group setter, as the template calls it. */
  function setGroup(
    modal: EventScheduleRuleModal,
    index: number,
    change: { genres?: string[]; playlistId?: string },
  ): void {
    (modal as unknown as { setGroup(i: number, c: typeof change): void }).setGroup(index, change);
  }

  let fixture: ComponentFixture<SourceEventSchedules>;
  let service: Record<
    'getAll' | 'create' | 'update' | 'delete' | 'preview' | 'setExcluded',
    ReturnType<typeof vi.fn>
  >;

  async function setUp(canEdit = true): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        SourceEventSchedules,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: EventScheduleService, useValue: service },
        {
          provide: PlaylistService,
          useValue: {
            getAll: () =>
              of([
                { id: 'p1', name: 'Konzert', kind: 'static' },
                { id: 'p2', name: 'Demnächst', kind: 'dynamic' },
              ]),
          },
        },
        { provide: ScreenService, useValue: { getAll: () => of([{ id: 'sc1', name: 'Foyer' }]) } },
        {
          provide: ScreenGroupService,
          useValue: { getAll: () => of([{ id: 'g1', name: 'Wall' }]) },
        },
        {
          provide: ContentSourceService,
          useValue: { getFacets: () => of({ venues: [], genres: ['Rock', 'Jazz'] }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SourceEventSchedules);
    fixture.componentRef.setInput('orgId', 'org1');
    fixture.componentRef.setInput('sourceId', 's1');
    fixture.componentRef.setInput('venues', ['Hirsch', 'Löwensaal']);
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (): string => fixture.nativeElement.textContent as string;
  const click = (css: string): void => {
    fixture.nativeElement.querySelector(`${css} button`).click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    service = {
      getAll: vi.fn(() => of([buildRule()])),
      create: vi.fn(() => of(buildRule({ id: 'r2', name: 'New' }))),
      update: vi.fn(() => of(buildRule({ enabled: false }))),
      delete: vi.fn(() => of(undefined)),
      preview: vi.fn(() => of(PREVIEW)),
      setExcluded: vi.fn(() => of(undefined)),
    };
  });

  it('lists rules with venues, playlist, window, targets and conflicts', async () => {
    await setUp();

    expect(text()).toContain('Hirsch-Abend');
    expect(text()).toContain('Konzert');
    expect(text()).toContain('18:00–01:00');
    expect(text()).toContain('Foyer');
    expect(fixture.nativeElement.querySelector('.conflict-badge').textContent).toContain('1');
  });

  it('shows the upcoming events of a rule and leaves one out', async () => {
    await setUp();

    click('.toggle-preview');
    expect(service.preview).toHaveBeenCalledWith('org1', 's1', 'r1');
    expect(text()).toContain('Heaven Shall Burn');

    click('.toggle-exclusion');
    expect(service.setExcluded).toHaveBeenCalledWith('org1', 's1', 'r1', 'e1', true);
  });

  it('creates a rule from the modal', async () => {
    await setUp();

    click('.add-rule');
    const modal = fixture.debugElement.query(By.directive(EventScheduleRuleModal))
      .componentInstance as EventScheduleRuleModal;
    modal.save.emit({
      name: 'New',
      venues: ['Hirsch'],
      playlistId: 'p1',
      windowStart: '18:00',
      windowEnd: '23:00',
      targets: ['group:g1'],
      excludeCancelled: true,
      genreGroups: [],
      colour: '#6d6cf6',
      enabled: true,
    });
    fixture.detectChanges();

    expect(service.create).toHaveBeenCalledWith(
      'org1',
      's1',
      expect.objectContaining({ name: 'New', screenIds: [], groupIds: ['g1'] }),
    );
    expect(fixture.debugElement.query(By.directive(EventScheduleRuleModal))).toBeNull();
    expect(text()).toContain('New');
  });

  it('lists the genre groups of a rule in their order', async () => {
    service.getAll.mockReturnValue(
      of([
        buildRule({
          playlistId: 'p2',
          genreVariants: [{ genres: ['Rock', 'Metal'] }, { genres: ['Jazz'] }],
        }),
      ]),
    );
    await setUp();

    expect(fixture.nativeElement.querySelector('.genre-groups').textContent).toContain(
      'Rock/Metal · Jazz',
    );
  });

  it("names a group's own playlist in the list", async () => {
    service.getAll.mockReturnValue(
      of([
        buildRule({
          playlistId: 'p2',
          genreVariants: [{ genres: ['Rock'], playlistId: 'p1' }, { genres: ['Jazz'] }],
        }),
      ]),
    );
    await setUp();

    expect(fixture.nativeElement.querySelector('.genre-groups').textContent).toContain(
      'Rock → Konzert · Jazz',
    );
  });

  it('edits genre groups of a dynamic rule playlist, defaulting to that playlist', async () => {
    service.getAll.mockReturnValue(of([buildRule({ playlistId: 'p2' })]));
    await setUp();

    click('.edit-rule');
    expect(fixture.nativeElement.querySelector('.add-genre-group')).not.toBeNull();
    click('.add-genre-group');
    const modal = fixture.debugElement.query(By.directive(EventScheduleRuleModal))
      .componentInstance as EventScheduleRuleModal;
    setGroup(modal, 0, { genres: ['Rock'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.group-playlist-hint').textContent).toContain(
      'narrowed',
    );
    modal.submit();
    fixture.detectChanges();

    expect(service.update).toHaveBeenCalledWith(
      'org1',
      's1',
      'r1',
      expect.objectContaining({ genreVariants: [{ genres: ['Rock'], playlistId: null }] }),
    );
  });

  it('saves a group with its own playlist', async () => {
    service.getAll.mockReturnValue(of([buildRule({ playlistId: 'p2' })]));
    await setUp();

    click('.edit-rule');
    click('.add-genre-group');
    const modal = fixture.debugElement.query(By.directive(EventScheduleRuleModal))
      .componentInstance as EventScheduleRuleModal;
    setGroup(modal, 0, { genres: ['Rock'], playlistId: 'p1' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.group-playlist-hint').textContent).toContain(
      'plays as it is',
    );
    modal.submit();

    expect(service.update).toHaveBeenCalledWith(
      'org1',
      's1',
      'r1',
      expect.objectContaining({ genreVariants: [{ genres: ['Rock'], playlistId: 'p1' }] }),
    );
  });

  it('lets a static rule playlist have genre groups, each with its own playlist', async () => {
    service.getAll.mockReturnValue(
      of([buildRule({ playlistId: 'p1', genreVariants: [{ genres: ['Rock'] }] })]),
    );
    await setUp();

    click('.edit-rule');
    expect(fixture.nativeElement.querySelector('.add-genre-group')).not.toBeNull();
    const modal = fixture.debugElement.query(By.directive(EventScheduleRuleModal))
      .componentInstance as EventScheduleRuleModal;
    modal.submit();
    expect(service.update).not.toHaveBeenCalled();

    setGroup(modal, 0, { playlistId: 'p2' });
    modal.submit();
    fixture.detectChanges();

    expect(service.update).toHaveBeenCalledWith(
      'org1',
      's1',
      'r1',
      expect.objectContaining({ genreVariants: [{ genres: ['Rock'], playlistId: 'p2' }] }),
    );
  });

  it('keeps the modal open when saving fails', async () => {
    service.update.mockReturnValue(throwError(() => ({ error: { message: 'Nope' } })));
    await setUp();
    const toast = TestBed.inject(ToastService);

    click('.edit-rule');
    const modal = fixture.debugElement.query(By.directive(EventScheduleRuleModal))
      .componentInstance as EventScheduleRuleModal;
    modal.submit();
    fixture.detectChanges();

    expect(service.update).toHaveBeenCalled();
    expect(fixture.debugElement.query(By.directive(EventScheduleRuleModal))).not.toBeNull();
    expect(toast.toasts().at(-1)?.message).toContain('Nope');
  });

  it('pauses a rule with its switch', async () => {
    await setUp();

    fixture.nativeElement
      .querySelector('.rule-row button[role="switch"], .rule-row mns-switch button')
      .click();
    fixture.detectChanges();

    expect(service.update).toHaveBeenCalledWith('org1', 's1', 'r1', { enabled: false });
    expect(text()).toContain('Paused');
  });

  it('deletes a rule after confirming', async () => {
    await setUp();

    click('.delete-rule');
    click('.confirm-delete');

    expect(service.delete).toHaveBeenCalledWith('org1', 's1', 'r1');
    expect(text()).not.toContain('Hirsch-Abend');
  });

  it('offers no changes to viewers', async () => {
    await setUp(false);

    expect(fixture.nativeElement.querySelector('.add-rule')).toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-rule')).toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-rule')).toBeNull();
  });

  it('shows an empty state without rules', async () => {
    service.getAll.mockReturnValue(of([]));
    await setUp();

    expect(text()).toContain('No rules yet');
  });
});
