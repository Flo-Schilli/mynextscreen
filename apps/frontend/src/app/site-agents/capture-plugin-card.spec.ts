import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { CapturePluginCard, CAPTURE_STATUS_POLL_MS } from './capture-plugin-card';
import { CapturePluginService } from './capture-plugin.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { ToastService } from '../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import type { CapturePluginStatus } from './site-agent.model';

function makeStatus(overrides: Partial<CapturePluginStatus> = {}): CapturePluginStatus {
  return {
    state: 'ready',
    pluginVersion: '1.2.0',
    sdkVersion: '6.1.0',
    errorCode: null,
    license: null,
    licenseTextAvailable: true,
    acceptance: null,
    reportedAt: '2026-10-18T10:00:00.000Z',
    ...overrides,
  };
}

const DASHBOARD_ACCEPTANCE = {
  licenseSha256: 'a'.repeat(64),
  source: 'dashboard' as const,
  acceptedAt: '2026-10-17T09:00:00.000Z',
  acceptedBy: { id: 'u1', name: 'Erika Muster' },
};

describe('CapturePluginCard', () => {
  let fixture: ComponentFixture<CapturePluginCard>;
  let service: {
    getStatus: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
  };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  const role = signal('org_admin');

  const q = (testId: string): HTMLElement | null =>
    (fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement ??
      null) as HTMLElement | null;
  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function create(status: CapturePluginStatus): Promise<void> {
    service.getStatus.mockReturnValue(of(status));
    fixture = TestBed.createComponent(CapturePluginCard);
    fixture.componentRef.setInput('agentId', 'a1');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    vi.useFakeTimers();
    role.set('org_admin');
    service = { getStatus: vi.fn(), revoke: vi.fn().mockReturnValue(of(undefined)) };
    toast = { success: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [
        CapturePluginCard,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CapturePluginService, useValue: service },
        { provide: ToastService, useValue: toast },
        {
          provide: OrganisationStateService,
          useValue: {
            isSuperAdmin: signal(false),
            selectedOrg: signal({ id: 'o1', name: 'Acme', timeZone: 'UTC', role: role() }),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.useRealTimers());

  it('shows title, platform note, versions and trademark', async () => {
    await create(makeStatus());

    expect(text()).toContain('Video capture plugin (NDI®-compatible)');
    expect(text()).toContain('x86-64 only');
    expect(q('capture-plugin-version')?.textContent).toContain('1.2.0');
    expect(q('capture-sdk-version')?.textContent).toContain('6.1.0');
    expect(text()).toContain('registered trademark of Vizrt NDI AB');
  });

  it.each([
    ['absent', 'Not installed or not reachable'],
    ['license_required', 'License acceptance required'],
    ['ready', 'Ready'],
    ['incompatible', 'Incompatible version'],
  ] as const)('labels state %s', async (state, label) => {
    await create(makeStatus({ state, licenseTextAvailable: true }));

    expect(q('capture-state')?.textContent?.trim()).toBe(label);
  });

  it('shows the error code for the error state', async () => {
    await create(makeStatus({ state: 'error', errorCode: 'ndi_load_failed' }));

    expect(q('capture-state')?.textContent).toContain('ndi_load_failed');
  });

  it('offers Enable to admins when the license text is available', async () => {
    await create(makeStatus({ state: 'license_required', licenseTextAvailable: true }));

    expect(q('capture-enable')).not.toBeNull();
    expect(q('capture-waiting')).toBeNull();
  });

  it('shows a waiting hint instead of Enable while the text is missing', async () => {
    await create(makeStatus({ state: 'license_required', licenseTextAvailable: false }));

    expect(q('capture-enable')).toBeNull();
    expect(q('capture-waiting')?.textContent).toContain('Waiting for the agent');
  });

  it('hides Enable and Revoke from non-admins', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [
        CapturePluginCard,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CapturePluginService, useValue: service },
        { provide: ToastService, useValue: toast },
        {
          provide: OrganisationStateService,
          useValue: {
            isSuperAdmin: signal(false),
            selectedOrg: signal({ id: 'o1', name: 'Acme', timeZone: 'UTC', role: 'editor' }),
          },
        },
      ],
    }).compileComponents();

    await create(makeStatus({ state: 'license_required', acceptance: DASHBOARD_ACCEPTANCE }));

    expect(q('capture-enable')).toBeNull();
    expect(q('capture-revoke')).toBeNull();
  });

  it('shows who accepted and when, and offers Revoke', async () => {
    await create(makeStatus({ acceptance: DASHBOARD_ACCEPTANCE }));

    expect(q('capture-acceptance')?.textContent).toContain('Accepted by Erika Muster');
    expect(q('capture-revoke')).not.toBeNull();
  });

  it('marks a device acceptance and offers no Revoke', async () => {
    await create(
      makeStatus({
        acceptance: { ...DASHBOARD_ACCEPTANCE, source: 'device', acceptedBy: null },
      }),
    );

    expect(q('capture-acceptance')?.textContent).toContain('Accepted on the device');
    expect(q('capture-device-hint')).not.toBeNull();
    expect(q('capture-revoke')).toBeNull();
  });

  it('revokes only after confirmation, then toasts and refreshes', async () => {
    await create(makeStatus({ acceptance: DASHBOARD_ACCEPTANCE }));

    q('capture-revoke')?.querySelector('button')?.click();
    fixture.detectChanges();
    expect(service.revoke).not.toHaveBeenCalled();

    const confirm = fixture.debugElement.query(By.css('app-site-agent-confirm-modal'));
    expect(confirm).not.toBeNull();
    confirm.componentInstance.confirmed.emit();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(service.revoke).toHaveBeenCalledWith('a1');
    expect(toast.success).toHaveBeenCalled();
    expect(service.getStatus).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.css('app-site-agent-confirm-modal'))).toBeNull();
  });

  it('keeps the confirmation open with an error when revoking fails', async () => {
    service.revoke.mockReturnValue(throwError(() => new Error('boom')));
    await create(makeStatus({ acceptance: DASHBOARD_ACCEPTANCE }));

    q('capture-revoke')?.querySelector('button')?.click();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.css('app-site-agent-confirm-modal'))
      .componentInstance.confirmed.emit();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-site-agent-confirm-modal'))).not.toBeNull();
    expect(text()).toContain('Revoking the acceptance failed');
  });

  it('polls the status while mounted', async () => {
    await create(makeStatus());
    expect(service.getStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(CAPTURE_STATUS_POLL_MS);
    expect(service.getStatus).toHaveBeenCalledTimes(2);

    fixture.destroy();
    await vi.advanceTimersByTimeAsync(CAPTURE_STATUS_POLL_MS * 2);
    expect(service.getStatus).toHaveBeenCalledTimes(2);
  });
});
