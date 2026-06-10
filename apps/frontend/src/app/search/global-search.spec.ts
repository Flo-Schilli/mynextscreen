import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { GlobalSearch } from './global-search';
import { SearchService } from './search.service';
import { SearchResults } from './search.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const EMPTY_RESULTS: SearchResults = {
  screens: [],
  content: [],
  playlists: [],
  schedules: [],
};

const FULL_RESULTS: SearchResults = {
  screens: [{ id: 's1', type: 'screen', label: 'Lobby Screen', url: '/screens/s1' }],
  content: [{ id: 'c1', type: 'content', label: 'Promo Clip', url: '/content/c1' }],
  playlists: [{ id: 'p1', type: 'playlist', label: 'Evening Mix', url: '/playlists/p1' }],
  schedules: [],
};

const DEBOUNCE_MS = 300;

interface SearchStub {
  search: ReturnType<typeof vi.fn>;
}

interface Setup {
  fixture: ComponentFixture<GlobalSearch>;
  component: GlobalSearch;
  searchStub: SearchStub;
  navigateByUrl: ReturnType<typeof vi.fn>;
  routerEvents: Subject<NavigationStart>;
}

function setup(): Setup {
  const searchStub: SearchStub = { search: vi.fn(() => of(FULL_RESULTS)) };
  const routerEvents = new Subject<NavigationStart>();
  const navigateByUrl = vi.fn(() => Promise.resolve(true));
  const routerStub = {
    events: routerEvents.asObservable(),
    navigateByUrl,
  } as unknown as Router;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: SearchService, useValue: searchStub },
      { provide: Router, useValue: routerStub },
    ],
  });

  const fixture = TestBed.createComponent(GlobalSearch);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, searchStub, navigateByUrl, routerEvents };
}

