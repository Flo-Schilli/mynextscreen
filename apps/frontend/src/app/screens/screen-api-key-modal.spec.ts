import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenApiKeyModal } from './screen-api-key-modal';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('ScreenApiKeyModal', () => {
  let fixture: ComponentFixture<ScreenApiKeyModal>;

  async function setUp(apiKey = 'super-secret-key'): Promise<void> {
    fixture = TestBed.createComponent(ScreenApiKeyModal);
    fixture.componentRef.setInput('apiKey', apiKey);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function byText(text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders the supplied API key', async () => {
    await setUp('abc-123');

    const value = fixture.debugElement.query(By.css('.api-key-value'));
    expect(value.nativeElement.textContent.trim()).toBe('abc-123');
  });

  it('shows "Copy" before the key has been copied', async () => {
    await setUp();

    expect(byText('Copy')).toBeTruthy();
    expect(byText('Copied!')).toBeUndefined();
  });

  it('writes the key to the clipboard and flips the button to "Copied!" on copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    await setUp('clip-me');

    fixture.debugElement.query(By.css('.btn-copy')).nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith('clip-me');
    expect(byText('Copied!')).toBeTruthy();
  });

  it('emits dismiss when the Done button is clicked', async () => {
    await setUp();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    byText('Done').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay backdrop is clicked', async () => {
    await setUp();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    fixture.debugElement.query(By.css('.modal-overlay')).nativeElement.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not emit dismiss when the inner modal is clicked (stopPropagation)', async () => {
    await setUp();
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    fixture.debugElement.query(By.css('.modal')).nativeElement.click();

    expect(spy).not.toHaveBeenCalled();
  });
});
