import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastContainer } from './toast-container';
import { ToastService } from './toast.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('ToastContainer', () => {
  let fixture: ComponentFixture<ToastContainer>;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ToastService],
    });
    fixture = TestBed.createComponent(ToastContainer);
    toasts = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  function renderedToasts(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.toast'));
  }

  it('should render nothing when the queue is empty', () => {
    expect(renderedToasts().length).toBe(0);
  });

  it('should render a toast with its message and type class', () => {
    toasts.error('Something failed.');
    fixture.detectChanges();
    const rendered = renderedToasts();
    expect(rendered.length).toBe(1);
    expect(rendered[0].classList).toContain('toast-error');
    expect(rendered[0].textContent).toContain('Something failed.');
  });

  it('should render multiple stacked toasts', () => {
    toasts.success('a');
    toasts.info('b');
    fixture.detectChanges();
    expect(renderedToasts().length).toBe(2);
  });

  it('should dismiss a toast when its close button is clicked', () => {
    toasts.success('a');
    fixture.detectChanges();
    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.toast-close');
    closeBtn.click();
    fixture.detectChanges();
    expect(renderedToasts().length).toBe(0);
    expect(toasts.toasts().length).toBe(0);
  });
});
