import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PlaylistFormatService } from './playlist-format.service';
import { PlaylistItem } from './playlist.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeItem(durationSeconds: number): PlaylistItem {
  return {
    id: 'i' + durationSeconds,
    playlistId: 'p1',
    contentId: 'c1',
    position: 0,
    durationSeconds,
    transition: 'fade',
    transitionDurationMs: 500,
  };
}

describe('PlaylistFormatService', () => {
  let service: PlaylistFormatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection(), PlaylistFormatService],
    });
    service = TestBed.inject(PlaylistFormatService);
  });

  describe('totalDurationSeconds', () => {
    it('returns 0 for undefined items', () => {
      expect(service.totalDurationSeconds(undefined)).toBe(0);
    });

    it('returns 0 for an empty list', () => {
      expect(service.totalDurationSeconds([])).toBe(0);
    });

    it('sums per-item durations', () => {
      expect(service.totalDurationSeconds([makeItem(10), makeItem(20), makeItem(5)])).toBe(35);
    });
  });

  describe('formatDuration', () => {
    it('formats sub-minute durations as seconds', () => {
      expect(service.formatDuration(45)).toBe('45s');
    });

    it('formats whole minutes without seconds', () => {
      expect(service.formatDuration(180)).toBe('3m');
    });

    it('formats minutes with remaining seconds', () => {
      expect(service.formatDuration(200)).toBe('3m 20s');
    });

    it('formats whole hours without minutes', () => {
      expect(service.formatDuration(3600)).toBe('1h');
    });

    it('formats hours with remaining minutes', () => {
      expect(service.formatDuration(3900)).toBe('1h 5m');
    });
  });

  describe('formatDate', () => {
    it('produces a localized date string', () => {
      expect(typeof service.formatDate('2026-06-07T00:00:00Z')).toBe('string');
      expect(service.formatDate('2026-06-07T00:00:00Z').length).toBeGreaterThan(0);
    });
  });
});
