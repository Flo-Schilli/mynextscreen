import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ThemeService } from './theme.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const STORAGE_KEY = 'signage_theme';

function createService(): ThemeService {
  // Service is instantiated lazily on inject, so localStorage must already be set.
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  beforeEach(() => {
    // Arrange: ensure a clean environment before each test (constructor reads localStorage)
    localStorage.clear();
    document.documentElement.classList.remove('light');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light');
  });

  describe('initialization', () => {
    it('defaults to dark mode when nothing is stored', () => {
      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('starts in light mode and adds the light class when "light" is stored', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'light');

      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('stays in dark mode and does not add the light class when "dark" is stored', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'dark');

      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('ignores unrecognized stored values and stays in dark mode', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'sepia');

      // Act
      const service = createService();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('switches from dark to light, adds the light class, and persists "light"', () => {
      // Arrange
      const service = createService();

      // Act
      service.toggle();

      // Assert
      expect(service.isDark()).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    });

    it('switches from light back to dark, removes the light class, and persists "dark"', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'light');
      const service = createService();

      // Act
      service.toggle();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    it('toggles back and forth restoring the original state after two calls', () => {
      // Arrange
      const service = createService();

      // Act
      service.toggle();
      service.toggle();

      // Assert
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });
  });
});
