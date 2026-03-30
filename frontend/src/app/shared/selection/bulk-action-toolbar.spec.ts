import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { SelectionService } from './selection.service';
import { BulkActionToolbarComponent, BulkAction } from './bulk-action-toolbar';

try {
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
} catch {
  // already initialized
}

@Component({
  standalone: true,
  imports: [BulkActionToolbarComponent],
  template: `
    <app-bulk-action-toolbar [actions]="actions()" />
  `,
  providers: [SelectionService],
})
class TestHostComponent {
  actions = signal<BulkAction[]>([]);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

describe('BulkActionToolbarComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let service: SelectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    service = fixture.debugElement.injector.get(SelectionService);
    fixture.detectChanges();
  });

  function getToolbar(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.bulk-toolbar');
  }

  function getButtons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.toolbar-actions .btn'),
    );
  }

  function getClearButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.clear-btn');
  }

  function getCountText(): string | null {
    const el = fixture.nativeElement.querySelector('.selection-count');
    return el ? el.textContent.trim() : null;
  }

  it('should be hidden when nothing is selected', () => {
    expect(getToolbar()).toBeNull();
  });

  it('should show when items are selected', () => {
    service.toggle('item-1');
    fixture.detectChanges();
    expect(getToolbar()).not.toBeNull();
  });

  it('should hide after all items are deselected', () => {
    service.toggle('item-1');
    fixture.detectChanges();
    expect(getToolbar()).not.toBeNull();

    service.toggle('item-1');
    fixture.detectChanges();
    expect(getToolbar()).toBeNull();
  });

  it('should display the correct selection count', () => {
    service.selectAll(['a', 'b', 'c']);
    fixture.detectChanges();
    expect(getCountText()).toBe('3 item(s) selected');
  });

  it('should clear selection when clear button is clicked', () => {
    service.toggle('item-1');
    fixture.detectChanges();

    getClearButton()!.click();
    fixture.detectChanges();

    expect(service.hasSelection()).toBe(false);
    expect(getToolbar()).toBeNull();
  });

  it('should render action buttons with correct styling', () => {
    fixture.componentInstance.actions.set([
      { label: 'Delete', variant: 'danger', handler: noop },
      { label: 'Assign', variant: 'default', handler: noop },
    ]);
    service.toggle('item-1');
    fixture.detectChanges();

    const buttons = getButtons();
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Delete');
    expect(buttons[0].classList.contains('btn-danger')).toBe(true);
    expect(buttons[1].textContent).toContain('Assign');
    expect(buttons[1].classList.contains('btn-default')).toBe(true);
  });

  it('should invoke action handler and clear selection on success', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    fixture.componentInstance.actions.set([
      { label: 'Delete', variant: 'danger', handler },
    ]);
    service.selectAll(['a', 'b']);
    fixture.detectChanges();

    const buttons = getButtons();
    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(service.hasSelection()).toBe(false);
  });

  it('should disable buttons while action is in progress', async () => {
    let resolveHandler!: () => void;
    const handler = () =>
      new Promise<void>((resolve) => {
        resolveHandler = resolve;
      });

    fixture.componentInstance.actions.set([
      { label: 'Delete', variant: 'danger', handler },
      { label: 'Assign', variant: 'default', handler: noop },
    ]);
    service.toggle('item-1');
    fixture.detectChanges();

    const buttons = getButtons();
    buttons[0].click();
    fixture.detectChanges();

    // All buttons should be disabled while loading
    const buttonsWhileLoading = getButtons();
    for (const btn of buttonsWhileLoading) {
      expect(btn.disabled).toBe(true);
    }

    // Clear button should also be disabled
    expect(getClearButton()!.disabled).toBe(true);

    // Show spinner
    const spinner = fixture.nativeElement.querySelector('.spinner');
    expect(spinner).not.toBeNull();

    // Selection count should still be visible
    expect(getCountText()).toBe('1 item(s) selected');

    // Resolve the action
    resolveHandler();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should re-enable buttons after action fails', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('fail'));
    fixture.componentInstance.actions.set([
      { label: 'Delete', variant: 'danger', handler },
    ]);
    service.selectAll(['a', 'b']);
    fixture.detectChanges();

    const buttons = getButtons();
    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();

    // Selection should NOT be cleared on failure
    expect(service.hasSelection()).toBe(true);
    // Toolbar should still be visible with buttons enabled
    expect(getToolbar()).not.toBeNull();
    const buttonsAfter = getButtons();
    expect(buttonsAfter[0].disabled).toBe(false);
  });

  it('should respect action disabled signal', () => {
    const actionDisabled = signal(true);
    fixture.componentInstance.actions.set([
      {
        label: 'Delete',
        variant: 'danger',
        handler: noop,
        disabled: actionDisabled,
      },
    ]);
    service.toggle('item-1');
    fixture.detectChanges();

    const buttons = getButtons();
    expect(buttons[0].disabled).toBe(true);

    actionDisabled.set(false);
    fixture.detectChanges();
    expect(getButtons()[0].disabled).toBe(false);
  });
});
