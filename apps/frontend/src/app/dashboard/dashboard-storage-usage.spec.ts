import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DashboardStorageUsage } from './dashboard-storage-usage';
import { StorageInfo } from '../content/content.model';

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

describe('DashboardStorageUsage', () => {
  let fixture: ComponentFixture<DashboardStorageUsage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardStorageUsage],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardStorageUsage);
  });

  function setStorage(storage: StorageInfo): void {
    fixture.componentRef.setInput('storage', storage);
    fixture.detectChanges();
  }

  describe('percent computations', () => {
    it('returns 0 for originals when the limit is zero', () => {
      // Arrange & Act
      setStorage(makeStorage({ originalUsedBytes: 500, originalLimitBytes: 0 }));

      // Assert
      expect(fixture.componentInstance.originalPercent()).toBe(0);
    });

    it('returns 0 for transcoded when the limit is zero', () => {
      // Arrange & Act
      setStorage(makeStorage({ transcodedUsedBytes: 500, transcodedLimitBytes: 0 }));

      // Assert
      expect(fixture.componentInstance.transcodedPercent()).toBe(0);
    });

    it('computes the ratio as a percentage', () => {
      // Arrange & Act
      setStorage(
        makeStorage({
          originalUsedBytes: 250,
          originalLimitBytes: 1000,
          transcodedUsedBytes: 750,
          transcodedLimitBytes: 1000,
        }),
      );

      // Assert
      expect(fixture.componentInstance.originalPercent()).toBe(25);
      expect(fixture.componentInstance.transcodedPercent()).toBe(75);
    });

    it('clamps to 100 when usage exceeds the limit', () => {
      // Arrange & Act
      setStorage(
        makeStorage({
          originalUsedBytes: 2000,
          originalLimitBytes: 1000,
          transcodedUsedBytes: 5000,
          transcodedLimitBytes: 1000,
        }),
      );

      // Assert
      expect(fixture.componentInstance.originalPercent()).toBe(100);
      expect(fixture.componentInstance.transcodedPercent()).toBe(100);
    });
  });

  describe('byte formatting', () => {
    it('formats zero bytes', () => {
      // Arrange & Act
      setStorage(makeStorage());

      // Assert
      const values = fixture.debugElement
        .queryAll(By.css('.storage-value'))
        .map((el) => (el.nativeElement as HTMLElement).textContent?.trim());
      expect(values[0]).toContain('0 B');
    });

    it('formats KB, MB and GB with one decimal', () => {
      // Arrange & Act
      setStorage(
        makeStorage({
          originalUsedBytes: 1536, // 1.5 KB
          originalLimitBytes: 1024 * 1024 * 5, // 5.0 MB
          transcodedUsedBytes: 1024 * 1024 * 1024 * 2, // 2.0 GB
          transcodedLimitBytes: 1024 * 1024 * 1024 * 4, // 4.0 GB
        }),
      );

      // Assert
      const values = fixture.debugElement
        .queryAll(By.css('.storage-value'))
        .map((el) => (el.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim());
      expect(values[0]).toBe('1.5 KB / 5.0 MB');
      expect(values[1]).toBe('2.0 GB / 4.0 GB');
    });
  });

  describe('threshold classes', () => {
    it('applies neither warning nor danger at or below 80%', () => {
      // Arrange & Act
      setStorage(makeStorage({ originalUsedBytes: 80, originalLimitBytes: 100 }));

      // Assert
      const bar = fixture.debugElement.queryAll(By.css('.storage-bar'))[0]
        .nativeElement as HTMLElement;
      expect(bar.classList.contains('warning')).toBe(false);
      expect(bar.classList.contains('danger')).toBe(false);
    });

    it('applies the warning class between 80% and 95%', () => {
      // Arrange & Act
      setStorage(makeStorage({ originalUsedBytes: 90, originalLimitBytes: 100 }));

      // Assert
      const bar = fixture.debugElement.queryAll(By.css('.storage-bar'))[0]
        .nativeElement as HTMLElement;
      expect(bar.classList.contains('warning')).toBe(true);
      expect(bar.classList.contains('danger')).toBe(false);
    });

    it('applies the danger class above 95%', () => {
      // Arrange & Act
      setStorage(makeStorage({ originalUsedBytes: 99, originalLimitBytes: 100 }));

      // Assert
      const bar = fixture.debugElement.queryAll(By.css('.storage-bar'))[0]
        .nativeElement as HTMLElement;
      expect(bar.classList.contains('danger')).toBe(true);
      expect(bar.classList.contains('warning')).toBe(false);
    });

    it('renders the raw fill width and the rounded percent label', () => {
      // Arrange: 30% is exactly representable, label rounds to one decimal.
      setStorage(makeStorage({ originalUsedBytes: 300, originalLimitBytes: 1000 }));

      // Assert: width binds the raw computed percent ...
      const fill = fixture.debugElement.query(By.css('.storage-fill.originals'))
        .nativeElement as HTMLElement;
      expect(fill.style.width).toBe('30%');

      // ... while the label uses toFixed(1).
      const percent = fixture.debugElement.queryAll(By.css('.storage-percent'))[0]
        .nativeElement as HTMLElement;
      expect(percent.textContent?.trim()).toBe('30.0%');
    });
  });
});
