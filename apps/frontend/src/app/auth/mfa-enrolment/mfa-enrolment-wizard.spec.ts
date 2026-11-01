import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { MfaEnrolmentWizardComponent } from './mfa-enrolment-wizard';
import { MfaEnrolmentStore } from './mfa-enrolment.store';
import { AuthService } from '../auth.service';
import { MfaService } from '../mfa.service';
import { ToastService } from '../../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SETUP = {
  otpauthUri: 'otpauth://totp/myNextScreen:me@example.com?secret=JBSWY3DPEHPK3PXP',
  qrDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  secret: 'JBSWY3DPEHPK3PXP',
};
const CODES = ['aaaaa-bbbbb', 'ccccc-ddddd'];

function setup(inputs: { requireCurrentCode?: boolean } = {}) {
  const mfa = {
    startSetup: vi.fn(() => Promise.resolve(SETUP)),
    confirmSetup: vi.fn(() => Promise.resolve(CODES)),
  };
  const auth = { completeEnrolment: vi.fn(() => Promise.resolve()) };
  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [
      provideZonelessChangeDetection(),
      { provide: MfaService, useValue: mfa },
      { provide: AuthService, useValue: auth },
    ],
  });
  const fixture = TestBed.createComponent(MfaEnrolmentWizardComponent);
  if (inputs.requireCurrentCode) {
    fixture.componentRef.setInput('requireCurrentCode', true);
  }
  fixture.detectChanges();
  const store = fixture.debugElement.injector.get(MfaEnrolmentStore);
  return { fixture, mfa, auth, store, toast: TestBed.inject(ToastService) };
}

