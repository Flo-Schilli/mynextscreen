import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentFormatService } from './content-format.service';
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

describe('ContentFormatService', () => {
  let service: ContentFormatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ContentFormatService],
    });
    service = TestBed.inject(ContentFormatService);
  });

  describe('formatBytes', () => {
    it('returns "0 B" for zero', () => {
      expect(service.formatBytes(0)).toBe('0 B');
    });

    it('returns "Unlimited" for non-finite input', () => {
      expect(service.formatBytes(Infinity)).toBe('Unlimited');
    });

    it('formats bytes without decimals', () => {
      expect(service.formatBytes(512)).toBe('512 B');
    });

    it('formats kilobytes with one decimal', () => {
      expect(service.formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats megabytes with one decimal', () => {
      expect(service.formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    });

    it('formats gigabytes with one decimal', () => {
      expect(service.formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
    });
  });

  describe('formatDate', () => {
    it('produces a localized string containing the year', () => {
      const formatted = service.formatDate('2026-06-07T13:45:00Z');
      expect(formatted).toContain('2026');
    });
  });

  describe('originalPercent / transcodedPercent', () => {
    it('returns 0 when storage is null', () => {
      expect(service.originalPercent(null)).toBe(0);
      expect(service.transcodedPercent(null)).toBe(0);
    });

    it('returns 0 for both when nothing is used and no limits set', () => {
      const storage = makeStorage();
      expect(service.originalPercent(storage)).toBe(0);
      expect(service.transcodedPercent(storage)).toBe(0);
    });

    it('splits proportionally by usage when no limits are configured', () => {
      const storage = makeStorage({ originalUsedBytes: 75, transcodedUsedBytes: 25 });
      expect(service.originalPercent(storage)).toBe(75);
      expect(service.transcodedPercent(storage)).toBe(25);
    });

    it('computes percentages against the combined limit when limits are set', () => {
      const storage = makeStorage({
        originalUsedBytes: 25,
        originalLimitBytes: 100,
        transcodedUsedBytes: 50,
        transcodedLimitBytes: 100,
      });
      // combined limit = 200
      expect(service.originalPercent(storage)).toBeCloseTo(12.5);
      expect(service.transcodedPercent(storage)).toBeCloseTo(25);
    });
  });
});
