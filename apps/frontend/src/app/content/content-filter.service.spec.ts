import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentFilterService } from './content-filter.service';
import { Content } from './content.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: 'org1',
    title: 'Item',
    description: null,
    tags: [],
    type: 'image',
    originalFilename: 'item.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 100,
    transcodedSizeBytes: null,
    thumbnailSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContentFilterService', () => {
  let service: ContentFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ContentFilterService],
    });
    service = TestBed.inject(ContentFilterService);
  });

  describe('extractTags', () => {
    it('returns an empty array for no content', () => {
      expect(service.extractTags([])).toEqual([]);
    });

    it('returns sorted, de-duplicated tags across all content', () => {
      const contents = [
        makeContent({ id: 'a', tags: ['promo', 'summer'] }),
        makeContent({ id: 'b', tags: ['summer', 'archive'] }),
      ];
      expect(service.extractTags(contents)).toEqual(['archive', 'promo', 'summer']);
    });
  });

  describe('filterContents', () => {
    const image = makeContent({ id: 'img', type: 'image', tags: ['promo'] });
    const video = makeContent({ id: 'vid', type: 'video', tags: ['archive'] });
    const all = [image, video];

    it('returns all content when no filters are applied', () => {
      expect(service.filterContents(all, undefined, [])).toEqual(all);
    });

    it('filters by type', () => {
      expect(service.filterContents(all, 'video', [])).toEqual([video]);
    });

    it('filters by tag (matches any selected tag)', () => {
      expect(service.filterContents(all, undefined, ['promo'])).toEqual([image]);
    });

    it('combines type and tag filters', () => {
      expect(service.filterContents(all, 'image', ['archive'])).toEqual([]);
      expect(service.filterContents(all, 'image', ['promo'])).toEqual([image]);
    });

    it('does not mutate the input array', () => {
      const input = [video, image];
      service.filterContents(input, 'image', []);
      expect(input).toEqual([video, image]);
    });
  });
});
