import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupCreateModal } from './screen-group-create-modal';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import { CreateScreenGroupSubmit } from './screen-group.model';
import { Screen } from '../screens/screen.model';

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Lobby',
    resolution: '1920x1080',
    location: 'Lobby',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScreenGroupCreateModal', () => {
  let fixture: ComponentFixture<ScreenGroupCreateModal>;
  let component: ScreenGroupCreateModal;

  async function setUp(screens: Screen[] = [], creating = false, error = ''): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        ScreenGroupCreateModal,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupCreateModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('availableScreens', screens);
    fixture.componentRef.setInput('creating', creating);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  // Fields are `protected`; reach them via an index signature.
  function field<T>(key: string): T {
    return (component as unknown as Record<string, { set?: (v: unknown) => void; (): T }>)[
      key
    ]() as T;
  }
  function setSignal(key: string, value: unknown): void {
    (component as unknown as Record<string, { set: (v: unknown) => void }>)[key].set(value);
  }

  it('defaults to mirror mode and hides the grid steppers', async () => {
    await setUp();

    expect(field<string>('mode')).toBe('mirror');
    expect(fixture.nativeElement.querySelector('mns-stepper')).toBeNull();
  });

  it('reports invalid until the name has at least two characters', async () => {
    await setUp();
    expect(component.valid()).toBe(false);

    setSignal('name', 'A');
    expect(component.valid()).toBe(false);

    setSignal('name', 'Lobby');
    expect(component.valid()).toBe(true);
  });

  it('does not emit and shows a local error when name is too short', async () => {
    await setUp();
    let emitted: CreateScreenGroupSubmit | undefined;
    component.create.subscribe((v) => (emitted = v));

    component.onSubmit();

    expect(emitted).toBeUndefined();
    expect(field<string>('localError')).toContain('at least 2');
  });

  it('emits a mirror request with colour and selected screens', async () => {
    await setUp([makeScreen({ id: 's1' }), makeScreen({ id: 's2' })]);
    let emitted: CreateScreenGroupSubmit | undefined;
    component.create.subscribe((v) => (emitted = v));

    setSignal('name', 'Lobby Wall');
    setSignal('color', '#0ea5e9');
    component.toggle('s1');
    component.onSubmit();

    expect(emitted).toEqual({
      request: { name: 'Lobby Wall', mode: 'mirror', color: '#0ea5e9', icon: 'Groups' },
      screenIds: ['s1'],
    });
  });

  it('renders grid steppers when split mode is selected', async () => {
    await setUp();

    setSignal('mode', 'split');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('mns-stepper').length).toBe(2);
  });

  it('emits a split request with grid dimensions and no screen ids', async () => {
    await setUp([makeScreen({ id: 's1' })]);
    let emitted: CreateScreenGroupSubmit | undefined;
    component.create.subscribe((v) => (emitted = v));

    setSignal('name', 'Video Wall');
    setSignal('mode', 'split');
    setSignal('cols', 3);
    setSignal('rows', 2);
    component.toggle('s1');
    component.onSubmit();

    expect(emitted).toEqual({
      request: {
        name: 'Video Wall',
        mode: 'split',
        color: '#6d6cf6',
        icon: 'Groups',
        gridColumns: 3,
        gridRows: 2,
      },
      screenIds: [],
    });
  });

  it('toggles a screen selection on and off', async () => {
    await setUp([makeScreen({ id: 's1' })]);

    component.toggle('s1');
    expect(component.isSelected('s1')).toBe(true);

    component.toggle('s1');
    expect(component.isSelected('s1')).toBe(false);
  });

  it('renders the parent-provided error', async () => {
    await setUp([], false, 'Server rejected the request');

    expect(fixture.nativeElement.textContent).toContain('Server rejected the request');
  });

  it('emits dismiss when the overlay backdrop is clicked', async () => {
    await setUp();
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const backdrop = fixture.nativeElement.querySelector('mns-overlay > div');
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(dismissed).toBe(true);
  });
});
