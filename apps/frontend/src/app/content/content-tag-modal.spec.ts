import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentTagModal } from './content-tag-modal';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const flush = async (f: ComponentFixture<unknown>): Promise<void> => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await f.whenStable();
  f.detectChanges();
};

describe('ContentTagModal', () => {
  let fixture: ComponentFixture<ContentTagModal>;

  function setUp(
    opts: { mode?: 'add' | 'remove'; suggestions?: string[]; value?: string } = {},
  ): void {
    fixture = TestBed.createComponent(ContentTagModal);
    fixture.componentRef.setInput('mode', opts.mode ?? 'add');
    fixture.componentRef.setInput('suggestions', opts.suggestions ?? []);
    fixture.componentRef.setInput('value', opts.value ?? '');
    fixture.detectChanges();
  }

  function chips(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.tag-chip'));
  }

  function footerBtns(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[slot="footer"] button'));
  }

  function confirmBtn(): HTMLButtonElement {
    // The confirm button is the second (primary) footer button.
    return footerBtns()[1];
  }

  function cancelBtn(): HTMLButtonElement {
    return footerBtns()[0];
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders the add-mode heading and confirm label', () => {
    // Arrange / Act
    setUp({ mode: 'add' });

    // Assert
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Add Tags');
    expect(confirmBtn().textContent).toContain('Add Tags');
  });

  it('renders the remove-mode heading and confirm label', () => {
    // Arrange / Act
    setUp({ mode: 'remove' });

    // Assert
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Remove Tags');
    expect(confirmBtn().textContent).toContain('Remove Tags');
  });

  it('disables the confirm button when the value is empty or whitespace', () => {
    // Arrange / Act
    setUp({ value: '   ' });

    // Assert
    expect(confirmBtn().disabled).toBe(true);
  });

  it('enables the confirm button once a non-empty value is set', () => {
    // Arrange / Act
    setUp({ value: 'promo' });

    // Assert
    expect(confirmBtn().disabled).toBe(false);
  });

  it('hides the suggestion list when there are no suggestions', () => {
    // Arrange / Act
    setUp({ suggestions: [] });

    // Assert
    expect(fixture.nativeElement.querySelector('.tag-suggestions')).toBeNull();
  });

  it('marks a suggestion chip active when its tag is already in the value', () => {
    // Arrange / Act
    setUp({ suggestions: ['promo', 'summer'], value: 'promo' });

    // Assert
    const active = chips().filter((c) => c.classList.contains('active'));
    expect(active.map((c) => c.textContent?.trim())).toEqual(['promo']);
  });

  it('appends a suggestion to the value when an inactive chip is clicked', () => {
    // Arrange
    setUp({ suggestions: ['promo', 'summer'], value: 'promo' });

    // Act
    fixture.componentInstance.toggleTag('summer');
    fixture.detectChanges();

    // Assert
    expect(fixture.componentInstance.value()).toBe('promo, summer');
  });

  it('removes a suggestion from the value when an active chip is clicked', () => {
    // Arrange
    setUp({ suggestions: ['promo', 'summer'], value: 'promo, summer' });

    // Act
    fixture.componentInstance.toggleTag('promo');
    fixture.detectChanges();

    // Assert
    expect(fixture.componentInstance.value()).toBe('summer');
  });

  it('emits confirm when the enabled confirm button is clicked', () => {
    // Arrange
    setUp({ value: 'promo' });
    const spy = vi.fn();
    fixture.componentInstance.confirm.subscribe(spy);

    // Act
    confirmBtn().click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the Cancel button is clicked', () => {
    // Arrange
    setUp({ value: 'promo' });
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act
    cancelBtn().click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the overlay backdrop is clicked', () => {
    // Arrange
    setUp({ value: 'promo' });
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    // Act: click the overlay backdrop (the mns-overlay dialog element)
    const overlay: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    overlay.click();

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('two-way binds the text input back into the value model', async () => {
    // Arrange
    setUp({ value: '' });
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#bulkTagInput');

    // Act
    input.value = 'newtag';
    input.dispatchEvent(new Event('input'));
    await flush(fixture);

    // Assert
    expect(fixture.componentInstance.value()).toBe('newtag');
  });
});
