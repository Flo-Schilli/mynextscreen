import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContentService, UploadProgress } from './content.service';
import { Content, StorageInfo } from './content.model';
import { OrganisationStateService } from '../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function buildContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: ORG_ID,
    title: 'Promo',
    description: null,
    tags: [],
    type: 'image',
    originalFilename: 'promo.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 1000,
    transcodedSizeBytes: 500,
    thumbnailSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ContentService', () => {
  let service: ContentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ContentService,
        { provide: OrganisationStateService, useValue: { selectedOrgId: () => ORG_ID } },
      ],
    });

    service = TestBed.inject(ContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll', () => {
    it('should GET /api/content with the org header and no query when no filters', () => {
      // Arrange
      const expected = [buildContent()];
      let result: Content[] | undefined;

      // Act
      service.getAll(ORG_ID).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });

    it('should append a type query param when filtered by type', () => {
      // Act
      service.getAll(ORG_ID, { type: 'video' }).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/content?type=video');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should append both type and tags query params when both filters are set', () => {
      // Act
      service.getAll(ORG_ID, { type: 'image', tags: 'promo' }).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/content?type=image&tags=promo');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('getOne', () => {
    it('should GET /api/content/:id with the org header and return the content', () => {
      // Arrange
      const expected = buildContent({ id: 'c9' });
      let result: Content | undefined;

      // Act
      service.getOne(ORG_ID, 'c9').subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content/c9');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('upload', () => {
    it('should POST a multipart body with file, title, description and tags', () => {
      // Arrange
      const file = new File(['data'], 'promo.png', { type: 'image/png' });

      // Act
      service.upload(ORG_ID, file, 'Promo', 'A description', ['a', 'b']).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/content/upload');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      expect(req.request.reportProgress).toBe(true);
      const body = req.request.body as FormData;
      expect(body.get('file')).toBe(file);
      expect(body.get('title')).toBe('Promo');
      expect(body.get('description')).toBe('A description');
      expect(body.get('tags')).toBe(JSON.stringify(['a', 'b']));
      req.flush(buildContent());
    });

    it('should omit description and tags from the body when empty', () => {
      // Arrange
      const file = new File(['data'], 'promo.png', { type: 'image/png' });

      // Act
      service.upload(ORG_ID, file, 'Promo', '', []).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/content/upload');
      const body = req.request.body as FormData;
      expect(body.has('description')).toBe(false);
      expect(body.has('tags')).toBe(false);
      req.flush(buildContent());
    });

    it('should map UploadProgress events to a progress percentage', () => {
      // Arrange
      const file = new File(['data'], 'promo.png', { type: 'image/png' });
      const events: UploadProgress[] = [];

      // Act
      service.upload(ORG_ID, file, 'Promo', '', []).subscribe((e) => events.push(e));

      // Assert
      const req = httpMock.expectOne('/api/content/upload');
      req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
      req.flush(buildContent());

      expect(events[0]).toEqual({ type: 'progress', progress: 50 });
    });

    it('should report 0 progress when total is missing', () => {
      // Arrange
      const file = new File(['data'], 'promo.png', { type: 'image/png' });
      const events: UploadProgress[] = [];

      // Act
      service.upload(ORG_ID, file, 'Promo', '', []).subscribe((e) => events.push(e));

      // Assert
      const req = httpMock.expectOne('/api/content/upload');
      req.event({ type: HttpEventType.UploadProgress, loaded: 50 });
      req.flush(buildContent());

      expect(events[0]).toEqual({ type: 'progress', progress: 0 });
    });

    it('should map the final response to a complete event with the content', () => {
      // Arrange
      const file = new File(['data'], 'promo.png', { type: 'image/png' });
      const content = buildContent({ id: 'uploaded' });
      const events: UploadProgress[] = [];

      // Act
      service.upload(ORG_ID, file, 'Promo', '', []).subscribe((e) => events.push(e));

      // Assert
      const req = httpMock.expectOne('/api/content/upload');
      req.event(new HttpResponse({ status: 200, body: content }));
      req.flush(content);

      const complete = events.find((e) => e.type === 'complete');
      expect(complete).toEqual({ type: 'complete', content });
    });
  });

  describe('updateMetadata', () => {
    it('should PATCH /api/content/:id with the dto body and org header', () => {
      // Arrange
      const dto = { title: 'New title', tags: ['x'] };
      const expected = buildContent({ title: 'New title', tags: ['x'] });
      let result: Content | undefined;

      // Act
      service.updateMetadata(ORG_ID, 'c1', dto).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content/c1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('should DELETE /api/content/:id with the org header', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete(ORG_ID, 'c1').subscribe(() => (completed = true));

      // Assert
      const req = httpMock.expectOne('/api/content/c1');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('reUpload', () => {
    it('should POST the file to /api/content/:id/reupload with reportProgress', () => {
      // Arrange
      const file = new File(['data'], 'new.mp4', { type: 'video/mp4' });

      // Act
      service.reUpload(ORG_ID, 'c1', file).subscribe();

      // Assert
      const req = httpMock.expectOne('/api/content/c1/reupload');
      expect(req.request.method).toBe('POST');
      expect(req.request.reportProgress).toBe(true);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      const body = req.request.body as FormData;
      expect(body.get('file')).toBe(file);
      req.flush(buildContent());
    });

    it('should map progress and completion events for reUpload', () => {
      // Arrange
      const file = new File(['data'], 'new.mp4', { type: 'video/mp4' });
      const content = buildContent({ id: 're' });
      const events: UploadProgress[] = [];

      // Act
      service.reUpload(ORG_ID, 'c1', file).subscribe((e) => events.push(e));

      // Assert
      const req = httpMock.expectOne('/api/content/c1/reupload');
      req.event({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
      req.event(new HttpResponse({ status: 200, body: content }));
      req.flush(content);

      expect(events[0]).toEqual({ type: 'progress', progress: 25 });
      expect(events.find((e) => e.type === 'complete')).toEqual({ type: 'complete', content });
    });
  });

  describe('getStorage', () => {
    it('should GET /api/organisations/:orgId/storage with the org header', () => {
      // Arrange
      const expected: StorageInfo = {
        originalUsedBytes: 10,
        originalLimitBytes: 100,
        transcodedUsedBytes: 5,
        transcodedLimitBytes: 50,
      };
      let result: StorageInfo | undefined;

      // Act
      service.getStorage(ORG_ID).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/storage`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('bulkDelete', () => {
    it('should POST /api/content/bulk-delete with an ids body', () => {
      // Arrange
      const ids = ['c1', 'c2'];
      const expected = { deleted: 1, notFound: ['c2'] };
      let result: { deleted: number; notFound: string[] } | undefined;

      // Act
      service.bulkDelete(ORG_ID, ids).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content/bulk-delete');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('bulkTag', () => {
    it('should POST /api/content/bulk-tag with ids and tags body', () => {
      // Arrange
      const ids = ['c1'];
      const tags = ['promo', 'summer'];
      const expected = { updated: 1, notFound: [] };
      let result: { updated: number; notFound: string[] } | undefined;

      // Act
      service.bulkTag(ORG_ID, ids, tags).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content/bulk-tag');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids, tags });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('bulkUntag', () => {
    it('should POST /api/content/bulk-untag with ids and tags body', () => {
      // Arrange
      const ids = ['c1'];
      const tags = ['old'];
      const expected = { updated: 1, notFound: [] };
      let result: { updated: number; notFound: string[] } | undefined;

      // Act
      service.bulkUntag(ORG_ID, ids, tags).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content/bulk-untag');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids, tags });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('bulkAddToPlaylist', () => {
    it('should POST /api/content/bulk-add-to-playlist with ids and playlistId body', () => {
      // Arrange
      const ids = ['c1', 'c2'];
      const expected = { added: 2, alreadyPresent: 0, notFound: [] };
      let result: { added: number; alreadyPresent: number; notFound: string[] } | undefined;

      // Act
      service.bulkAddToPlaylist(ORG_ID, ids, 'p1').subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/content/bulk-add-to-playlist');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids, playlistId: 'p1' });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('getOriginalUrl', () => {
    it('should build the original file URL with the organisationId query param (cookie auth)', () => {
      // Act
      const url = service.getOriginalUrl('c1');

      // Assert: no token query — same-origin <img> sends the httpOnly cookie.
      expect(url).toBe(`/api/content/c1/file/original?organisationId=${ORG_ID}`);
    });
  });

  describe('getTranscodedUrl', () => {
    it('should build the transcoded file URL with the organisationId query param', () => {
      // Act
      const url = service.getTranscodedUrl('c1');

      // Assert
      expect(url).toBe(`/api/content/c1/file/transcoded?organisationId=${ORG_ID}`);
    });
  });

  describe('media URL edge cases', () => {
    it('should omit the organisationId param when no org is selected', () => {
      // Arrange
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
          ContentService,
          { provide: OrganisationStateService, useValue: { selectedOrgId: () => null } },
        ],
      });
      const scoped = TestBed.inject(ContentService);

      // Act
      const url = scoped.getTranscodedUrl('c1');

      // Assert
      expect(url).toBe('/api/content/c1/file/transcoded');
    });
  });

  describe('error paths', () => {
    it('should propagate an HTTP error from getOne', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getOne(ORG_ID, 'missing').subscribe({
        error: (err: { status: number }) => (errorStatus = err.status),
      });

      // Assert
      const req = httpMock.expectOne('/api/content/missing');
      req.flush('not found', { status: 404, statusText: 'Not Found' });
      expect(errorStatus).toBe(404);
    });
  });
});
