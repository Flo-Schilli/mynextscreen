import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenGroupService } from './screen-group.service';
import {
  ScreenGroup,
  ScreenGroupScreen,
  CreateScreenGroupRequest,
  UpdateScreenGroupRequest,
  AssignScreenRequest,
} from './screen-group.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'group-1',
    organisationId: ORG_ID,
    name: 'Video Wall',
    mode: 'split',
    gridColumns: 2,
    gridRows: 2,
    color: '#6d6cf6',
    icon: 'Groups',
    screens: [],
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeGroupScreen(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 'screen-1',
    name: 'Lobby TV',
    location: 'Lobby',
    groupId: 'group-1',
    gridRow: 0,
    gridColumn: 0,
    ...overrides,
  };
}

describe('ScreenGroupService', () => {
  let service: ScreenGroupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ScreenGroupService,
      ],
    });

    service = TestBed.inject(ScreenGroupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('issues a GET to /api/screen-groups with the org header and returns the list', () => {
      // Arrange
      const expected = [makeGroup(), makeGroup({ id: 'group-2', mode: 'mirror' })];
      let actual: ScreenGroup[] | undefined;

      // Act
      service.getAll(ORG_ID).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screen-groups');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('getOne', () => {
    it('issues a GET to /api/screen-groups/:id and returns the group', () => {
      // Arrange
      const expected = makeGroup();
      let actual: ScreenGroup | undefined;

      // Act
      service.getOne(ORG_ID, 'group-1').subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screen-groups/group-1');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('create', () => {
    it('POSTs the create dto to /api/screen-groups and returns the new group', () => {
      // Arrange
      const dto: CreateScreenGroupRequest = {
        name: 'New Wall',
        mode: 'split',
        gridColumns: 3,
        gridRows: 1,
      };
      const expected = makeGroup({ name: 'New Wall', gridColumns: 3, gridRows: 1 });
      let actual: ScreenGroup | undefined;

      // Act
      service.create(ORG_ID, dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screen-groups');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('update', () => {
    it('PATCHes the update dto to /api/screen-groups/:id and returns the group', () => {
      // Arrange
      const dto: UpdateScreenGroupRequest = { name: 'Renamed Wall', mode: 'mirror' };
      const expected = makeGroup({ name: 'Renamed Wall', mode: 'mirror' });
      let actual: ScreenGroup | undefined;

      // Act
      service.update(ORG_ID, 'group-1', dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screen-groups/group-1');

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('DELETEs /api/screen-groups/:id with the org header', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete(ORG_ID, 'group-1').subscribe(() => (completed = true));
      const req = httpMock.expectOne('/api/screen-groups/group-1');

      // Assert
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('assignScreen', () => {
    it('PUTs the assign dto to /api/screen-groups/:groupId/screens/:screenId', () => {
      // Arrange
      const dto: AssignScreenRequest = { gridRow: 1, gridColumn: 0 };
      const expected = makeGroupScreen({ gridRow: 1, gridColumn: 0 });
      let actual: ScreenGroupScreen | undefined;

      // Act
      service.assignScreen(ORG_ID, 'group-1', 'screen-1', dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screen-groups/group-1/screens/screen-1');

      // Assert
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('removeScreen', () => {
    it('DELETEs /api/screen-groups/:groupId/screens/:screenId and returns the screen', () => {
      // Arrange
      const expected = makeGroupScreen({ groupId: null, gridRow: null, gridColumn: null });
      let actual: ScreenGroupScreen | undefined;

      // Act
      service.removeScreen(ORG_ID, 'group-1', 'screen-1').subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/screen-groups/group-1/screens/screen-1');

      // Assert
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
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
      const req = httpMock.expectOne('/api/screen-groups/missing');
      req.flush('not found', { status: 404, statusText: 'Not Found' });

      // Assert
      expect(status).toBe(404);
    });
  });
});
