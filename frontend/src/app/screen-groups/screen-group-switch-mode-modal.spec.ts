import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGroupSwitchModeModal } from './screen-group-switch-mode-modal';
import { ScreenGroupMode } from './screen-group.model';

async function flush(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ScreenGroupSwitchModeModal', () => {
  let fixture: ComponentFixture<ScreenGroupSwitchModeModal>;
  let component: ScreenGroupSwitchModeModal;

  async function setUp(mode: ScreenGroupMode, switching = false, error = ''): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ScreenGroupSwitchModeModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenGroupSwitchModeModal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('switching', switching);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('warns about cleared grid positions when switching split -> mirror', async () => {
    await setUp('split');

    expect(fixture.nativeElement.querySelector('.warning-box').textContent).toContain(
      'Switching from Split to Mirror',
    );
    // No grid inputs in the split (-> mirror) case.
    expect(fixture.nativeElement.querySelector('#switchGridColumns')).toBeNull();
  });

  it('collects grid dimensions when switching mirror -> split', async () => {
    await setUp('mirror');

    expect(fixture.nativeElement.querySelector('.warning-box')).toBeNull();
    expect(fixture.nativeElement.querySelector('#switchGridColumns')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#switchGridRows')).not.toBeNull();
  });

  it('defaults the grid dimension models to 2 in the mirror -> split case', async () => {
    await setUp('mirror');

    const cols: HTMLInputElement = fixture.nativeElement.querySelector('#switchGridColumns');
    const rows: HTMLInputElement = fixture.nativeElement.querySelector('#switchGridRows');
    expect(cols.value).toBe('2');
    expect(rows.value).toBe('2');
    expect(component.gridColumns()).toBe(2);
    expect(component.gridRows()).toBe(2);
  });

  it('writes typed grid dimensions back into the two-way models', async () => {
    await setUp('mirror');

    const cols: HTMLInputElement = fixture.nativeElement.querySelector('#switchGridColumns');
    cols.value = '4';
    cols.dispatchEvent(new Event('input'));
    await flush(fixture);

    expect(component.gridColumns()).toBe(4);
  });

  it('emits confirm when the Confirm Switch button is clicked', async () => {
    await setUp('mirror');
    let confirmed = false;
    component.confirm.subscribe(() => (confirmed = true));

    const confirmBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Confirm Switch',
    ) as HTMLButtonElement;
    confirmBtn.click();

    expect(confirmed).toBe(true);
  });

  it('disables the confirm button and shows a busy label while switching', async () => {
    await setUp('split', true);

    const confirmBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-primary');
    expect(confirmBtn.disabled).toBe(true);
    expect(confirmBtn.textContent?.trim()).toBe('Switching...');
  });

  it('renders the parent-provided error', async () => {
    await setUp('split', false, 'Switch failed');

    expect(fixture.nativeElement.querySelector('.error').textContent).toContain('Switch failed');
  });

  it('emits dismiss when Cancel is clicked', async () => {
    await setUp('split');
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();

    expect(dismissed).toBe(true);
  });

  it('emits dismiss when the overlay is clicked', async () => {
    await setUp('split');
    let dismissed = false;
    component.dismiss.subscribe(() => (dismissed = true));

    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    expect(dismissed).toBe(true);
  });
});
