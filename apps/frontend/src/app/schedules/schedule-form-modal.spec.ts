import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleFormModal, ScheduleFormResult, PRESET_COLOURS } from './schedule-form-modal';
import { ScheduleEntry, TargetOption } from './schedule.model';
import { Playlist } from '../playlists/playlist.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { RecurrenceType } from './schedule-recurrence.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SCREEN_TARGETS: TargetOption[] = [{ id: 's1', name: 'Lobby', type: 'screen' }];
const GROUP_TARGETS: TargetOption[] = [{ id: 'g1', name: 'Wall', type: 'group', mode: 'split' }];

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: 'org1',
    name: 'Wall',
    mode: 'split',
    gridColumns: 2,
    gridRows: 2,
    screens: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const PLAYLISTS: Playlist[] = [
  {
    id: 'p1',
    organisationId: 'org1',
    name: 'Loop A',
    color: '#6d6cf6',
    items: [],
    createdAt: '',
    updatedAt: '',
  },
];

interface SetUpOptions {
  editingEntry?: ScheduleEntry | null;
  initialTargetId?: string;
  initialPlaylistId?: string;
  initialStart?: Date;
  initialEnd?: Date;
  initialColour?: string;
  initialRecurrence?: RecurrenceType;
  initialWeekdays?: string[];
  screenGroups?: ScreenGroup[];
  submitting?: boolean;
  error?: string;
}

