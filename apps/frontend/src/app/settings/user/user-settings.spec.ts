import { TestBed, ComponentFixture, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { UserSettings } from './user-settings';
import { NotificationPreferences } from './notification-preferences.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-123';

const mockPrefs: NotificationPreferences = {
  id: 'pref-1',
  userId: 'user-1',
  organisationId: ORG_ID,
  inAppEnabled: true,
  emailEnabled: false,
  ntfyEnabled: false,
};

describe('UserSettings', () => {
  let fixture: ComponentFixture<UserSettings>;
  let component: UserSettings;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: OrganisationStateService,
          useValue: {
            selectedOrgId: signal(ORG_ID),
            organisations: signal([]),
            selectedOrg: signal(null),
            loading: signal(false),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(UserSettings);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    component.ngOnDestroy();
  });

  function flushInit(
    orgConfig: { smtpHost: string | null; ntfyUrl: string | null } = {
      smtpHost: 'smtp.example.com',
      ntfyUrl: null,
    },
  ): void {
    fixture.detectChanges();

    const prefsReq = httpMock.expectOne('/api/me/notification-preferences');
    prefsReq.flush(mockPrefs);

    const configReq = httpMock.expectOne(`/api/organisations/${ORG_ID}/notification-config`);
    configReq.flush(orgConfig);
  }

  it('should create', () => {
    flushInit();
    expect(component).toBeTruthy();
  });

  it('should load preferences on init', () => {
    expect(component.loading).toBe(true);
    flushInit();
    expect(component.loading).toBe(false);
    expect(component.preferences).toEqual(mockPrefs);
  });

  it('should set orgSmtpConfigured based on org config', () => {
    flushInit();
    expect(component.orgSmtpConfigured).toBe(true);
    expect(component.orgNtfyConfigured).toBe(false);
  });

  it('should detect ntfy configured', () => {
    flushInit({ smtpHost: null, ntfyUrl: 'https://ntfy.sh' });
    expect(component.orgSmtpConfigured).toBe(false);
    expect(component.orgNtfyConfigured).toBe(true);
  });

  it('should handle preferences load error', () => {
    fixture.detectChanges();

    const prefsReq = httpMock.expectOne('/api/me/notification-preferences');
    prefsReq.error(new ProgressEvent('error'));

    const configReq = httpMock.expectOne(`/api/organisations/${ORG_ID}/notification-config`);
    configReq.flush({ smtpHost: null, ntfyUrl: null });

    expect(component.loading).toBe(false);
    expect(component.loadError).toBe('Failed to load notification preferences.');
  });

  it('should handle org config load error gracefully', () => {
    fixture.detectChanges();

    const prefsReq = httpMock.expectOne('/api/me/notification-preferences');
    prefsReq.flush(mockPrefs);

    const configReq = httpMock.expectOne(`/api/organisations/${ORG_ID}/notification-config`);
    configReq.error(new ProgressEvent('error'));

    expect(component.orgSmtpConfigured).toBe(false);
    expect(component.orgNtfyConfigured).toBe(false);
  });

  it('should toggle a preference optimistically', () => {
    flushInit();

    component.toggle('emailEnabled');
    expect(component.preferences!.emailEnabled).toBe(true);

    component.toggle('emailEnabled');
    expect(component.preferences!.emailEnabled).toBe(false);
  });

  it('should send PATCH after debounce', async () => {
    flushInit();

    component.toggle('emailEnabled');

    // Wait for debounce (300ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

    const patchReq = httpMock.expectOne('/api/me/notification-preferences');
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({
      inAppEnabled: true,
      emailEnabled: true,
      ntfyEnabled: false,
    });
    patchReq.flush({ ...mockPrefs, emailEnabled: true });

    expect(component.toastMessage).toBe('Preferences saved.');
    expect(component.toastType).toBe('success');
  });

  it('should debounce rapid toggles into one PATCH', async () => {
    flushInit();

    component.toggle('emailEnabled');
    component.toggle('ntfyEnabled');

    await new Promise((resolve) => setTimeout(resolve, 350));

    // Only one PATCH should be sent
    const patchReq = httpMock.expectOne('/api/me/notification-preferences');
    expect(patchReq.request.body).toEqual({
      inAppEnabled: true,
      emailEnabled: true,
      ntfyEnabled: true,
    });
    patchReq.flush({
      ...mockPrefs,
      emailEnabled: true,
      ntfyEnabled: true,
    });
  });

  it('should show error toast on save failure', async () => {
    flushInit();

    component.toggle('inAppEnabled');

    await new Promise((resolve) => setTimeout(resolve, 350));

    const patchReq = httpMock.expectOne('/api/me/notification-preferences');
    patchReq.error(new ProgressEvent('error'));

    expect(component.toastMessage).toBe('Failed to save preferences.');
    expect(component.toastType).toBe('error');
  });

  it('should not save if preferences not loaded', async () => {
    flushInit();
    component.preferences = null;
    component.toggle('emailEnabled');

    await new Promise((resolve) => setTimeout(resolve, 350));

    // No PATCH request should be made
    httpMock.expectNone('/api/me/notification-preferences');
  });

  it('changes the password and shows a success toast', async () => {
    flushInit();
    component.passwordForm.setValue({
      currentPassword: 'old',
      newPassword: 'supersecret',
      confirmNewPassword: 'supersecret',
    });

    const promise = component.submitPassword();
    const req = httpMock.expectOne('/api/auth/change-password');
    expect(req.request.body).toEqual({ currentPassword: 'old', newPassword: 'supersecret' });
    req.flush(null);
    await promise;

    expect(component.toastMessage).toBe('Password updated.');
    expect(component.toastType).toBe('success');
  });

  it('does not submit an invalid password form', async () => {
    flushInit();
    component.passwordForm.setValue({
      currentPassword: 'old',
      newPassword: 'short',
      confirmNewPassword: 'mismatch',
    });

    await component.submitPassword();

    httpMock.expectNone('/api/auth/change-password');
  });

  it('requests an email change and shows a success toast', async () => {
    flushInit();
    component.emailForm.setValue({ newEmail: 'new@example.com', currentPassword: 'pw' });

    const promise = component.submitEmail();
    const req = httpMock.expectOne('/api/auth/change-email');
    expect(req.request.body).toEqual({ newEmail: 'new@example.com', currentPassword: 'pw' });
    req.flush(null);
    await promise;

    expect(component.toastMessage).toContain('Confirmation link');
    expect(component.toastType).toBe('success');
  });
});
