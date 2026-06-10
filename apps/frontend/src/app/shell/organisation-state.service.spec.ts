import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { OrganisationStateService, OrgMembership } from './organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const STORAGE_KEY = 'signage_selected_org_id';
const PROFILE_URL = '/api/me/profile';
const MEMBERSHIPS_URL = '/api/me/memberships';

interface UserProfileResponse {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

function membership(
  orgId: string,
  name: string,
  role: string,
  timeZone = 'Europe/Berlin',
): OrgMembership {
  return {
    id: `membership-${orgId}`,
    organisationId: orgId,
    role,
    organisation: { id: orgId, name, timeZone },
  };
}

describe('OrganisationStateService', () => {
  let service: OrganisationStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganisationStateService,
      ],
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // Service reads localStorage in its field initializer, so inject AFTER setting storage.
  function init(): void {
    service = TestBed.inject(OrganisationStateService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  describe('initial state', () => {
    it('initializes selectedOrgId from localStorage', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'stored-org');

      // Act
      init();

      // Assert
      expect(service.selectedOrgId()).toBe('stored-org');
    });

    it('initializes with empty state when nothing is stored', () => {
      // Arrange + Act
      init();

      // Assert
      expect(service.selectedOrgId()).toBeNull();
      expect(service.organisations()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.isSuperAdmin()).toBe(false);
      expect(service.selectedOrg()).toBeNull();
    });
  });

  describe('loadOrganisations - profile request', () => {
    it('sets isSuperAdmin from the profile response', () => {
      // Arrange
      init();

      // Act
      service.loadOrganisations();

      // Assert
      const profileReq = httpMock.expectOne(PROFILE_URL);
      expect(profileReq.request.method).toBe('GET');
      profileReq.flush({
        userId: 'u1',
        email: 'a@b.c',
        isSuperAdmin: true,
      } satisfies UserProfileResponse);

      httpMock.expectOne(MEMBERSHIPS_URL).flush([]);

      expect(service.isSuperAdmin()).toBe(true);
    });

    it('resets isSuperAdmin to false when the profile request errors', () => {
      // Arrange
      init();
      service.isSuperAdmin.set(true);

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).error(new ProgressEvent('error'));
      httpMock.expectOne(MEMBERSHIPS_URL).flush([]);

      expect(service.isSuperAdmin()).toBe(false);
    });
  });

  describe('loadOrganisations - memberships request', () => {
    it('sets loading to true while requests are in flight', () => {
      // Arrange
      init();

      // Act
      service.loadOrganisations();

      // Assert
      expect(service.loading()).toBe(true);

      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock.expectOne(MEMBERSHIPS_URL).flush([]);
    });

    it('maps memberships into OrgWithRole objects', () => {
      // Arrange
      init();

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock
        .expectOne(MEMBERSHIPS_URL)
        .flush([
          membership('org-1', 'Venue One', 'OrgAdmin', 'Europe/Vienna'),
          membership('org-2', 'Venue Two', 'Editor', 'America/New_York'),
        ]);

      expect(service.organisations()).toEqual([
        { id: 'org-1', name: 'Venue One', timeZone: 'Europe/Vienna', role: 'OrgAdmin' },
        { id: 'org-2', name: 'Venue Two', timeZone: 'America/New_York', role: 'Editor' },
      ]);
      expect(service.loading()).toBe(false);
    });

    it('auto-selects the first organisation when no org is stored', () => {
      // Arrange
      init();

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock
        .expectOne(MEMBERSHIPS_URL)
        .flush([
          membership('org-1', 'Venue One', 'OrgAdmin'),
          membership('org-2', 'Venue Two', 'Editor'),
        ]);

      expect(service.selectedOrgId()).toBe('org-1');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('org-1');
    });

    it('auto-selects the first organisation when the stored org is no longer valid', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'deleted-org');
      init();

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock.expectOne(MEMBERSHIPS_URL).flush([membership('org-9', 'Venue Nine', 'Viewer')]);

      expect(service.selectedOrgId()).toBe('org-9');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('org-9');
    });

    it('keeps the stored organisation when it is still valid', () => {
      // Arrange
      localStorage.setItem(STORAGE_KEY, 'org-2');
      init();

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock
        .expectOne(MEMBERSHIPS_URL)
        .flush([
          membership('org-1', 'Venue One', 'OrgAdmin'),
          membership('org-2', 'Venue Two', 'Editor'),
        ]);

      expect(service.selectedOrgId()).toBe('org-2');
    });

    it('does not auto-select anything when there are no memberships', () => {
      // Arrange
      init();

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock.expectOne(MEMBERSHIPS_URL).flush([]);

      expect(service.selectedOrgId()).toBeNull();
      expect(service.organisations()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('sets loading to false when the memberships request errors', () => {
      // Arrange
      init();

      // Act
      service.loadOrganisations();

      // Assert
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock.expectOne(MEMBERSHIPS_URL).error(new ProgressEvent('error'));

      expect(service.loading()).toBe(false);
      expect(service.organisations()).toEqual([]);
    });
  });

  describe('select', () => {
    it('updates the selectedOrgId signal and persists it to localStorage', () => {
      // Arrange
      init();

      // Act
      service.select('chosen-org');

      // Assert
      expect(service.selectedOrgId()).toBe('chosen-org');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('chosen-org');
    });
  });

  describe('selectedOrg computed', () => {
    it('resolves to the organisation matching the selected id', () => {
      // Arrange
      init();
      service.loadOrganisations();
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock
        .expectOne(MEMBERSHIPS_URL)
        .flush([
          membership('org-1', 'Venue One', 'OrgAdmin'),
          membership('org-2', 'Venue Two', 'Editor'),
        ]);

      // Act
      service.select('org-2');

      // Assert
      expect(service.selectedOrg()).toEqual({
        id: 'org-2',
        name: 'Venue Two',
        timeZone: 'Europe/Berlin',
        role: 'Editor',
      });
    });

    it('resolves to null when the selected id is not in the loaded organisations', () => {
      // Arrange
      init();
      service.loadOrganisations();
      httpMock.expectOne(PROFILE_URL).flush({ userId: 'u1', email: 'a@b.c', isSuperAdmin: false });
      httpMock.expectOne(MEMBERSHIPS_URL).flush([membership('org-1', 'Venue One', 'OrgAdmin')]);

      // Act
      service.select('unknown-org');

      // Assert
      expect(service.selectedOrg()).toBeNull();
    });
  });
});