describe('ScheduleFormModal', () => {
  let fixture: ComponentFixture<ScheduleFormModal>;
  let component: ScheduleFormModal;

  async function setUp(opts: SetUpOptions = {}): Promise<void> {
    fixture = TestBed.createComponent(ScheduleFormModal);
    fixture.componentRef.setInput('editingEntry', opts.editingEntry ?? null);
    fixture.componentRef.setInput('screenTargets', SCREEN_TARGETS);
    fixture.componentRef.setInput('groupTargets', GROUP_TARGETS);
    fixture.componentRef.setInput('screenGroups', opts.screenGroups ?? [makeGroup()]);
    fixture.componentRef.setInput('playlists', PLAYLISTS);
    fixture.componentRef.setInput('submitting', opts.submitting ?? false);
    fixture.componentRef.setInput('error', opts.error ?? '');
    fixture.componentRef.setInput('initialTargetId', opts.initialTargetId ?? 'screen:s1');
    fixture.componentRef.setInput('initialPlaylistId', opts.initialPlaylistId ?? 'p1');
    fixture.componentRef.setInput('initialStart', opts.initialStart ?? new Date(2026, 5, 1, 8, 30));
    fixture.componentRef.setInput('initialEnd', opts.initialEnd ?? new Date(2026, 5, 1, 10, 0));
    fixture.componentRef.setInput('initialColour', opts.initialColour ?? '#3b82f6');
    fixture.componentRef.setInput('initialRecurrence', opts.initialRecurrence ?? 'none');
    fixture.componentRef.setInput('initialWeekdays', opts.initialWeekdays ?? []);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  describe('ngOnInit initialization', () => {
    it('seeds the form fields from the initial inputs', async () => {
      // Arrange / Act
      await setUp({
        initialStart: new Date(2026, 5, 1, 8, 30),
        initialEnd: new Date(2026, 5, 1, 10, 5),
        initialColour: '#ef4444',
        initialRecurrence: 'daily',
        initialWeekdays: ['MO', 'TU'],
      });

      // Assert
      expect(component.targetId).toBe('screen:s1');
      expect(component.playlistId).toBe('p1');
      expect(component.startDate).toBe('2026-06-01');
      expect(component.startTime).toBe('08:30');
      expect(component.endTime).toBe('10:05');
      expect(component.colour).toBe('#ef4444');
      expect(component.recurrence).toBe('daily');
      expect(component.weekdays).toEqual(['MO', 'TU']);
    });

    it('copies the initial weekdays array (no shared reference)', async () => {
      // Arrange
      const weekdays = ['MO'];

      // Act
      await setUp({ initialWeekdays: weekdays });
      component.weekdays.push('TU');

      // Assert
      expect(weekdays).toEqual(['MO']);
    });
  });

  describe('title and target selector rendering', () => {
    it('shows the create title and the target selector when not editing', async () => {
      // Arrange / Act
      await setUp({ editingEntry: null });

      // Assert
      expect((fixture.nativeElement.querySelector('h2') as HTMLElement).textContent).toContain(
        'Create Schedule Entry',
      );
      expect(fixture.nativeElement.querySelector('#modalTarget')).toBeTruthy();
    });

    it('shows the edit title and hides the target selector when editing', async () => {
      // Arrange
      const entry = {
        id: 'e1',
        organisationId: 'org1',
        screenId: 's1',
        groupId: null,
        playlistId: 'p1',
        startTime: '2026-06-01T08:00:00.000Z',
        endTime: '2026-06-01T10:00:00.000Z',
        rrule: null,
        colour: '#3b82f6',
        createdAt: '',
        updatedAt: '',
      } satisfies ScheduleEntry;

      // Act
      await setUp({ editingEntry: entry });

      // Assert
      expect((fixture.nativeElement.querySelector('h2') as HTMLElement).textContent).toContain(
        'Edit Schedule Entry',
      );
      expect(fixture.nativeElement.querySelector('#modalTarget')).toBeNull();
      // Delete button only present in edit mode
      expect(fixture.nativeElement.querySelector('.btn-danger')).toBeTruthy();
    });
  });

  describe('updateTargetGroup', () => {
    it('resolves the target group for a group: target id', async () => {
      // Arrange / Act
      await setUp({ initialTargetId: 'group:g1', screenGroups: [makeGroup({ mode: 'split' })] });

      // Assert
      expect(component.targetGroup?.id).toBe('g1');
    });

    it('clears the target group for a screen: target id', async () => {
      // Arrange / Act
      await setUp({ initialTargetId: 'screen:s1' });

      // Assert
      expect(component.targetGroup).toBeNull();
    });

    it('clears the target group when the group id is unknown', async () => {
      // Arrange
      await setUp({ initialTargetId: 'screen:s1' });

      // Act
      component.targetId = 'group:unknown';
      component.updateTargetGroup();

      // Assert
      expect(component.targetGroup).toBeNull();
    });

    it('renders the mode info box and split warning for a split group target', async () => {
      // Arrange / Act
      await setUp({ initialTargetId: 'group:g1', screenGroups: [makeGroup({ mode: 'split' })] });

      // Assert
      const boxes = fixture.nativeElement.querySelectorAll('.info-box');
      expect(boxes.length).toBe(2);
      expect(fixture.nativeElement.querySelector('.info-box-warn')).toBeTruthy();
    });

    it('renders the mode info box but no split warning for a mirror group target', async () => {
      // Arrange / Act
      await setUp({ initialTargetId: 'group:g1', screenGroups: [makeGroup({ mode: 'mirror' })] });

      // Assert
      const box = fixture.nativeElement.querySelector('.info-box') as HTMLElement;
      expect(box.textContent).toContain('Mirror');
      expect(fixture.nativeElement.querySelector('.info-box-warn')).toBeNull();
    });
  });

  describe('toggleWeekday', () => {
    it('adds a weekday that is not yet selected', async () => {
      // Arrange
      await setUp({ initialWeekdays: [] });

      // Act
      component.toggleWeekday('MO');

      // Assert
      expect(component.weekdays).toEqual(['MO']);
    });

    it('removes a weekday that is already selected', async () => {
      // Arrange
      await setUp({ initialWeekdays: ['MO', 'WE'] });

      // Act
      component.toggleWeekday('MO');

      // Assert
      expect(component.weekdays).toEqual(['WE']);
    });
  });

  describe('weekday checkbox rendering', () => {
    it('renders the weekday checkboxes only for the weekdays recurrence', async () => {
      // Arrange / Act
      await setUp({ initialRecurrence: 'weekdays', initialWeekdays: ['MO'] });

      // Assert
      expect(fixture.nativeElement.querySelectorAll('.weekday-checkbox').length).toBe(7);
    });

    it('does not render the weekday checkboxes for non-weekday recurrence', async () => {
      // Arrange / Act
      await setUp({ initialRecurrence: 'weekly' });

      // Assert
      expect(fixture.nativeElement.querySelectorAll('.weekday-checkbox').length).toBe(0);
    });
  });

  describe('submit', () => {
    it('emits the raw form values via the save output', async () => {
      // Arrange
      await setUp({
        initialTargetId: 'screen:s1',
        initialPlaylistId: 'p1',
        initialStart: new Date(2026, 5, 1, 8, 0),
        initialEnd: new Date(2026, 5, 1, 9, 0),
        initialColour: '#22c55e',
        initialRecurrence: 'weekly',
      });
      let result: ScheduleFormResult | undefined;
      component.save.subscribe((r) => (result = r));

      // Act
      component.submit();

      // Assert
      expect(result).toEqual({
        targetId: 'screen:s1',
        playlistId: 'p1',
        startDate: '2026-06-01',
        startTime: '08:00',
        endDate: '2026-06-01',
        endTime: '09:00',
        colour: '#22c55e',
        recurrence: 'weekly',
        weekdays: [],
      });
    });

    it('emits save when the form is submitted', async () => {
      // Arrange
      await setUp();
      let emitted = false;
      component.save.subscribe(() => (emitted = true));

      // Act
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      // Assert
      expect(emitted).toBe(true);
    });
  });

  describe('error and submitting state', () => {
    it('renders the error message when provided', async () => {
      // Arrange / Act
      await setUp({ error: 'Time slot overlaps.' });

      // Assert
      const err = fixture.nativeElement.querySelector('.error') as HTMLElement;
      expect(err.textContent).toContain('Time slot overlaps.');
    });

    it('disables the submit button and shows "Saving..." while submitting', async () => {
      // Arrange / Act
      await setUp({ submitting: true });

      // Assert
      const submitBtn = fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
      expect(submitBtn.textContent?.trim()).toBe('Saving...');
    });
  });

  describe('output emits', () => {
    it('emits dismiss when Cancel is clicked', async () => {
      // Arrange
      await setUp();
      let dismissed = false;
      component.dismiss.subscribe(() => (dismissed = true));

      // Act
      (fixture.nativeElement.querySelector('.btn-secondary') as HTMLButtonElement).click();

      // Assert
      expect(dismissed).toBe(true);
    });

    it('emits remove when Delete is clicked in edit mode', async () => {
      // Arrange
      const entry = {
        id: 'e1',
        organisationId: 'org1',
        screenId: 's1',
        groupId: null,
        playlistId: 'p1',
        startTime: '2026-06-01T08:00:00.000Z',
        endTime: '2026-06-01T10:00:00.000Z',
        rrule: null,
        colour: '#3b82f6',
        createdAt: '',
        updatedAt: '',
      } satisfies ScheduleEntry;
      await setUp({ editingEntry: entry });
      let removed = false;
      component.remove.subscribe(() => (removed = true));

      // Act
      (fixture.nativeElement.querySelector('.btn-danger') as HTMLButtonElement).click();

      // Assert
      expect(removed).toBe(true);
    });

    it('selects a preset colour swatch via click', async () => {
      // Arrange
      await setUp({ initialColour: PRESET_COLOURS[0] });

      // Act
      const swatches = fixture.nativeElement.querySelectorAll('.colour-swatch');
      (swatches[2] as HTMLButtonElement).click();

      // Assert
      expect(component.colour).toBe(PRESET_COLOURS[2]);
    });
  });
});
