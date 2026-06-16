import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupAddScreenModal } from './screen-group-add-screen-modal';
import { Screen } from '../screens/screen.model';

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Screen 1',
    resolution: '1920x1080',
    location: 'Hall',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function addButtons(el: HTMLElement): HTMLButtonElement[] {
  return Array.from(el.querySelectorAll('button')).filter(
    (b) => (b as HTMLElement).textContent?.trim() === 'Add',
  ) as HTMLButtonElement[];
}

describe('ScreenGroupAddScreenModal', () => {
  let fixture: ComponentFixture<ScreenGroupAddScreenModal>;
  let component: ScreenGroupAddScreenModal;

  async function setUp(
    opts: {
      screens?: Screen[];
      loading?: boolean;
      error?: string;
      groupId?: string;
      operationInProgress?: boolean;
    } = {},
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupAddScreenModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupAddScreenModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('availableScreens', opts.screens ?? []);
    fixture.componentRef.setInput('loadingScreens', opts.loading ?? false);
    fixture.componentRef.setInput('error', opts.error ?? '');
    fixture.componentRef.setInput('groupId', opts.groupId ?? 'g1');
    fixture.componentRef.setInput('operationInProgress', opts.operationInProgress ?? false);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows a loading message while screens are loading', async () => {
    await setUp({ loading: true });

    expect(fixture.nativeElement.textContent).toContain('Loading screens');
    expect(addButtons(fixture.nativeElement).length).toBe(0);
  });

  it('shows an empty message when no screens are available', async () => {
    await setUp({ screens: [] });

    expect(fixture.nativeElement.textContent).toContain('No unassigned screens available.');
  });

  it('renders one Add row per available screen', async () => {
    await setUp({
      screens: [makeScreen({ id: 's1' }), makeScreen({ id: 's2', name: 'Screen 2' })],
    });

    expect(addButtons(fixture.nativeElement).length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Screen 2');
  });

  it('emits the screen on its Add button click', async () => {
    const screen = makeScreen({ id: 's1' });
    await setUp({ screens: [screen] });
    let emitted: Screen | undefined;
    component.add.subscribe((v) => (emitted = v));

    addButtons(fixture.nativeElement)[0].click();

    expect(emitted).toEqual(screen);
  });

  it('marks and disables a screen already assigned to another group', async () => {
    await setUp({ screens: [makeScreen({ id: 's1', groupId: 'other-group' })], groupId: 'g1' });

    expect(fixture.nativeElement.textContent).toContain('In another group');
    expect(addButtons(fixture.nativeElement)[0].disabled).toBe(true);
  });

  it('does not mark a screen already assigned to the current group as foreign', async () => {
    await setUp({ screens: [makeScreen({ id: 's1', groupId: 'g1' })], groupId: 'g1' });

    expect(fixture.nativeElement.textContent).not.toContain('In another group');
    expect(addButtons(fixture.nativeElement)[0].disabled).toBe(false);
  });

  it('disables Add buttons while an operation is in progress', async () => {
    await setUp({ screens: [makeScreen({ id: 's1' })], operationInProgress: true });

    expect(addButtons(fixture.nativeElement)[0].disabled).toBe(true);
  });

  it('renders the parent-provided error in the list state', async () => {
    await setUp({ screens: [makeScreen({ id: 's1' })], error: 'Assignment failed' });

    expect(fixture.nativeElement.textContent).toContain('Assignment failed');
  });

  it('emits dismiss when Close is clicked', async () => {
    await setUp({ screens: [] });
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const closeBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Close',
    ) as HTMLButtonElement;
    closeBtn.click();

    expect(dismissed).toBe(true);
  });

  it('emits dismiss when the overlay backdrop is clicked', async () => {
    await setUp({ screens: [makeScreen({ id: 's1' })] });
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const backdrop = fixture.nativeElement.querySelector('mns-overlay > div');
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dismissed).toBe(true);
  });
});
