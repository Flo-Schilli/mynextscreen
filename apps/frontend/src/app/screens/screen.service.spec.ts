import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenService } from './screen.service';
import {
  Screen,
  ScreenListItem,
  CreateScreenRequest,
  UpdateScreenRequest,
  BulkDeleteResponse,
  BulkAssignGroupResponse,
} from './screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 'screen-1',
    organisationId: ORG_ID,
    name: 'Lobby TV',
    resolution: '1920x1080',
    location: 'Lobby',
    isOnline: true,
    lastHeartbeat: '2026-06-01T09:00:00.000Z',
    groupId: null,
    gridRow: null,
    gridColumn: null,
    showUnmuteButton: true,
    showDisconnectButton: true,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('ScreenService', () => {
  let service: ScreenService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ScreenService,
      ],
    });

    service = TestBed.inject(ScreenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function makeListItem(overrides: Partial<ScreenListItem> = {}): ScreenListItem {
    return {
      ...makeScreen(),
      currentPlaylistName: null,
      currentPlaylistThumbnail: null,
      ...overrides,
    };
  }

  describe('getAll', () => {
    it('issues a GET to /api/screens with the org header and returns the enriched list', () => {
      // Arrange
      const expected = [
        makeListItem({ currentPlaylistName: 'Morning Loop' }),
        makeListItem({ id: 'screen-2' }),
      ];
      let actual: ScreenListItem[] | undefined;

      // Act
      service.getAll(ORG_ID).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
      expect(actual?.[0].currentPlaylistName).toBe('Morning Loop');
    });
  });

  describe('getOne', () => {
    it('issues a GET to /api/screens/:id and returns the screen', () => {
      // Arrange
      const expected = makeScreen();
      let actual: Screen | undefined;

      // Act
      service.getOne(ORG_ID, 'screen-1').subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens/screen-1');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('create', () => {
    it('POSTs the create dto (incl. pairing code) to /api/screens and returns the screen', () => {
      // Arrange
      const dto: CreateScreenRequest = {
        name: 'Bar TV',
        resolution: '3840x2160',
        location: 'Bar',
        pairingCode: '123456',
      };
      const expected = makeScreen({ name: 'Bar TV' });
      let actual: Screen | undefined;

      // Act
      service.create(ORG_ID, dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('update', () => {
    it('PATCHes the update dto to /api/screens/:id and returns the screen', () => {
      // Arrange
      const dto: UpdateScreenRequest = { name: 'Renamed TV' };
      const expected = makeScreen({ name: 'Renamed TV' });
      let actual: Screen | undefined;

      // Act
      service.update(ORG_ID, 'screen-1', dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens/screen-1');

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('repair', () => {
    it('POSTs the pairing code to /api/screens/:id/repair and returns the screen', () => {
      // Arrange
      const expected = makeScreen();
      let actual: Screen | undefined;

      // Act
      service.repair(ORG_ID, 'screen-1', '654321').subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens/screen-1/repair');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ pairingCode: '654321' });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('deleteOne', () => {
    it('POSTs a single-element id list to /api/screens/bulk-delete', () => {
      // Arrange
      const expected: BulkDeleteResponse = { deleted: 1, notFound: [] };
      let actual: BulkDeleteResponse | undefined;

      // Act
      service.deleteOne(ORG_ID, 'screen-1').subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens/bulk-delete');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids: ['screen-1'] });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('bulkDelete', () => {
    it('POSTs the ids to /api/screens/bulk-delete and returns the delete summary', () => {
      // Arrange
      const ids = ['screen-1', 'screen-2'];
      const expected: BulkDeleteResponse = { deleted: 1, notFound: ['screen-2'] };
      let actual: BulkDeleteResponse | undefined;

      // Act
      service.bulkDelete(ORG_ID, ids).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens/bulk-delete');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('bulkAssignGroup', () => {
    it('POSTs ids and groupId to /api/screens/bulk-assign-group', () => {
      // Arrange
      const ids = ['screen-1', 'screen-2'];
      const expected: BulkAssignGroupResponse = { updated: 2, notFound: [] };
      let actual: BulkAssignGroupResponse | undefined;

      // Act
      service.bulkAssignGroup(ORG_ID, ids, 'group-1').subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screens/bulk-assign-group');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ ids, groupId: 'group-1' });
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });

    it('sends groupId as null when unassigning screens from any group', () => {
      // Arrange
      const ids = ['screen-1'];
      const expected: BulkAssignGroupResponse = { updated: 1, notFound: [] };

      // Act
      service.bulkAssignGroup(ORG_ID, ids, null).subscribe();
      const req = httpMock.expectOne('/api/screens/bulk-assign-group');

      // Assert
      expect(req.request.body).toEqual({ ids, groupId: null });
      req.flush(expected);
    });
  });

  describe('error handling', () => {
    it('propagates a 404 from getOne to the subscriber', () => {
      // Arrange
      let status: number | undefined;

      // Act
      service.getOne(ORG_ID, 'missing').subscribe({
        error: (err: { status: number }) => (status = err.status),
      });
      const req = httpMock.expectOne('/api/screens/missing');
      req.flush('not found', { status: 404, statusText: 'Not Found' });

      // Assert
      expect(status).toBe(404);
    });
  });
});
