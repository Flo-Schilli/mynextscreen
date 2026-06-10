import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
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

  describe('target options rendering', () => {
    it('renders a screen optgroup with one option per screen target', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const optgroups = fixture.nativeElement.querySelectorAll('optgroup');
      const screenGroup = Array.from(optgroups).find(
        (g) => (g as HTMLOptGroupElement).label === 'Screens',
      ) as HTMLOptGroupElement;
      expect(screenGroup).toBeTruthy();
      const options = screenGroup.querySelectorAll('option');
      expect(options.length).toBe(2);
      expect((options[0] as HTMLOptionElement).value).toBe('screen:s1');
    });

    it('renders a screen-group optgroup including the mode label', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const optgroups = fixture.nativeElement.querySelectorAll('optgroup');
      const groupGroup = Array.from(optgroups).find(
        (g) => (g as HTMLOptGroupElement).label === 'Screen Groups',
      ) as HTMLOptGroupElement;
      expect(groupGroup).toBeTruthy();
      const option = groupGroup.querySelector('option') as HTMLOptionElement;
      expect(option.value).toBe('group:g1');
      expect(option.textContent).toContain('Video Wall');
      expect(option.textContent).toContain('split');
    });

    it('shows the empty placeholder option when there are no targets at all', async () => {
      // Arrange / Act
      await setUp({ screenTargets: [], groupTargets: [] });

      // Assert
      const optgroups = fixture.nativeElement.querySelectorAll('optgroup');
      expect(optgroups.length).toBe(0);
      const placeholder = fixture.nativeElement.querySelector(
        'option[disabled]',
      ) as HTMLOptionElement;
      expect(placeholder.textContent).toContain('No screens or groups');
    });

    it('omits the group optgroup when there are no group targets', async () => {
      // Arrange / Act
      await setUp({ groupTargets: [] });

      // Assert
      const optgroups = fixture.nativeElement.querySelectorAll('optgroup');
      const labels = Array.from(optgroups).map((g) => (g as HTMLOptGroupElement).label);
      expect(labels).toContain('Screens');
      expect(labels).not.toContain('Screen Groups');
    });
  });

  describe('view-mode toggle', () => {
    it('marks only the active view button with the active class', async () => {
      // Arrange / Act
      await setUp({ viewMode: 'month' });

      // Assert
      const buttons = fixture.nativeElement.querySelectorAll('.toggle-btn');
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
      const buttons = fixture.nativeElement.querySelectorAll('.toggle-btn');
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

      // Act
      const select = fixture.debugElement.query(By.css('#targetSelect'))
        .nativeElement as HTMLSelectElement;
      select.value = 'screen:s2';
      select.dispatchEvent(new Event('change'));
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
      (navButtons[0] as HTMLButtonElement).click();
      (navButtons[1] as HTMLButtonElement).click();
      (navButtons[2] as HTMLButtonElement).click();

      // Assert
      expect(calls).toEqual(['prev', 'today', 'next']);
    });

    it('emits create when the schedule button is clicked', async () => {
      // Arrange
      await setUp();
      let created = false;
      fixture.componentInstance.create.subscribe(() => (created = true));

      // Act
      const createBtn = fixture.nativeElement.querySelector('.btn-primary') as HTMLButtonElement;
      createBtn.click();

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
