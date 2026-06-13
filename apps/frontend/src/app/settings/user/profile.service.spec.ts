import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProfileService, UserProfile } from './profile.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const mockProfile: UserProfile = {
  userId: 'u-1',
  email: 'me@example.com',
  name: 'Me',
  isSuperAdmin: false,
};

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the current profile', () => {
    service.getProfile().subscribe((profile) => {
      expect(profile).toEqual(mockProfile);
    });

    const req = httpMock.expectOne('/api/me/profile');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('PATCHes a new display name', () => {
    service.updateProfile({ name: 'New Name' }).subscribe((profile) => {
      expect(profile.name).toBe('New Name');
    });

    const req = httpMock.expectOne('/api/me/profile');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'New Name' });
    req.flush({ ...mockProfile, name: 'New Name' });
  });

  it('PATCHes null to clear the display name', () => {
    service.updateProfile({ name: null }).subscribe();

    const req = httpMock.expectOne('/api/me/profile');
    expect(req.request.body).toEqual({ name: null });
    req.flush({ ...mockProfile, name: null });
  });
});
