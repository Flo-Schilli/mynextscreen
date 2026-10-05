import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupEditModal } from './screen-group-edit-modal';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import { ScreenGroup, UpdateScreenGroupRequest } from './screen-group.model';

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: 'org1',
    name: 'Lobby',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    color: '#6d6cf6',
    icon: 'Groups',
    screens: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ScreenGroupEditModal', () => {
  let fixture: ComponentFixture<ScreenGroupEditModal>;
  let component: ScreenGroupEditModal;

  async function setUp(
    group: ScreenGroup = makeGroup(),
    saving = false,
    error = '',
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        ScreenGroupEditModal,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupEditModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('saving', saving);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function field<T>(key: string): T {
    return (component as unknown as Record<string, () => T>)[key]();
  }
  function setSignal(key: string, value: unknown): void {
    (component as unknown as Record<string, { set: (v: unknown) => void }>)[key].set(value);
  }

  it('seeds name, colour and mode from the group input on init', async () => {
    await setUp(makeGroup({ name: 'Main Hall', mode: 'mirror', color: '#ec4899' }));

    expect(field<string>('name')).toBe('Main Hall');
    expect(field<string>('color')).toBe('#ec4899');
    expect(field<string>('mode')).toBe('mirror');
    expect(fixture.nativeElement.querySelector('mns-stepper')).toBeNull();
  });

  it('seeds grid dimensions and renders steppers for a split group', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 4, gridRows: 3 }));

    expect(field<number>('cols')).toBe(4);
    expect(field<number>('rows')).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('mns-stepper').length).toBe(2);
  });

  it('falls back to default grid dimensions when the group has none', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: null, gridRows: null }));

    expect(field<number>('cols')).toBe(2);
    expect(field<number>('rows')).toBe(2);
  });

  it('does not emit and shows a local error when name is cleared', async () => {
    await setUp();
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setSignal('name', '');
    component.onSubmit();

    expect(emitted).toBeUndefined();
    expect(field<string>('localError')).toContain('Name is required.');
  });

  it('emits a mirror update with colour and without grid dimensions', async () => {
    await setUp(makeGroup({ name: 'Lobby', mode: 'mirror' }));
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setSignal('name', 'Lobby Renamed');
    setSignal('color', '#10b981');
    component.onSubmit();

    expect(emitted).toEqual({ name: 'Lobby Renamed', mode: 'mirror', color: '#10b981' });
  });

  it('emits a split update including the grid dimensions', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setSignal('name', 'Wall');
    setSignal('cols', 4);
    setSignal('rows', 3);
    component.onSubmit();

    expect(emitted).toEqual({
      name: 'Wall',
      mode: 'split',
      color: '#6d6cf6',
      gridColumns: 4,
      gridRows: 3,
    });
  });

  it('renders the parent-provided error', async () => {
    await setUp(makeGroup(), false, 'Update failed');

    expect(fixture.nativeElement.textContent).toContain('Update failed');
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
