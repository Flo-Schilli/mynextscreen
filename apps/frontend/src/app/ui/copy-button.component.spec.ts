import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import { CopyButtonComponent } from './copy-button.component';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('CopyButtonComponent', () => {
  let fixture: ComponentFixture<CopyButtonComponent>;
  let writeText: ReturnType<typeof vi.fn>;

  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  async function click(): Promise<void> {
    button().click();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({
      imports: [CopyButtonComponent, getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(CopyButtonComponent);
    fixture.componentRef.setInput('text', 'setup-code-123');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('has a localized accessible name', () => {
    expect(button().getAttribute('aria-label')).toBe('Kopieren');
  });

  it('copies the text and reports success', async () => {
    const copied = vi.fn();
    fixture.componentInstance.copied.subscribe(copied);

    await click();

    expect(writeText).toHaveBeenCalledWith('setup-code-123');
    expect(copied).toHaveBeenCalledTimes(1);
    expect(button().classList).toContain('text-online');
  });

  it('reports a refused clipboard without showing the check mark', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const failed = vi.fn();
    fixture.componentInstance.copyFailed.subscribe(failed);

    await click();

    expect(failed).toHaveBeenCalledTimes(1);
    expect(button().classList).not.toContain('text-online');
  });
});
