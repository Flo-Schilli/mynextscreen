import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { MemberService } from './member.service';
import {
  Membership,
  MyMembership,
  AddMemberRequest,
  UpdateMemberRoleRequest,
} from './member.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-1';
const ORG_HEADER = 'X-Organisation-Id';

function makeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'mem-1',
    userId: 'user-1',
    organisationId: ORG_ID,
    role: 'editor',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
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

function makeMyMembership(overrides: Partial<MyMembership> = {}): MyMembership {
  return {
    id: 'mem-1',
    userId: 'user-1',
    organisationId: ORG_ID,
    role: 'org_admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    organisation: { id: ORG_ID, name: 'Acme Venue' },
    ...overrides,
  };
}

describe('MemberService', () => {
  let service: MemberService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MemberService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getMyMemberships', () => {
    it('issues a GET to /api/me/memberships and returns the memberships', () => {
      // Arrange
      const memberships = [makeMyMembership(), makeMyMembership({ id: 'mem-2' })];
      let received: MyMembership[] | undefined;

      // Act
      service.getMyMemberships().subscribe((result) => (received = result));
      const req = httpMock.expectOne('/api/me/memberships');

      // Assert
      expect(req.request.method).toBe('GET');
      req.flush(memberships);
      expect(received).toEqual(memberships);
    });

    it('does not attach an org-scoping header (user-level endpoint)', () => {
      // Arrange & Act
      service.getMyMemberships().subscribe();
      const req = httpMock.expectOne('/api/me/memberships');

      // Assert
      expect(req.request.headers.has(ORG_HEADER)).toBe(false);
      req.flush([]);
    });

    it('propagates HTTP errors', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getMyMemberships().subscribe({ error: (err) => (errorStatus = err.status) });
      const req = httpMock.expectOne('/api/me/memberships');
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      // Assert
      expect(errorStatus).toBe(500);
    });
  });

  describe('listMembers', () => {
    it('issues a GET to the org members URL with the org-scoping header', () => {
      // Arrange
      const members = [makeMembership(), makeMembership({ id: 'mem-2', userId: 'user-2' })];
      let received: Membership[] | undefined;

      // Act
      service.listMembers(ORG_ID).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/members`);

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get(ORG_HEADER)).toBe(ORG_ID);
      req.flush(members);
      expect(received).toEqual(members);
    });
  });

  describe('addMember', () => {
    it('issues a POST with the request body and the org-scoping header', () => {
      // Arrange
      const dto: AddMemberRequest = { email: 'new@example.com', role: 'viewer' };
      const created = makeMembership({ id: 'mem-new', role: 'viewer' });
      let received: Membership | undefined;

      // Act
      service.addMember(ORG_ID, dto).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/members`);

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get(ORG_HEADER)).toBe(ORG_ID);
      req.flush(created);
      expect(received).toEqual(created);
    });
  });

  describe('updateRole', () => {
    it('issues a PATCH to the member detail URL with the role body and org header', () => {
      // Arrange
      const dto: UpdateMemberRoleRequest = { role: 'org_admin' };
      const updated = makeMembership({ role: 'org_admin' });
      let received: Membership | undefined;

      // Act
      service.updateRole(ORG_ID, 'user-1', dto).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/members/user-1`);

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get(ORG_HEADER)).toBe(ORG_ID);
      req.flush(updated);
      expect(received).toEqual(updated);
    });
  });

  describe('removeMember', () => {
    it('issues a DELETE to the member detail URL with the org header and completes', () => {
      // Arrange
      let completed = false;

      // Act
      service.removeMember(ORG_ID, 'user-1').subscribe({ complete: () => (completed = true) });
      const req = httpMock.expectOne(`/api/organisations/${ORG_ID}/members/user-1`);

      // Assert
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get(ORG_HEADER)).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });

    it('uses the passed orgId for the header even when it differs from a prior call', () => {
      // Arrange
      const otherOrg = 'org-other';

      // Act
      service.removeMember(otherOrg, 'user-9').subscribe();
      const req = httpMock.expectOne(`/api/organisations/${otherOrg}/members/user-9`);

      // Assert
      expect(req.request.headers.get(ORG_HEADER)).toBe(otherOrg);
      req.flush(null);
    });
  });
});
