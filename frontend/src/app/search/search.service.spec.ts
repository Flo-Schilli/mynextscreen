import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
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

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('search', () => {
    it('GETs /api/search with the query as the q param and returns grouped results', () => {
      // Arrange
      const results: SearchResults = {
        screens: [{ id: 's1', type: 'screen', label: 'Lobby', url: '/screens/s1' }],
        content: [{ id: 'c1', type: 'content', label: 'Promo', url: '/content/c1' }],
        playlists: [],
        schedules: [],
      };
      let received: SearchResults | undefined;

      // Act
      service.search('lobby').subscribe((res) => (received = res));
      const req = httpMock.expectOne((r) => r.url === '/api/search');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('lobby');
      req.flush(results);
      expect(received).toEqual(results);
    });

    it('passes an empty query string through as the q param', () => {
      // Arrange & Act
      service.search('').subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/search');

      // Assert
      expect(req.request.params.get('q')).toBe('');
      req.flush(EMPTY_RESULTS);
    });

    it('passes the query verbatim so HttpClient handles encoding of special characters', () => {
      // Arrange
      const query = 'main stage & live';

      // Act
      service.search(query).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/search');

      // Assert
      expect(req.request.params.get('q')).toBe(query);
      req.flush(EMPTY_RESULTS);
    });

    it('returns empty grouped arrays when nothing matches', () => {
      // Arrange
      let received: SearchResults | undefined;

      // Act
      service.search('zzz').subscribe((res) => (received = res));
      const req = httpMock.expectOne((r) => r.url === '/api/search');
      req.flush(EMPTY_RESULTS);

      // Assert
      expect(received).toEqual(EMPTY_RESULTS);
    });

    it('propagates HTTP errors to the subscriber', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.search('boom').subscribe({
        next: () => {
          throw new Error('expected an error');
        },
        error: (err: { status: number }) => (errorStatus = err.status),
      });
      const req = httpMock.expectOne((r) => r.url === '/api/search');
      req.flush('error', { status: 500, statusText: 'Server Error' });

      // Assert
      expect(errorStatus).toBe(500);
    });
  });
});
