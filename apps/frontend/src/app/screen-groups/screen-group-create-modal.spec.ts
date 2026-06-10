import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupCreateModal } from './screen-group-create-modal';
import { CreateScreenGroupRequest } from './screen-group.model';

/**
 * Zoneless async flush helper: ngModel write-back and `@if` re-evaluation are
 * not auto-ticked, so drain the microtask queue and stabilise before reading.
 */
async function flush(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ScreenGroupCreateModal', () => {
  let fixture: ComponentFixture<ScreenGroupCreateModal>;
  let component: ScreenGroupCreateModal;

  async function setUp(creating = false, error = ''): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupCreateModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupCreateModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('creating', creating);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  // The form fields are `protected`, so reach them through an index signature
  // rather than `keyof` (which only sees public members).
  function setField(key: string, value: string | number): void {
    (component as unknown as Record<string, unknown>)[key] = value;
  }

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  it('defaults to mirror mode and hides the grid inputs', async () => {
    await setUp();

    expect(fixture.nativeElement.querySelector('#createGridColumns')).toBeNull();
    expect(fixture.nativeElement.querySelector('#createGridRows')).toBeNull();
  });

  it('does not emit and shows a local error when name is missing', async () => {
    await setUp();
    let emitted: CreateScreenGroupRequest | undefined;
    component.create.subscribe((v) => (emitted = v));

    submit();
    await flush(fixture);

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Name is required.',
    );
  });

  it('emits a mirror request without grid dimensions when name is filled', async () => {
    await setUp();
    let emitted: CreateScreenGroupRequest | undefined;
    component.create.subscribe((v) => (emitted = v));

    setField('name', 'Lobby Wall');
    submit();
    await flush(fixture);

    expect(emitted).toEqual({ name: 'Lobby Wall', mode: 'mirror' });
  });

  it('renders grid inputs when split mode is selected', async () => {
    await setUp();

    setField('mode', 'split');
    fixture.detectChanges();
    await flush(fixture);

    expect(fixture.nativeElement.querySelector('#createGridColumns')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#createGridRows')).not.toBeNull();
  });

  it('blocks submit and shows an error when split grid dimensions are zero', async () => {
    await setUp();
    let emitted: CreateScreenGroupRequest | undefined;
    component.create.subscribe((v) => (emitted = v));

    setField('name', 'Wall');
    setField('mode', 'split');
    setField('gridColumns', 0);
    setField('gridRows', 0);
    submit();
    await flush(fixture);

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Grid columns and rows are required for split mode.',
    );
  });

  it('emits a split request including the grid dimensions', async () => {
    await setUp();
    let emitted: CreateScreenGroupRequest | undefined;
    component.create.subscribe((v) => (emitted = v));

    setField('name', 'Video Wall');
    setField('mode', 'split');
    setField('gridColumns', 3);
    setField('gridRows', 2);
    submit();
    await flush(fixture);

    expect(emitted).toEqual({
      name: 'Video Wall',
      mode: 'split',
      gridColumns: 3,
      gridRows: 2,
    });
  });

  it('clears a previous local error once a valid submit succeeds', async () => {
    await setUp();

    submit();
    await flush(fixture);
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Name is required.',
    );

    setField('name', 'Now Valid');
    submit();
    await flush(fixture);

    expect(fixture.nativeElement.querySelector('.error')).toBeNull();
  });

  it('renders the parent-provided error when no local error is set', async () => {
    await setUp(false, 'Server rejected the request');

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'Server rejected the request',
    );
  });

  it('disables the submit button and shows a busy label while creating', async () => {
    await setUp(true);

    const submitBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
    expect(submitBtn.textContent?.trim()).toBe('Creating...');
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
