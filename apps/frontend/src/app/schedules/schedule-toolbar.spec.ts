import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleToolbar } from './schedule-toolbar';
import { TargetOption } from './schedule.model';
import { ScheduleViewMode } from './schedule-calendar.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SCREEN_TARGETS: TargetOption[] = [
  { id: 's1', name: 'Lobby Screen', type: 'screen' },
  { id: 's2', name: 'Bar Screen', type: 'screen' },
];

const GROUP_TARGETS: TargetOption[] = [
  { id: 'g1', name: 'Video Wall', type: 'group', mode: 'split' },
];

describe('ScheduleToolbar', () => {
  let fixture: ComponentFixture<ScheduleToolbar>;

  async function setUp(overrides?: {
    screenTargets?: TargetOption[];
    groupTargets?: TargetOption[];
    selectedTargetId?: string;
    viewMode?: ScheduleViewMode;
    currentRangeLabel?: string;
  }): Promise<void> {
    fixture = TestBed.createComponent(ScheduleToolbar);
    fixture.componentRef.setInput('screenTargets', overrides?.screenTargets ?? SCREEN_TARGETS);
    fixture.componentRef.setInput('groupTargets', overrides?.groupTargets ?? GROUP_TARGETS);
    fixture.componentRef.setInput('selectedTargetId', overrides?.selectedTargetId ?? 'screen:s1');
    fixture.componentRef.setInput('viewMode', overrides?.viewMode ?? 'week');
    fixture.componentRef.setInput(
      'currentRangeLabel',
      overrides?.currentRangeLabel ?? 'Jun 1 - Jun 7',
    );
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  describe('target options', () => {
    it('builds a flat option per screen target prefixed with "Screen ·"', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const screenOptions = fixture.componentInstance
        .targetOptions()
        .filter((o) => o.value.startsWith('screen:'));
      expect(screenOptions.length).toBe(2);
      expect(screenOptions[0].value).toBe('screen:s1');
      expect(screenOptions[0].label).toContain('Screen · Lobby Screen');
    });

    it('builds a group option including the mode label', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const groupOption = fixture.componentInstance
        .targetOptions()
        .find((o) => o.value.startsWith('group:'));
      expect(groupOption?.value).toBe('group:g1');
      expect(groupOption?.label).toContain('Video Wall');
      expect(groupOption?.label).toContain('split');
    });

    it('produces no options when there are no targets at all', async () => {
      // Arrange / Act
      await setUp({ screenTargets: [], groupTargets: [] });

      // Assert
      expect(fixture.componentInstance.targetOptions().length).toBe(0);
    });

    it('omits group options when there are no group targets', async () => {
      // Arrange / Act
      await setUp({ groupTargets: [] });

      // Assert
      const values = fixture.componentInstance.targetOptions().map((o) => o.value);
      expect(values.some((v) => v.startsWith('screen:'))).toBe(true);
      expect(values.some((v) => v.startsWith('group:'))).toBe(false);
    });
  });

  describe('view-mode toggle', () => {
    it('marks only the active view button with the active class', async () => {
      // Arrange / Act
      await setUp({ viewMode: 'month' });

      // Assert
      const buttons = fixture.nativeElement.querySelectorAll('.seg-btn');
      const active = Array.from(buttons).filter((b) =>
        (b as HTMLElement).classList.contains('active'),
      );
      expect(active.length).toBe(1);
      expect((active[0] as HTMLElement).textContent?.trim()).toBe('Month');
    });

    it('emits the chosen view mode when a toggle button is clicked', async () => {
      // Arrange
      await setUp({ viewMode: 'week' });
      const emitted: ScheduleViewMode[] = [];
      fixture.componentInstance.viewChange.subscribe((v) => emitted.push(v));

      // Act
      const buttons = fixture.nativeElement.querySelectorAll('.seg-btn');
      (buttons[0] as HTMLButtonElement).click(); // Day

      // Assert
      expect(emitted).toEqual(['day']);
    });
  });

  describe('output emits', () => {
    it('emits the selected value on target change', async () => {
      // Arrange
      await setUp();
      let emitted: string | undefined;
      fixture.componentInstance.targetChange.subscribe((v) => (emitted = v));

      // Act — open the mns-select and pick the second screen option
      const trigger = fixture.nativeElement.querySelector(
        '#targetSelect mns-select button',
      ) as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();
      const options = fixture.nativeElement.querySelectorAll(
        '#targetSelect [role="option"]',
      ) as NodeListOf<HTMLButtonElement>;
      options[1].click();
      fixture.detectChanges();
      await fixture.whenStable();

      // Assert
      expect(emitted).toBe('screen:s2');
    });

    it('emits prev, today and next on the navigation buttons', async () => {
      // Arrange
      await setUp();
      const calls: string[] = [];
      fixture.componentInstance.prev.subscribe(() => calls.push('prev'));
      fixture.componentInstance.today.subscribe(() => calls.push('today'));
      fixture.componentInstance.next.subscribe(() => calls.push('next'));

      // Act
      const navButtons = fixture.nativeElement.querySelectorAll('.nav-buttons button');
      (navButtons[0] as HTMLButtonElement).click(); // prev
      (navButtons[1] as HTMLButtonElement).click(); // today (mns-btn)
      (navButtons[2] as HTMLButtonElement).click(); // next

      // Assert
      expect(calls).toEqual(['prev', 'today', 'next']);
    });

    it('emits create when the new-schedule button is clicked', async () => {
      // Arrange
      await setUp();
      let created = false;
      fixture.componentInstance.create.subscribe(() => (created = true));

      // Act — the create button is the last mns-btn in the toolbar
      const buttons = fixture.nativeElement.querySelectorAll('mns-btn button');
      (buttons[buttons.length - 1] as HTMLButtonElement).click();

      // Assert
      expect(created).toBe(true);
    });

    it('renders the current range label', async () => {
      // Arrange / Act
      await setUp({ currentRangeLabel: 'June 2026' });

      // Assert
      const label = fixture.nativeElement.querySelector('.current-range') as HTMLElement;
      expect(label.textContent?.trim()).toBe('June 2026');
    });
  });
});
