import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  NotificationPreferencesService,
  NotificationPreferences,
} from './notification-preferences.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationPreferencesService,
      ],
    });

    service = TestBed.inject(NotificationPreferencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getPreferences', () => {
    it('should GET notification preferences', () => {
      const mockPrefs: NotificationPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        organisationId: 'org-1',
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      };

      service.getPreferences().subscribe((prefs) => {
        expect(prefs).toEqual(mockPrefs);
      });

      const req = httpMock.expectOne('/api/me/notification-preferences');
      expect(req.request.method).toBe('GET');
      req.flush(mockPrefs);
    });
  });

  describe('updatePreferences', () => {
    it('should PATCH notification preferences', () => {
      const update = { emailEnabled: true };
      const mockResponse: NotificationPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        organisationId: 'org-1',
        inAppEnabled: true,
        emailEnabled: true,
        ntfyEnabled: false,
      };

      service.updatePreferences(update).subscribe((prefs) => {
        expect(prefs.emailEnabled).toBe(true);
      });

      const req = httpMock.expectOne('/api/me/notification-preferences');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(update);
      req.flush(mockResponse);
    });
  });

  describe('getOrgNotificationConfig', () => {
    it('should GET org notification config', () => {
      const mockConfig = {
        smtpHost: 'smtp.example.com',
        ntfyUrl: null,
      };

      service.getOrgNotificationConfig('org-1').subscribe((config) => {
        expect(config.smtpHost).toBe('smtp.example.com');
        expect(config.ntfyUrl).toBeNull();
      });

      const req = httpMock.expectOne('/api/organisations/org-1/notification-config');
      expect(req.request.method).toBe('GET');
      req.flush(mockConfig);
    });
  });
});
