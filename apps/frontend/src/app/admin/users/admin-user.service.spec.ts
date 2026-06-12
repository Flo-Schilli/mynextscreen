import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { AdminUserService } from './admin-user.service';
import { AdminUser } from './admin-user.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const BASE_URL = '/api/admin/users';

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    emailVerified: true,
    isSuperAdmin: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    memberships: [{ organisationId: 'org-1', organisationName: 'Acme', role: 'org_admin' }],
    ...overrides,
  };
}

describe('AdminUserService', () => {
  let service: AdminUserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AdminUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('issues a GET to the admin users URL and returns the list', () => {
      // Arrange
      const users = [makeUser(), makeUser({ id: 'user-2', email: 'b@example.com' })];
      let received: AdminUser[] | undefined;

      // Act
      service.getAll().subscribe((result) => (received = result));
      const req = httpMock.expectOne(BASE_URL);

      // Assert
      expect(req.request.method).toBe('GET');
      req.flush(users);
      expect(received).toEqual(users);
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
      req.flush('boom', { status: 403, statusText: 'Forbidden' });

      // Assert
      expect(errorStatus).toBe(403);
    });
  });

  describe('delete', () => {
    it('issues a DELETE to the user detail URL and completes with no body', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete('user-1').subscribe({ complete: () => (completed = true) });
      const req = httpMock.expectOne(`${BASE_URL}/user-1`);

      // Assert
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(completed).toBe(true);
    });

    it('does not attach an X-Organisation-Id header (super-admin scoped)', () => {
      // Arrange & Act
      service.delete('user-1').subscribe();
      const req = httpMock.expectOne(`${BASE_URL}/user-1`);

      // Assert
      expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
      req.flush(null);
    });
  });
});
