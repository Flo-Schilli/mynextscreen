import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentStorageBar } from './content-storage-bar';
import { StorageInfo } from './content.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeStorage(overrides: Partial<StorageInfo> = {}): StorageInfo {
  return {
    originalUsedBytes: 0,
    originalLimitBytes: 0,
    transcodedUsedBytes: 0,
    transcodedLimitBytes: 0,
    ...overrides,
  };
}

describe('ContentStorageBar', () => {
  let fixture: ComponentFixture<ContentStorageBar>;

  function setUp(storage: StorageInfo): void {
    fixture = TestBed.createComponent(ContentStorageBar);
    fixture.componentRef.setInput('storage', storage);
    fixture.detectChanges();
  }

  function originalBar(): HTMLElement {
    return fixture.nativeElement.querySelector('.storage-bar-original');
  }

  function transcodedBar(): HTMLElement {
    return fixture.nativeElement.querySelector('.storage-bar-transcoded');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders combined used bytes without a limit suffix when no limits are set', () => {
    // Arrange / Act
    setUp(makeStorage({ originalUsedBytes: 1024, transcodedUsedBytes: 1024 }));

    // Assert
    const values = fixture.nativeElement.querySelector('.storage-values').textContent as string;
    expect(values).toContain('2.0 KB');
    expect(values).not.toContain('/');
  });

  it('renders a "used / limit" suffix when an original limit is configured', () => {
    // Arrange / Act
    setUp(
      makeStorage({
        originalUsedBytes: 1024,
        originalLimitBytes: 4096,
        transcodedUsedBytes: 0,
        transcodedLimitBytes: 0,
      }),
    );

    // Assert: limit segment renders. transcoded limit is 0 -> Infinity, so the
    // combined limit formats to "Unlimited" via the format service.
    const values = fixture.nativeElement.querySelector('.storage-values').textContent as string;
    expect(values).toContain('/');
    expect(values).toContain('Unlimited');
  });

  it('splits the bar proportionally by usage when no limits are configured', () => {
    // Arrange / Act: 75% original, 25% transcoded by usage
    setUp(makeStorage({ originalUsedBytes: 750, transcodedUsedBytes: 250 }));

    // Assert
    expect(originalBar().style.width).toBe('75%');
    expect(transcodedBar().style.width).toBe('25%');
    expect(transcodedBar().style.left).toBe('75%');
  });

  it('sizes the bar against the combined limit when limits are configured', () => {
    // Arrange / Act: combined limit 1000, original used 200 (20%), transcoded 100 (10%)
    setUp(
      makeStorage({
        originalUsedBytes: 200,
        originalLimitBytes: 600,
        transcodedUsedBytes: 100,
        transcodedLimitBytes: 400,
      }),
    );

    // Assert
    expect(originalBar().style.width).toBe('20%');
    expect(transcodedBar().style.width).toBe('10%');
    expect(transcodedBar().style.left).toBe('20%');
  });

  it('renders zero-width segments when nothing is used and no limits exist', () => {
    // Arrange / Act
    setUp(makeStorage());

    // Assert
    expect(originalBar().style.width).toBe('0%');
    expect(transcodedBar().style.width).toBe('0%');
  });

  it('shows the per-segment legend with formatted original and transcoded usage', () => {
    // Arrange / Act
    setUp(makeStorage({ originalUsedBytes: 2048, transcodedUsedBytes: 1024 }));

    // Assert
    const legend = fixture.nativeElement.querySelector('.storage-legend').textContent as string;
    expect(legend).toContain('Original (2.0 KB)');
    expect(legend).toContain('Transcoded (1.0 KB)');
  });
});
