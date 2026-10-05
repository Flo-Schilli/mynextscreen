import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { BulkConfirmDialogComponent } from './bulk-confirm-dialog';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

@Component({
  standalone: true,
  imports: [BulkConfirmDialogComponent],
  template: `
    @if (show()) {
      <app-bulk-confirm-dialog
        [title]="title()"
        [message]="message()"
        [confirmLabel]="confirmLabel()"
        [itemCount]="itemCount()"
        (confirmed)="onConfirmed($event)"
      />
    }
  `,
})
class TestHostComponent {
  show = signal(true);
  title = signal('Delete Items');
  message = signal('You are about to permanently delete 5 items. This cannot be undone.');
  confirmLabel = signal('Delete');
  itemCount = signal(5);

  lastResult: boolean | null = null;

  onConfirmed(value: boolean): void {
    this.lastResult = value;
    this.show.set(false);
  }
}

describe('BulkConfirmDialogComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getOverlay(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.modal-overlay');
  }

  function getModal(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.modal');
  }

  function getConfirmButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.btn-danger');
  }

  function getCancelButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.btn-secondary');
  }

  it('should render the dialog with title and message', () => {
    const modal = getModal();
    expect(modal).toBeTruthy();
    expect(modal!.querySelector('h2')!.textContent).toContain('Delete Items');
    expect(modal!.querySelector('p')!.textContent).toContain(
      'You are about to permanently delete 5 items.',
    );
  });

  it('should use custom confirm label', () => {
    host.confirmLabel.set('Remove');
    fixture.detectChanges();
    expect(getConfirmButton()!.textContent!.trim()).toBe('Remove');
  });

  it('should have danger-styled confirm button', () => {
    expect(getConfirmButton()!.classList.contains('btn-danger')).toBe(true);
  });

  it('confirm resolves true', () => {
    getConfirmButton()!.click();
    fixture.detectChanges();
    expect(host.lastResult).toBe(true);
  });

  it('cancel resolves false', () => {
    getCancelButton()!.click();
    fixture.detectChanges();
    expect(host.lastResult).toBe(false);
  });

  it('clicking overlay resolves false', () => {
    getOverlay()!.click();
    fixture.detectChanges();
    expect(host.lastResult).toBe(false);
  });

  it('escape key resolves false', () => {
    getOverlay()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(host.lastResult).toBe(false);
  });

  it('should set aria-modal and role on overlay', () => {
    const overlay = getOverlay()!;
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.getAttribute('aria-label')).toBe('Delete Items');
  });

  it('should focus the modal content on init', () => {
    const modal = getModal()!;
    expect(document.activeElement).toBe(modal);
  });

  it('createPromise helper resolves true', async () => {
    const { promise, resolve } = BulkConfirmDialogComponent.createPromise();
    resolve(true);
    expect(await promise).toBe(true);
  });

  it('createPromise helper resolves false', async () => {
    const { promise, resolve } = BulkConfirmDialogComponent.createPromise();
    resolve(false);
    expect(await promise).toBe(false);
  });
});
