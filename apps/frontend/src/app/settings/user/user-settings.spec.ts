import { TestBed, ComponentFixture, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { UserSettings } from './user-settings';
import { NotificationPreferences } from './notification-preferences.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ToastService, Toast } from '../../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

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

const mockProfile = {
  userId: 'user-1',
  email: 'me@example.com',
  name: 'Me',
  isSuperAdmin: false,
  gravatarEnabled: true,
  avatarUrl: 'https://www.gravatar.com/avatar/abc?d=identicon&s=160',
};

describe('UserSettings', () => {
  let fixture: ComponentFixture<UserSettings>;
  let component: UserSettings;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  function lastToast(): Toast | undefined {
    return toastService.toasts().at(-1);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
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
            avatarUrl: signal<string | null>(null),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(UserSettings);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpMock.verify();
    component.ngOnDestroy();
  });

  function flushInit(): void {
    fixture.detectChanges();

    const profileReq = httpMock.expectOne('/api/me/profile');
    profileReq.flush(mockProfile);

    const prefsReq = httpMock.expectOne('/api/me/notification-preferences');
    prefsReq.flush(mockPrefs);
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

  it('should handle preferences load error', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/me/profile').flush(mockProfile);

    const prefsReq = httpMock.expectOne('/api/me/notification-preferences');
    prefsReq.error(new ProgressEvent('error'));

    expect(component.loading).toBe(false);
    expect(component.loadError).toBe('Failed to load notification preferences.');
  });

  it('does not make an org-scoped notification-config request', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/me/profile').flush(mockProfile);
    httpMock.expectOne('/api/me/notification-preferences').flush(mockPrefs);

    httpMock.expectNone(`/api/organisations/${ORG_ID}/notification-config`);
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

    expect(lastToast()?.message).toBe('Preferences saved.');
    expect(lastToast()?.type).toBe('success');
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

    expect(lastToast()?.message).toBe('Failed to save preferences.');
    expect(lastToast()?.type).toBe('error');
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

    expect(lastToast()?.message).toBe('Password updated.');
    expect(lastToast()?.type).toBe('success');
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

    expect(lastToast()?.message).toContain('Confirmation link');
    expect(lastToast()?.type).toBe('success');
  });

  it('loads the profile and populates email and name on init', () => {
    flushInit();
    expect(component.loadingProfile).toBe(false);
    expect(component.profileEmail).toBe('me@example.com');
    expect(component.profileForm.controls.name.value).toBe('Me');
  });

  it('populates an empty name field when the profile name is null', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/me/profile').flush({ ...mockProfile, name: null });
    httpMock.expectOne('/api/me/notification-preferences').flush(mockPrefs);

    expect(component.profileForm.controls.name.value).toBe('');
  });

  it('saves a trimmed display name and shows a success toast', async () => {
    flushInit();
    component.profileForm.setValue({ name: '  New Name  ' });

    const promise = component.submitProfile();
    const req = httpMock.expectOne('/api/me/profile');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'New Name' });
    req.flush({ ...mockProfile, name: 'New Name' });
    await promise;

    expect(component.profileForm.controls.name.value).toBe('New Name');
    expect(lastToast()?.message).toBe('Profile saved.');
    expect(lastToast()?.type).toBe('success');
  });

  it('sends null when clearing the display name', async () => {
    flushInit();
    component.profileForm.setValue({ name: '   ' });

    const promise = component.submitProfile();
    const req = httpMock.expectOne('/api/me/profile');
    expect(req.request.body).toEqual({ name: null });
    req.flush({ ...mockProfile, name: null });
    await promise;

    expect(lastToast()?.type).toBe('success');
  });

  it('shows an error toast when the profile save fails', async () => {
    flushInit();
    component.profileForm.setValue({ name: 'Whatever' });

    const promise = component.submitProfile();
    const req = httpMock.expectOne('/api/me/profile');
    req.error(new ProgressEvent('error'));
    await promise;

    expect(lastToast()?.message).toBe('Could not save profile.');
    expect(lastToast()?.type).toBe('error');
  });

  it('loads the Gravatar opt-out and avatar URL on init', () => {
    flushInit();
    expect(component.gravatarEnabled).toBe(true);
    expect(component.avatarUrl).toBe(mockProfile.avatarUrl);
  });

  it('opts out of Gravatar and syncs the top-bar avatar', async () => {
    flushInit();
    const orgState = TestBed.inject(OrganisationStateService);

    const promise = component.toggleGravatar();
    const req = httpMock.expectOne('/api/me/profile');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ gravatarEnabled: false });
    req.flush({ ...mockProfile, gravatarEnabled: false, avatarUrl: null });
    await promise;

    expect(component.gravatarEnabled).toBe(false);
    expect(component.avatarUrl).toBeNull();
    expect(orgState.avatarUrl()).toBeNull();
    expect(lastToast()?.message).toBe('Profile saved.');
    expect(lastToast()?.type).toBe('success');
  });
});
