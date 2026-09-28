import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ThemeService } from './theme.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const STORAGE_KEY = 'mynextscreen_theme';

function createService(): ThemeService {
  // Service is instantiated lazily on inject, so localStorage must already be set.
  const svc = TestBed.inject(ThemeService);
  // Flush pending effects so data-theme/data-accent/data-density are written to the DOM.
  TestBed.flushEffects();
  return svc;
}

function getDataTheme(): string | undefined {
  return document.documentElement.dataset['theme'];
}

describe('ThemeService', () => {
  beforeEach(() => {
    // Arrange: ensure a clean environment before each test (constructor reads localStorage)
    localStorage.clear();
    // Reset data attributes to avoid state leaking between tests
    delete document.documentElement.dataset['theme'];
    delete document.documentElement.dataset['accent'];
    delete document.documentElement.dataset['density'];
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    delete document.documentElement.dataset['accent'];
    delete document.documentElement.dataset['density'];
  });

  describe('initialization', () => {
    it('defaults to dark mode when nothing is stored', () => {
      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(service.theme()).toBe('dark');
      expect(getDataTheme()).toBe('dark');
    });

    it('starts in light mode and sets data-theme="light" when "light" is stored', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'light');

      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(false);
      expect(service.theme()).toBe('light');
      expect(getDataTheme()).toBe('light');
    });

    it('stays in dark mode when "dark" is stored', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'dark');

      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(service.theme()).toBe('dark');
      expect(getDataTheme()).toBe('dark');
    });

    it('ignores unrecognized stored values and defaults to dark mode', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'sepia');

      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(service.theme()).toBe('dark');
      expect(getDataTheme()).toBe('dark');
    });
  });

  describe('toggle', () => {
    it('switches from dark to light, sets data-theme="light", and persists "light"', () => {
      // Arrange
      const service = createService();

      // Act
      service.toggle();
      TestBed.flushEffects();

      // Assert
      expect(service.isDark()).toBe(false);
      expect(service.theme()).toBe('light');
      expect(getDataTheme()).toBe('light');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    });

    it('switches from light back to dark, sets data-theme="dark", and persists "dark"', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'light');
      const service = createService();

      // Act
      service.toggle();
      TestBed.flushEffects();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(service.theme()).toBe('dark');
      expect(getDataTheme()).toBe('dark');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    it('toggles back and forth restoring the original state after two calls', () => {
      // Arrange
      const service = createService();

      // Act
      service.toggle();
      service.toggle();
      TestBed.flushEffects();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(service.theme()).toBe('dark');
      expect(getDataTheme()).toBe('dark');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });
  });

  describe('setAccent', () => {
    it('defaults to indigo', () => {
      const service = createService();
      expect(service.accent()).toBe('indigo');
      expect(document.documentElement.dataset['accent']).toBe('indigo');
    });

    it('updates the accent and mirrors it to data-accent', () => {
      const service = createService();
      service.setAccent('teal');
      TestBed.flushEffects();
      expect(service.accent()).toBe('teal');
      expect(document.documentElement.dataset['accent']).toBe('teal');
      expect(localStorage.getItem('mynextscreen_accent')).toBe('teal');
    });
  });

  describe('setDensity', () => {
    it('defaults to regular', () => {
      const service = createService();
      expect(service.density()).toBe('regular');
      expect(document.documentElement.dataset['density']).toBe('regular');
    });

    it('updates the density and mirrors it to data-density', () => {
      const service = createService();
      service.setDensity('compact');
      TestBed.flushEffects();
      expect(service.density()).toBe('compact');
      expect(document.documentElement.dataset['density']).toBe('compact');
      expect(localStorage.getItem('mynextscreen_density')).toBe('compact');
    });
  });
});