function typeInto(fixture: ComponentFixture<unknown>, selector: string, value: string): void {
  const input = fixture.debugElement.query(By.css(selector)).nativeElement as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function click(fixture: ComponentFixture<unknown>, selector: string): void {
  fixture.debugElement.query(By.css(`${selector} button`)).nativeElement.click();
  fixture.detectChanges();
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

async function toCodesStep(ctx: ReturnType<typeof setup>): Promise<void> {
  typeInto(ctx.fixture, 'input[type="password"]', 'pw');
  click(ctx.fixture, '.continue');
  await settle(ctx.fixture);
  click(ctx.fixture, '.continue');
  typeInto(ctx.fixture, '#mfa-enrol-code', '123456');
  await settle(ctx.fixture);
}

describe('MfaEnrolmentWizardComponent', () => {
  it('starts with the password and then shows the QR code and the manual secret', async () => {
    const ctx = setup();
    expect(ctx.store.step()).toBe('password');

    typeInto(ctx.fixture, 'input[type="password"]', 'pw');
    click(ctx.fixture, '.continue');
    await settle(ctx.fixture);

    expect(ctx.mfa.startSetup).toHaveBeenCalledWith('pw', undefined);
    expect(ctx.store.step()).toBe('scan');
    const img = ctx.fixture.debugElement.query(By.css('img')).nativeElement as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(SETUP.qrDataUrl);
    expect(ctx.fixture.nativeElement.querySelector('.secret').textContent).toContain(SETUP.secret);
  });

  it('shows an inline error for a wrong password', async () => {
    const ctx = setup();
    ctx.mfa.startSetup.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 401, error: { code: 'MFA_INVALID_PASSWORD' } }),
    );
    typeInto(ctx.fixture, 'input[type="password"]', 'nope');
    click(ctx.fixture, '.continue');
    await settle(ctx.fixture);

    expect(ctx.store.step()).toBe('password');
    expect(ctx.fixture.nativeElement.textContent).toContain('The password is not correct');
  });

  it('tells a wrong current-device code apart from a wrong password', async () => {
    const ctx = setup({ requireCurrentCode: true });
    ctx.mfa.startSetup.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 401, error: { code: 'MFA_INVALID_CODE' } }),
    );
    typeInto(ctx.fixture, 'input[type="password"]', 'pw');
    typeInto(ctx.fixture, '#mfa-current-code', '000000');
    click(ctx.fixture, '.continue');
    await settle(ctx.fixture);

    expect(ctx.store.step()).toBe('password');
    expect(ctx.store.fieldError()).toContain('current authenticator app');
    expect(ctx.fixture.nativeElement.textContent).not.toContain('password is not correct');
  });

  it('toasts a 401 without an MFA code instead of blaming the password', async () => {
    const ctx = setup();
    ctx.mfa.startSetup.mockRejectedValueOnce(new HttpErrorResponse({ status: 401 }));
    typeInto(ctx.fixture, 'input[type="password"]', 'pw');
    click(ctx.fixture, '.continue');
    await settle(ctx.fixture);

    expect(ctx.store.fieldError()).toBeNull();
    expect(ctx.toast.toasts().at(-1)).toMatchObject({ type: 'error' });
  });

  it('asks for the current code on a device change', async () => {
    const ctx = setup({ requireCurrentCode: true });
    typeInto(ctx.fixture, 'input[type="password"]', 'pw');
    const continueBtn = ctx.fixture.debugElement.query(By.css('.continue button'))
      .nativeElement as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    typeInto(ctx.fixture, '#mfa-current-code', '987654');
    click(ctx.fixture, '.continue');
    await settle(ctx.fixture);

    expect(ctx.mfa.startSetup).toHaveBeenCalledWith('pw', '987654');
  });

  it('auto-submits the first code and reveals the recovery codes', async () => {
    const ctx = setup();
    await toCodesStep(ctx);

    expect(ctx.mfa.confirmSetup).toHaveBeenCalledWith('123456');
    expect(ctx.auth.completeEnrolment).toHaveBeenCalled();
    expect(ctx.store.step()).toBe('codes');
    // The secret is dropped as soon as the factor is persisted.
    expect(ctx.store.setup()).toBeNull();
    const list = ctx.fixture.nativeElement.querySelector('[data-testid="recovery-codes"]');
    expect(list.textContent).toContain('aaaaa-bbbbb');
    expect(list.textContent).toContain('ccccc-ddddd');
  });

  it('only finishes after the "saved" checkbox is ticked', async () => {
    const ctx = setup();
    const finished = vi.fn();
    ctx.fixture.componentInstance.finished.subscribe(finished);
    await toCodesStep(ctx);

    const finish = ctx.fixture.debugElement.query(By.css('.finish button'))
      .nativeElement as HTMLButtonElement;
    expect(finish.disabled).toBe(true);
    expect(ctx.fixture.componentInstance.canLeave()).toBe(false);
    finish.click();
    expect(finished).not.toHaveBeenCalled();

    const checkbox = ctx.fixture.nativeElement.querySelector('.saved-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    ctx.fixture.detectChanges();

    expect(finish.disabled).toBe(false);
    expect(ctx.fixture.componentInstance.canLeave()).toBe(true);
    finish.click();
    expect(finished).toHaveBeenCalledTimes(1);
    expect(ctx.store.recoveryCodes()).toEqual([]);
  });

  it('shows an inline error for a wrong first code', async () => {
    const ctx = setup();
    ctx.mfa.confirmSetup.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 401, error: { code: 'MFA_INVALID_CODE' } }),
    );
    await toCodesStep(ctx);
    expect(ctx.store.step()).toBe('verify');
    expect(ctx.store.fieldError()).toContain('not valid');
  });

  it('restarts with a toast when the pending setup expired', async () => {
    const ctx = setup();
    ctx.mfa.confirmSetup.mockRejectedValueOnce(new HttpErrorResponse({ status: 400 }));
    await toCodesStep(ctx);
    expect(ctx.store.step()).toBe('password');
    expect(ctx.store.setup()).toBeNull();
    expect(ctx.toast.toasts().at(-1)?.message).toContain('expired');
  });

  it('wipes every secret when the wizard is destroyed', async () => {
    const ctx = setup();
    await toCodesStep(ctx);
    expect(ctx.store.recoveryCodes().length).toBe(2);
    ctx.fixture.destroy();
    expect(ctx.store.recoveryCodes()).toEqual([]);
    expect(ctx.store.setup()).toBeNull();
  });
});
