import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastService } from './toast.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with an empty queue', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('should add a success toast', () => {
    service.success('Saved.');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('Saved.');
  });

  it('should add an error toast', () => {
    service.error('Boom.');
    expect(service.toasts()[0].type).toBe('error');
  });

  it('should add an info toast', () => {
    service.info('FYI.');
    expect(service.toasts()[0].type).toBe('info');
  });

  it('should assign unique incrementing ids', () => {
    const first = service.success('a');
    const second = service.success('b');
    expect(first).not.toBe(second);
    const [a, b] = service.toasts();
    expect(a.id).toBe(first);
    expect(b.id).toBe(second);
  });

  it('should stack multiple toasts in order', () => {
    service.success('a');
    service.error('b');
    expect(service.toasts().map((t) => t.message)).toEqual(['a', 'b']);
  });

  it('should auto-dismiss after the default duration', () => {
    service.success('a');
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(4000);
    expect(service.toasts().length).toBe(0);
  });

  it('should keep an error toast longer than a success toast', () => {
    service.success('ok');
    service.error('bad');
    vi.advanceTimersByTime(4000);
    const remaining = service.toasts();
    expect(remaining.length).toBe(1);
    expect(remaining[0].message).toBe('bad');
    vi.advanceTimersByTime(2000);
    expect(service.toasts().length).toBe(0);
  });

  it('should not auto-dismiss when duration is 0', () => {
    service.show('info', 'sticky', 0);
    vi.advanceTimersByTime(60_000);
    expect(service.toasts().length).toBe(1);
  });

  it('should dismiss a toast by id', () => {
    const id = service.success('a');
    service.success('b');
    service.dismiss(id);
    expect(service.toasts().map((t) => t.message)).toEqual(['b']);
  });

  it('should be a no-op when dismissing an unknown id', () => {
    service.success('a');
    service.dismiss(999);
    expect(service.toasts().length).toBe(1);
  });

  it('should not fire the timer after a manual dismiss', () => {
    const id = service.success('a');
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
    // advancing should not throw or re-touch state
    vi.advanceTimersByTime(4000);
    expect(service.toasts().length).toBe(0);
  });

  it('should clear all toasts and their timers', () => {
    service.success('a');
    service.error('b');
    service.clear();
    expect(service.toasts().length).toBe(0);
    vi.advanceTimersByTime(6000);
    expect(service.toasts().length).toBe(0);
  });
});
