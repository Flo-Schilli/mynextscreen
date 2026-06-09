import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupEditModal } from './screen-group-edit-modal';
import { ScreenGroup, UpdateScreenGroupRequest } from './screen-group.model';

async function flush(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
  await fixture.whenStable();
  fixture.detectChanges();
}

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: 'org1',
    name: 'Lobby',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
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
      imports: [ScreenGroupEditModal],
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

  function setField(key: string, value: string | number): void {
    (component as unknown as Record<string, unknown>)[key] = value;
  }

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  it('seeds the name and mode fields from the group input on init', async () => {
    await setUp(makeGroup({ name: 'Main Hall', mode: 'mirror' }));

    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('#editName');
    expect(nameInput.value).toBe('Main Hall');
    expect(fixture.nativeElement.querySelector('#editGridColumns')).toBeNull();
  });

  it('seeds grid dimensions and renders grid inputs for a split group', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 4, gridRows: 3 }));

    const cols: HTMLInputElement = fixture.nativeElement.querySelector('#editGridColumns');
    const rows: HTMLInputElement = fixture.nativeElement.querySelector('#editGridRows');
    expect(cols.value).toBe('4');
    expect(rows.value).toBe('3');
  });

  it('falls back to default grid dimensions when the group has none', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: null, gridRows: null }));

    const cols: HTMLInputElement = fixture.nativeElement.querySelector('#editGridColumns');
    const rows: HTMLInputElement = fixture.nativeElement.querySelector('#editGridRows');
    expect(cols.value).toBe('2');
    expect(rows.value).toBe('2');
  });

  it('does not emit and shows a local error when name is cleared', async () => {
    await setUp();
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setField('name', '');
    submit();
    await flush(fixture);

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Name is required.',
    );
  });

  it('emits a mirror update without grid dimensions', async () => {
    await setUp(makeGroup({ name: 'Lobby', mode: 'mirror' }));
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setField('name', 'Lobby Renamed');
    submit();
    await flush(fixture);

    expect(emitted).toEqual({ name: 'Lobby Renamed', mode: 'mirror' });
  });

  it('blocks submit when split grid dimensions are zero', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setField('gridColumns', 0);
    submit();
    await flush(fixture);

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Grid columns and rows are required for split mode.',
    );
  });

  it('emits a split update including the grid dimensions', async () => {
    await setUp(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
    let emitted: UpdateScreenGroupRequest | undefined;
    component.save.subscribe((v) => (emitted = v));

    setField('name', 'Wall');
    setField('gridColumns', 5);
    setField('gridRows', 4);
    submit();
    await flush(fixture);

    expect(emitted).toEqual({ name: 'Wall', mode: 'split', gridColumns: 5, gridRows: 4 });
  });

  it('renders the parent-provided error', async () => {
    await setUp(makeGroup(), false, 'Update failed');

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain('Update failed');
  });

  it('disables the submit button and shows a busy label while saving', async () => {
    await setUp(makeGroup(), true);

    const submitBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent?.trim()).toBe('Saving...');
  });

  it('emits dismiss when Cancel is clicked', async () => {
    await setUp();
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();

    expect(dismissed).toBe(true);
  });

  it('emits dismiss when the overlay is clicked', async () => {
    await setUp();
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    expect(dismissed).toBe(true);
  });
});
