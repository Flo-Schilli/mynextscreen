import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { PlaylistService } from './playlist.service';
import {
  Playlist,
  PlaylistItem,
  CreatePlaylistRequest,
  AddPlaylistItemRequest,
  UpdatePlaylistItemRequest,
  ReorderPlaylistItemsRequest,
  BulkDeletePlaylistsResponse,
  BulkAssignScreenResponse,
} from './playlist.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function buildPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'p1',
    organisationId: ORG_ID,
    name: 'Lobby Loop',
    items: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function buildItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 'i1',
    playlistId: 'p1',
    contentId: 'c1',
    position: 0,
    durationSeconds: 10,
    transition: 'fade',
    transitionDurationMs: 500,
    ...overrides,
  };
}

describe('PlaylistService', () => {
  let service: PlaylistService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        PlaylistService,
      ],
    });

    service = TestBed.inject(PlaylistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll', () => {
    it('should GET /api/playlists with the org header and return the list', () => {
      // Arrange
      const expected = [buildPlaylist()];
      let result: Playlist[] | undefined;

      // Act
      service.getAll(ORG_ID).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('getOne', () => {
    it('should GET /api/playlists/:id with the org header and return the playlist', () => {
      // Arrange
      const expected = buildPlaylist({ id: 'p9' });
      let result: Playlist | undefined;

      // Act
      service.getOne(ORG_ID, 'p9').subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p9');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('create', () => {
    it('should POST /api/playlists with the dto body and org header', () => {
      // Arrange
      const dto: CreatePlaylistRequest = { name: 'New Loop' };
      const expected = buildPlaylist({ name: 'New Loop' });
      let result: Playlist | undefined;

      // Act
      service.create(ORG_ID, dto).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should PATCH /api/playlists/:id with the name body and org header', () => {
      // Arrange
      const dto = { name: 'Renamed' };
      const expected = buildPlaylist({ name: 'Renamed' });
      let result: Playlist | undefined;

      // Act
      service.update(ORG_ID, 'p1', dto).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('should DELETE /api/playlists/:id with the org header', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete(ORG_ID, 'p1').subscribe(() => (completed = true));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('addItem', () => {
    it('should POST /api/playlists/:id/items with the dto body and org header', () => {
      // Arrange
      const dto: AddPlaylistItemRequest = { contentId: 'c1', durationSeconds: 12 };
      const expected = buildItem();
      let result: PlaylistItem | undefined;

      // Act
      service.addItem(ORG_ID, 'p1', dto).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1/items');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('updateItem', () => {
    it('should PATCH /api/playlists/:id/items/:itemId with the dto body and org header', () => {
      // Arrange
      const dto: UpdatePlaylistItemRequest = { durationSeconds: 20, transition: 'zoom-in' };
      const expected = buildItem({ durationSeconds: 20, transition: 'zoom-in' });
      let result: PlaylistItem | undefined;

      // Act
      service.updateItem(ORG_ID, 'p1', 'i1', dto).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1/items/i1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('removeItem', () => {
    it('should DELETE /api/playlists/:id/items/:itemId with the org header', () => {
      // Arrange
      let completed = false;

      // Act
      service.removeItem(ORG_ID, 'p1', 'i1').subscribe(() => (completed = true));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1/items/i1');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('reorderItems', () => {
    it('should PUT /api/playlists/:id/items/reorder with the dto body and org header', () => {
      // Arrange
      const dto: ReorderPlaylistItemsRequest = { itemIds: ['i2', 'i1'] };
      const expected = [buildItem({ id: 'i2', position: 0 }), buildItem({ id: 'i1', position: 1 })];
      let result: PlaylistItem[] | undefined;

      // Act
      service.reorderItems(ORG_ID, 'p1', dto).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1/items/reorder');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('getDuration', () => {
    it('should GET /api/playlists/:id/duration with the org header and return the duration', () => {
      // Arrange
      const expected = { totalDurationSeconds: 120 };
      let result: { totalDurationSeconds: number } | undefined;

      // Act
      service.getDuration(ORG_ID, 'p1').subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/p1/duration');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('setAsDefault', () => {
    it('should PATCH /api/organisations/:orgId/default-playlist with the playlistId body', () => {
      // Arrange
      let completed = false;

      // Act
      service.setAsDefault(ORG_ID, 'p1').subscribe(() => (completed = true));

      // Assert
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/default-playlist`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ playlistId: 'p1' });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush({});
      expect(completed).toBe(true);
    });

    it('should send a null playlistId to clear the default playlist', () => {
      // Act
      service.setAsDefault(ORG_ID, null).subscribe();

      // Assert
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/default-playlist`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ playlistId: null });
      req.flush({});
    });
  });

  describe('bulkDelete', () => {
    it('should POST /api/playlists/bulk-delete with the ids body and org header', () => {
      // Arrange
      const ids = ['p1', 'p2'];
      const expected: BulkDeletePlaylistsResponse = { deleted: 1, notFound: ['p2'] };
      let result: BulkDeletePlaylistsResponse | undefined;

      // Act
      service.bulkDelete(ORG_ID, ids).subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/bulk-delete');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('bulkAssignScreen', () => {
    it('should POST /api/playlists/bulk-assign-screen with ids and screenId body', () => {
      // Arrange
      const ids = ['p1', 'p2'];
      const expected: BulkAssignScreenResponse = { assigned: 2, notFound: [] };
      let result: BulkAssignScreenResponse | undefined;

      // Act
      service.bulkAssignScreen(ORG_ID, ids, 's1').subscribe((res) => (result = res));

      // Assert
      const req = httpMock.expectOne('/api/playlists/bulk-assign-screen');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids, screenId: 's1' });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(result).toEqual(expected);
    });
  });

  describe('error paths', () => {
    it('should propagate an HTTP error from getAll', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getAll(ORG_ID).subscribe({
        error: (err: { status: number }) => (errorStatus = err.status),
      });

      // Assert
      const req = httpMock.expectOne('/api/playlists');
      req.flush('boom', { status: 500, statusText: 'Server Error' });
      expect(errorStatus).toBe(500);
    });
  });
});
