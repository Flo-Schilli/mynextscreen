import { TestBed, ComponentFixture, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { OrgNotificationConfig } from './org-notification-config';
import {
  OrgNotificationConfigService,
  OrgNotificationConfigFull,
} from './org-notification-config.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ToastService, Toast } from '../../shared/toast/toast.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-1';

function fullConfig(overrides: Partial<OrgNotificationConfigFull> = {}): OrgNotificationConfigFull {
  return {
    id: 'cfg-1',
    organisationId: ORG_ID,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPassword: null,
    smtpFrom: null,
    smtpSecure: false,
    ntfyUrl: null,
    ntfyTopic: null,
    ntfyToken: null,
    ...overrides,
  };
}

interface ConfigServiceStub {
  getConfig: ReturnType<typeof vi.fn>;
  updateConfig: ReturnType<typeof vi.fn>;
  testEmail: ReturnType<typeof vi.fn>;
  testNtfy: ReturnType<typeof vi.fn>;
}

describe('OrgNotificationConfig', () => {
  let fixture: ComponentFixture<OrgNotificationConfig>;
  let component: OrgNotificationConfig;
  let configService: ConfigServiceStub;
  let selectedOrgId: string | null;
  let toastService: ToastService;

  function lastToast(): Toast | undefined {
    return toastService.toasts().at(-1);
  }

  function setup(): void {
    configService = {
      getConfig: vi.fn().mockReturnValue(of(fullConfig())),
      updateConfig: vi.fn().mockReturnValue(of(fullConfig())),
      testEmail: vi.fn().mockReturnValue(of({ message: 'sent' })),
      testNtfy: vi.fn().mockReturnValue(of({ message: 'sent' })),
    };

    TestBed.configureTestingModule({
      imports: [OrgNotificationConfig],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrgNotificationConfigService, useValue: configService },
        {
          provide: OrganisationStateService,
          useValue: { selectedOrgId: () => selectedOrgId },
        },
      ],
    });

    fixture = TestBed.createComponent(OrgNotificationConfig);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
  }

  beforeEach(() => {
    selectedOrgId = ORG_ID;
  });

  describe('initial load', () => {
    it('should create', () => {
      setup();
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should load config and clear loading on init', () => {
      setup();
      configService.getConfig.mockReturnValue(
        of(fullConfig({ smtpHost: 'smtp.example.com', smtpPort: 587, smtpSecure: true })),
      );

      fixture.detectChanges();

      expect(configService.getConfig).toHaveBeenCalledWith(ORG_ID);
      expect(component.loading).toBe(false);
      expect(component.loadError).toBe('');
      expect(component.smtpHost).toBe('smtp.example.com');
      expect(component.smtpPort).toBe(587);
      expect(component.smtpSecure).toBe(true);
    });

    it('should map masked password/token into has-flags and blank fields', () => {
      setup();
      configService.getConfig.mockReturnValue(
        of(fullConfig({ smtpPassword: '••••••••', ntfyToken: '••••••••' })),
      );

      fixture.detectChanges();

      expect(component.hasSmtpPassword).toBe(true);
      expect(component.hasNtfyToken).toBe(true);
      expect(component.smtpPassword).toBe('');
      expect(component.ntfyToken).toBe('');
    });

    it('should leave has-flags false when no secrets saved', () => {
      setup();
      fixture.detectChanges();

      expect(component.hasSmtpPassword).toBe(false);
      expect(component.hasNtfyToken).toBe(false);
    });

    it('should set loadError when no org is selected', () => {
      selectedOrgId = null;
      setup();

      fixture.detectChanges();

      expect(component.loadError).toBe('No organisation selected.');
      expect(component.loading).toBe(false);
      expect(configService.getConfig).not.toHaveBeenCalled();
    });

    it('should set loadError on config load failure', () => {
      setup();
      configService.getConfig.mockReturnValue(throwError(() => new Error('boom')));

      fixture.detectChanges();

      expect(component.loadError).toBe('Failed to load notification configuration.');
      expect(component.loading).toBe(false);
    });
  });

  describe('conditional rendering', () => {
    it('should render loading text while loading', () => {
      setup();
      configService.getConfig.mockReturnValue(throwError(() => new Error('x')));
      // Render once before load resolves is not possible synchronously here,
      // so assert the loading branch via a never-completing observable.
      configService.getConfig.mockReturnValue(of()); // emits nothing -> stays loading

      fixture.detectChanges();

      const loadingEl = fixture.debugElement.query(By.css('.loading-text'));
      expect(loadingEl).toBeTruthy();
      expect(component.loading).toBe(true);
    });

    it('should render error text and hide sections on load failure', () => {
      setup();
      configService.getConfig.mockReturnValue(throwError(() => new Error('x')));

      fixture.detectChanges();

      const errorEl = fixture.debugElement.query(By.css('.error'));
      expect(errorEl.nativeElement.textContent).toContain(
        'Failed to load notification configuration.',
      );
      expect(fixture.debugElement.query(By.css('.section'))).toBeNull();
    });

    it('should render both config sections after successful load', () => {
      setup();
      fixture.detectChanges();

      const sections = fixture.debugElement.queryAll(By.css('.section'));
      expect(sections.length).toBe(2);
      expect(fixture.debugElement.query(By.css('.loading-text'))).toBeNull();
    });
  });

  describe('saveSmtp', () => {
    it('should send sanitized payload without password when not typed', () => {
      setup();
      fixture.detectChanges();

      component.smtpHost = 'smtp.example.com';
      component.smtpPort = 587;
      component.smtpUser = '';
      component.smtpFrom = 'noreply@example.com';
      component.smtpSecure = true;
      component.smtpPassword = '';

      component.saveSmtp();

      expect(configService.updateConfig).toHaveBeenCalledWith(ORG_ID, {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: null,
        smtpFrom: 'noreply@example.com',
        smtpSecure: true,
      });
      expect(component.savingSmtp).toBe(false);
      expect(lastToast()?.message).toBe('SMTP settings saved.');
      expect(lastToast()?.type).toBe('success');
    });

    it('should include password only when typed', () => {
      setup();
      fixture.detectChanges();

      component.smtpPassword = 'secret';
      component.saveSmtp();

      const payload = configService.updateConfig.mock.calls[0][1] as Record<string, unknown>;
      expect(payload['smtpPassword']).toBe('secret');
    });

    it('should not call service when org missing', () => {
      selectedOrgId = null;
      setup();
      fixture.detectChanges();
      configService.updateConfig.mockClear();

      component.saveSmtp();

      expect(configService.updateConfig).not.toHaveBeenCalled();
    });

    it('should show error toast on save failure', () => {
      setup();
      fixture.detectChanges();
      configService.updateConfig.mockReturnValue(throwError(() => new Error('fail')));

      component.saveSmtp();

      expect(component.savingSmtp).toBe(false);
      expect(lastToast()?.message).toBe('Failed to save SMTP settings.');
      expect(lastToast()?.type).toBe('error');
    });

    it('should re-apply config returned from save', () => {
      setup();
      fixture.detectChanges();
      configService.updateConfig.mockReturnValue(
        of(fullConfig({ smtpHost: 'new.host', smtpPassword: '••••••••' })),
      );

      component.saveSmtp();

      expect(component.smtpHost).toBe('new.host');
      expect(component.hasSmtpPassword).toBe(true);
    });
  });

  describe('saveNtfy', () => {
    it('should send sanitized payload without token when not typed', () => {
      setup();
      fixture.detectChanges();

      component.ntfyUrl = 'https://ntfy.sh';
      component.ntfyTopic = '';
      component.ntfyToken = '';

      component.saveNtfy();

      expect(configService.updateConfig).toHaveBeenCalledWith(ORG_ID, {
        ntfyUrl: 'https://ntfy.sh',
        ntfyTopic: null,
      });
      expect(component.savingNtfy).toBe(false);
      expect(lastToast()?.message).toBe('ntfy settings saved.');
    });

    it('should include token only when typed', () => {
      setup();
      fixture.detectChanges();

      component.ntfyToken = 'tok';
      component.saveNtfy();

      const payload = configService.updateConfig.mock.calls[0][1] as Record<string, unknown>;
      expect(payload['ntfyToken']).toBe('tok');
    });

    it('should not call service when org missing', () => {
      selectedOrgId = null;
      setup();
      fixture.detectChanges();
      configService.updateConfig.mockClear();

      component.saveNtfy();

      expect(configService.updateConfig).not.toHaveBeenCalled();
    });

    it('should show error toast on save failure', () => {
      setup();
      fixture.detectChanges();
      configService.updateConfig.mockReturnValue(throwError(() => new Error('fail')));

      component.saveNtfy();

      expect(component.savingNtfy).toBe(false);
      expect(lastToast()?.message).toBe('Failed to save ntfy settings.');
      expect(lastToast()?.type).toBe('error');
    });
  });

  describe('testEmail', () => {
    it('should show success toast with server message', () => {
      setup();
      fixture.detectChanges();
      configService.testEmail.mockReturnValue(of({ message: 'Test email sent' }));

      component.testEmail();

      expect(configService.testEmail).toHaveBeenCalledWith(ORG_ID);
      expect(component.testingEmail).toBe(false);
      expect(lastToast()?.message).toBe('Test email sent');
      expect(lastToast()?.type).toBe('success');
    });

    it('should surface server error message on failure', () => {
      setup();
      fixture.detectChanges();
      configService.testEmail.mockReturnValue(
        throwError(() => ({ error: { message: 'SMTP not configured' } })),
      );

      component.testEmail();

      expect(component.testingEmail).toBe(false);
      expect(lastToast()?.message).toBe('SMTP not configured');
      expect(lastToast()?.type).toBe('error');
    });

    it('should use fallback message when error has no message', () => {
      setup();
      fixture.detectChanges();
      configService.testEmail.mockReturnValue(throwError(() => ({})));

      component.testEmail();

      expect(lastToast()?.message).toBe('Failed to send test email.');
    });

    it('should not call service when org missing', () => {
      selectedOrgId = null;
      setup();
      fixture.detectChanges();
      configService.testEmail.mockClear();

      component.testEmail();

      expect(configService.testEmail).not.toHaveBeenCalled();
    });
  });

  describe('testNtfy', () => {
    it('should show success toast with server message', () => {
      setup();
      fixture.detectChanges();
      configService.testNtfy.mockReturnValue(of({ message: 'Test push sent' }));

      component.testNtfy();

      expect(configService.testNtfy).toHaveBeenCalledWith(ORG_ID);
      expect(component.testingNtfy).toBe(false);
      expect(lastToast()?.message).toBe('Test push sent');
      expect(lastToast()?.type).toBe('success');
    });

    it('should surface server error message on failure', () => {
      setup();
      fixture.detectChanges();
      configService.testNtfy.mockReturnValue(
        throwError(() => ({ error: { message: 'ntfy unreachable' } })),
      );

      component.testNtfy();

      expect(lastToast()?.message).toBe('ntfy unreachable');
      expect(lastToast()?.type).toBe('error');
    });

    it('should use fallback message when error has no message', () => {
      setup();
      fixture.detectChanges();
      configService.testNtfy.mockReturnValue(throwError(() => ({})));

      component.testNtfy();

      expect(lastToast()?.message).toBe('Failed to send test notification.');
    });

    it('should not call service when org missing', () => {
      selectedOrgId = null;
      setup();
      fixture.detectChanges();
      configService.testNtfy.mockClear();

      component.testNtfy();

      expect(configService.testNtfy).not.toHaveBeenCalled();
    });
  });

  describe('toast lifecycle', () => {
    it('should enqueue a success toast on the global service after a test send', () => {
      setup();
      fixture.detectChanges();
      configService.testEmail.mockReturnValue(of({ message: 'Visible toast' }));

      component.testEmail();

      expect(lastToast()?.message).toBe('Visible toast');
      expect(lastToast()?.type).toBe('success');
    });

    it('emits exactly one toast per action', () => {
      setup();
      fixture.detectChanges();
      const before = toastService.toasts().length;
      configService.testEmail.mockReturnValue(of({ message: 'once' }));

      component.testEmail();

      expect(toastService.toasts().length).toBe(before + 1);
    });
  });

  describe('navigation', () => {
    it('should navigate to user management on goBack', () => {
      setup();
      fixture.detectChanges();
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      component.goBack();

      expect(navSpy).toHaveBeenCalledWith(['/settings/users']);
    });
  });
});