function typeQuery(s: Setup, value: string): void {
  const input = s.fixture.debugElement.query(By.css('.search-input'))
    .nativeElement as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

// Flushes pending microtasks so synchronous RxJS results settle after timer flush.
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('debounced querying', () => {
    it('does not query the service before the debounce window elapses', async () => {
      // Arrange
      const s = setup();

      // Act
      typeQuery(s, 'lobby');
      vi.advanceTimersByTime(DEBOUNCE_MS - 1);
      await flush();

      // Assert
      expect(s.searchStub.search).not.toHaveBeenCalled();
    });

    it('queries the service with the trimmed term after the debounce window', async () => {
      // Arrange
      const s = setup();

      // Act
      typeQuery(s, '  lobby  ');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      expect(s.searchStub.search).toHaveBeenCalledWith('lobby');
    });

    it('does not query when the trimmed term is shorter than two characters', async () => {
      // Arrange
      const s = setup();

      // Act
      typeQuery(s, 'a');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      expect(s.searchStub.search).not.toHaveBeenCalled();
      expect(s.component.results()).toBeNull();
    });

    it('does not re-query when the same term is typed twice (distinctUntilChanged)', async () => {
      // Arrange
      const s = setup();
      typeQuery(s, 'lobby');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();
      expect(s.searchStub.search).toHaveBeenCalledTimes(1);

      // Act
      typeQuery(s, 'lobby');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      expect(s.searchStub.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('result grouping and rendering', () => {
    it('exposes only non-empty sections in the configured order', async () => {
      // Arrange
      const s = setup();

      // Act
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      const keys = s.component.sections().map((sec) => sec.key);
      expect(keys).toEqual(['screens', 'content', 'playlists']);
      expect(s.component.hasResults()).toBe(true);
    });

    it('renders a dropdown section per non-empty group when focused', async () => {
      // Arrange
      const s = setup();
      s.component.focused.set(true);

      // Act
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();
      s.fixture.detectChanges();

      // Assert
      const sections = s.fixture.debugElement.queryAll(By.css('.dropdown-section'));
      expect(sections.length).toBe(3);
      const items = s.fixture.debugElement.queryAll(By.css('.result-item'));
      expect(items.length).toBe(3);
    });

    it('shows the empty state when the service returns no matches', async () => {
      // Arrange
      const s = setup();
      s.searchStub.search.mockReturnValue(of(EMPTY_RESULTS));
      s.component.focused.set(true);

      // Act
      typeQuery(s, 'zzz');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();
      s.fixture.detectChanges();

      // Assert
      expect(s.component.dropdownOpen()).toBe(true);
      expect(s.component.hasResults()).toBe(false);
      expect(s.fixture.debugElement.query(By.css('.empty-state'))).not.toBeNull();
    });
  });

  describe('loading and error states', () => {
    it('toggles the loading flag on while the request is in flight and off on completion', async () => {
      // Arrange
      const s = setup();
      const responses = new Subject<SearchResults>();
      s.searchStub.search.mockReturnValue(responses.asObservable());

      // Act
      typeQuery(s, 'lobby');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert: loading turned on
      expect(s.component.loading()).toBe(true);

      // Act: resolve
      responses.next(FULL_RESULTS);
      responses.complete();
      await flush();

      // Assert: loading turned off
      expect(s.component.loading()).toBe(false);
    });

    it('clears the loading flag when the search stream errors', async () => {
      // Arrange
      const s = setup();
      s.searchStub.search.mockReturnValue(throwError(() => new Error('boom')));

      // Act
      typeQuery(s, 'lobby');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      expect(s.component.loading()).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    async function setupWithResults(): Promise<Setup> {
      const s = setup();
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();
      return s;
    }

    it('cycles the active index downward and wraps to the top', async () => {
      // Arrange
      const s = await setupWithResults();
      const event = new KeyboardEvent('keydown');

      // Act & Assert
      s.component.onArrowDown(event);
      expect(s.component.activeIndex()).toBe(0);
      s.component.onArrowDown(event);
      s.component.onArrowDown(event);
      expect(s.component.activeIndex()).toBe(2);
      s.component.onArrowDown(event);
      expect(s.component.activeIndex()).toBe(0);
    });

    it('cycles the active index upward and wraps to the bottom', async () => {
      // Arrange
      const s = await setupWithResults();
      const event = new KeyboardEvent('keydown');

      // Act
      s.component.onArrowUp(event);

      // Assert: from -1 it wraps to the last item
      expect(s.component.activeIndex()).toBe(2);
    });

    it('navigates to the active item on Enter', async () => {
      // Arrange
      const s = await setupWithResults();
      s.component.activeIndex.set(1);

      // Act
      s.component.onEnter(new KeyboardEvent('keydown'));

      // Assert: index 1 is the content item
      expect(s.navigateByUrl).toHaveBeenCalledWith('/content/c1');
    });

    it('does not navigate on Enter when no item is active', async () => {
      // Arrange
      const s = await setupWithResults();
      s.component.activeIndex.set(-1);

      // Act
      s.component.onEnter(new KeyboardEvent('keydown'));

      // Assert
      expect(s.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('flatIndex', () => {
    it('computes a contiguous offset across rendered sections', async () => {
      // Arrange
      const s = setup();
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      expect(s.component.flatIndex('screens', 0)).toBe(0);
      expect(s.component.flatIndex('content', 0)).toBe(1);
      expect(s.component.flatIndex('playlists', 0)).toBe(2);
    });

    it('returns -1 for a section that is not present', async () => {
      // Arrange
      const s = setup();
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert
      expect(s.component.flatIndex('schedules', 0)).toBe(-1);
    });
  });

  describe('navigation and dropdown lifecycle', () => {
    it('navigates and clears state when an item is selected', async () => {
      // Arrange
      const s = setup();
      s.component.focused.set(true);
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Act
      s.component.navigateTo(FULL_RESULTS.screens[0]);

      // Assert
      expect(s.navigateByUrl).toHaveBeenCalledWith('/screens/s1');
      expect(s.component.results()).toBeNull();
      expect(s.component.query()).toBe('');
    });

    it('closes the dropdown when a navigation starts', async () => {
      // Arrange
      const s = setup();
      s.component.focused.set(true);
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();
      expect(s.component.results()).not.toBeNull();

      // Act
      s.routerEvents.next(new NavigationStart(1, '/screens'));

      // Assert
      expect(s.component.results()).toBeNull();
    });

    it('opens the dropdown only when results exist and the box is focused', async () => {
      // Arrange
      const s = setup();
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();

      // Assert: results present but not focused
      expect(s.component.dropdownOpen()).toBe(false);

      // Act
      s.component.focused.set(true);

      // Assert
      expect(s.component.dropdownOpen()).toBe(true);
    });

    it('resets query, results and loading on Escape', async () => {
      // Arrange
      const s = setup();
      typeQuery(s, 'mix');
      vi.advanceTimersByTime(DEBOUNCE_MS);
      await flush();
      expect(s.component.results()).not.toBeNull();

      // Act
      s.component.onEscape();

      // Assert
      expect(s.component.query()).toBe('');
      expect(s.component.results()).toBeNull();
      expect(s.component.loading()).toBe(false);
      expect(s.component.activeIndex()).toBe(-1);
    });
  });
});
