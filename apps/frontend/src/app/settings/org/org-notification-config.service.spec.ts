import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  OrgNotificationConfigService,
  OrgNotificationConfigFull,
  UpdateOrgNotificationConfig,
} from './org-notification-config.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-1';
const BASE = `/api/organisations/${ORG_ID}/notification-config`;

function makeConfig(overrides: Partial<OrgNotificationConfigFull> = {}): OrgNotificationConfigFull {
  return {
    id: 'cfg-1',
    organisationId: ORG_ID,
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'mailer',
    smtpPassword: 'secret',
    smtpFrom: 'no-reply@example.com',
    smtpSecure: true,
    ntfyUrl: 'https://ntfy.sh',
    ntfyTopic: 'signage',
    ntfyToken: 'tk_123',
    ...overrides,
  };
}

describe('OrgNotificationConfigService', () => {
  let service: OrgNotificationConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(OrgNotificationConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getConfig', () => {
    it('issues a GET to the notification-config URL and returns the full config', () => {
      // Arrange
      const config = makeConfig();
      let received: OrgNotificationConfigFull | undefined;

      // Act
      service.getConfig(ORG_ID).subscribe((result) => (received = result));
      const req = httpMock.expectOne(BASE);

      // Assert
      expect(req.request.method).toBe('GET');
      req.flush(config);
      expect(received).toEqual(config);
    });

    it('propagates HTTP errors', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getConfig(ORG_ID).subscribe({ error: (err) => (errorStatus = err.status) });
      const req = httpMock.expectOne(BASE);
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      // Assert
      expect(errorStatus).toBe(500);
    });
  });

  describe('updateConfig', () => {
    it('issues a PATCH to the notification-config URL with the partial config body', () => {
      // Arrange
      const update: UpdateOrgNotificationConfig = { smtpHost: 'new.example.com', smtpPort: 465 };
      const updated = makeConfig({ smtpHost: 'new.example.com', smtpPort: 465 });
      let received: OrgNotificationConfigFull | undefined;

      // Act
      service.updateConfig(ORG_ID, update).subscribe((result) => (received = result));
      const req = httpMock.expectOne(BASE);

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(update);
      req.flush(updated);
      expect(received).toEqual(updated);
    });

    it('forwards explicit null values in the body to clear fields', () => {
      // Arrange
      const update: UpdateOrgNotificationConfig = { ntfyToken: null, smtpPassword: null };

      // Act
      service.updateConfig(ORG_ID, update).subscribe();
      const req = httpMock.expectOne(BASE);

      // Assert
      expect(req.request.body).toEqual(update);
      req.flush(makeConfig({ ntfyToken: null, smtpPassword: null }));
    });
  });

  describe('testEmail', () => {
    it('issues a POST with an empty body and returns the message', () => {
      // Arrange
      let received: { message: string } | undefined;

      // Act
      service.testEmail(ORG_ID).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE}/test-email`);

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ message: 'sent' });
      expect(received).toEqual({ message: 'sent' });
    });

    it('propagates failures from the email test endpoint', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.testEmail(ORG_ID).subscribe({ error: (err) => (errorStatus = err.status) });
      const req = httpMock.expectOne(`${BASE}/test-email`);
      req.flush('smtp down', { status: 502, statusText: 'Bad Gateway' });

      // Assert
      expect(errorStatus).toBe(502);
    });
  });

  describe('testNtfy', () => {
    it('issues a POST with an empty body and returns the message', () => {
      // Arrange
      let received: { message: string } | undefined;

      // Act
      service.testNtfy(ORG_ID).subscribe((result) => (received = result));
      const req = httpMock.expectOne(`${BASE}/test-ntfy`);

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ message: 'ntfy ok' });
      expect(received).toEqual({ message: 'ntfy ok' });
    });

    it('propagates failures from the ntfy test endpoint', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.testNtfy(ORG_ID).subscribe({ error: (err) => (errorStatus = err.status) });
      const req = httpMock.expectOne(`${BASE}/test-ntfy`);
      req.flush('ntfy down', { status: 502, statusText: 'Bad Gateway' });

      // Assert
      expect(errorStatus).toBe(502);
    });
  });
});
