import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { OrganisationService } from './organisation.service';
import {
  Organisation,
  CreateOrganisationDto,
  UpdateOrganisationDto,
  OrgMember,
  AddOrgMemberRequest,
  UpdateOrgMemberRoleRequest,
} from './organisation.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const BASE_URL = '/api/organisations';

function makeOrganisation(overrides: Partial<Organisation> = {}): Organisation {
  return {
    id: 'org-1',
    name: 'Acme Venue',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1000,
    storageTranscodedLimitBytes: 2000,
    storageOriginalUsedBytes: 100,
    storageTranscodedUsedBytes: 200,
    defaultPlaylistId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function makeOrgMember(overrides: Partial<OrgMember> = {}): OrgMember {
  return {
    id: 'mem-1',
    userId: 'user-1',
    organisationId: 'org-1',
    role: 'editor',
    createdAt: '2026-01-01T00:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('OrganisationService', () => {
  let service: OrganisationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(OrganisationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('issues a GET to the organisations base URL and returns the list', () => {
      // Arrange
      const organisations = [makeOrganisation(), makeOrganisation({ id: 'org-2' })];
      let received: Organisation[] | undefined;

      // Act
      service.getAll().subscribe((result) => (received = result));
      const req = httpMock.expectOne(BASE_URL);

      // Assert
      expect(req.request.method).toBe('GET');
      req.flush(organisations);
      expect(received).toEqual(organisations);
    });

    it('does not attach an X-Organisation-Id header (super-admin scoped)', () => {
      // Arrange & Act
      service.getAll().subscribe();
      const req = httpMock.expectOne(BASE_URL);

      // Assert
      expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
      req.flush([]);
    });

    it('propagates HTTP errors', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getAll().subscribe({ error: (err) => (errorStatus = err.status) });
      const req = httpMock.expectOne(BASE_URL);
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      // Assert
      expect(errorStatus).toBe(500);
    });
  });

  describe('getOne', () => {
    it('issues a GET to the organisation detail URL and returns the entity', () => {
      // Arrange
      const organisation = makeOrganisation({ id: 'org-42' });
      let received: Organisation | undefined;

      // Act
      service.getOne('org-42').subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE_URL}/org-42`);

      // Assert
      expect(req.request.method).toBe('GET');
      req.flush(organisation);
      expect(received).toEqual(organisation);
    });

    it('propagates a 404 when the organisation is missing', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getOne('missing').subscribe({ error: (err) => (errorStatus = err.status) });
      const req = httpMock.expectOne(`${BASE_URL}/missing`);
      req.flush('not found', { status: 404, statusText: 'Not Found' });

      // Assert
      expect(errorStatus).toBe(404);
    });
  });

  describe('create', () => {
    it('issues a POST with the create DTO as body and returns the created organisation', () => {
      // Arrange
      const dto: CreateOrganisationDto = {
        name: 'New Org',
        timeZone: 'UTC',
        storageOriginalLimitBytes: 500,
        storageTranscodedLimitBytes: 600,
      };
      const created = makeOrganisation({ id: 'org-new', name: 'New Org' });
      let received: Organisation | undefined;

      // Act
      service.create(dto).subscribe((result) => (received = result));
      const req = httpMock.expectOne(BASE_URL);

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(created);
      expect(received).toEqual(created);
    });
  });

  describe('update', () => {
    it('issues a PATCH to the detail URL with the update DTO as body', () => {
      // Arrange
      const dto: UpdateOrganisationDto = { name: 'Renamed' };
      const updated = makeOrganisation({ id: 'org-7', name: 'Renamed' });
      let received: Organisation | undefined;

      // Act
      service.update('org-7', dto).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE_URL}/org-7`);

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(updated);
      expect(received).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('issues a DELETE to the organisation detail URL and completes with no body', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete('org-7').subscribe({ complete: () => (completed = true) });
      const req = httpMock.expectOne(`${BASE_URL}/org-7`);

      // Assert
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(completed).toBe(true);
    });

    it('does not attach an X-Organisation-Id header (super-admin scoped)', () => {
      // Arrange & Act
      service.delete('org-7').subscribe();
      const req = httpMock.expectOne(`${BASE_URL}/org-7`);

      // Assert
      expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
      req.flush(null);
    });
  });

  describe('listMembers', () => {
    it('issues a GET to the members sub-resource and returns the members', () => {
      // Arrange
      const members = [makeOrgMember(), makeOrgMember({ id: 'mem-2', userId: 'user-2' })];
      let received: OrgMember[] | undefined;

      // Act
      service.listMembers('org-9').subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE_URL}/org-9/members`);

      // Assert
      expect(req.request.method).toBe('GET');
      req.flush(members);
      expect(received).toEqual(members);
    });
  });

  describe('addMember', () => {
    it('issues a POST to the members sub-resource with the add request as body', () => {
      // Arrange
      const dto: AddOrgMemberRequest = { email: 'new@example.com', role: 'viewer' };
      const created = makeOrgMember({ id: 'mem-new', role: 'viewer' });
      let received: OrgMember | undefined;

      // Act
      service.addMember('org-9', dto).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE_URL}/org-9/members`);

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(created);
      expect(received).toEqual(created);
    });
  });

  describe('updateMemberRole', () => {
    it('issues a PATCH to the member detail URL with the role request as body', () => {
      // Arrange
      const dto: UpdateOrgMemberRoleRequest = { role: 'org_admin' };
      const updated = makeOrgMember({ role: 'org_admin' });
      let received: OrgMember | undefined;

      // Act
      service.updateMemberRole('org-9', 'user-1', dto).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE_URL}/org-9/members/user-1`);

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(updated);
      expect(received).toEqual(updated);
    });
  });

  describe('removeMember', () => {
    it('issues a DELETE to the member detail URL and completes with no body', () => {
      // Arrange
      let completed = false;

      // Act
      service.removeMember('org-9', 'user-1').subscribe({ complete: () => (completed = true) });
      const req = httpMock.expectOne(`${BASE_URL}/org-9/members/user-1`);

      // Assert
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(completed).toBe(true);
    });
  });
});
