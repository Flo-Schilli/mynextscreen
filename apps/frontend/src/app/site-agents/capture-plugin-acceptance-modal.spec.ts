import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CapturePluginAcceptanceModal } from './capture-plugin-acceptance-modal';
import { CapturePluginService } from './capture-plugin.service';
import { ToastService } from '../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import type { CapturePluginLicenseText } from './site-agent.model';

const TEXT: CapturePluginLicenseText = {
  licenseSha256: 'a'.repeat(64),
  ndiLicenseText: 'NDI license body',
  termsText: 'Plugin terms body',
};

/** jsdom has no layout: give every element a scrollable box of 1000 over 100 px. */
function mockScrollableLayout(): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => 1000,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 100,
  });
}

function scrollToEnd(el: HTMLElement): void {
  el.scrollTop = 900;
  el.dispatchEvent(new Event('scroll'));
}

describe('CapturePluginAcceptanceModal', () => {
  let fixture: ComponentFixture<CapturePluginAcceptanceModal>;
  let service: { getLicenseText: ReturnType<typeof vi.fn>; accept: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const q = (testId: string): HTMLElement | null =>
    (fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement ??
      null) as HTMLElement | null;
  const acceptDisabled = (): boolean =>
    fixture.debugElement
      .query(By.css('[data-testid="accept-button"]'))
      .componentInstance.disabled() as boolean;

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(CapturePluginAcceptanceModal);
    fixture.componentRef.setInput('agentId', 'a1');
    fixture.componentRef.setInput('organisation', 'Acme');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    mockScrollableLayout();
    service = {
      getLicenseText: vi.fn().mockReturnValue(of(TEXT)),
      accept: vi.fn().mockReturnValue(of({})),
    };
    toast = { success: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [
        CapturePluginAcceptanceModal,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: CapturePluginService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)['scrollHeight'];
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)['clientHeight'];
  });

  it('shows both texts, the trademark notice, the short hash and an unticked box', async () => {
    await create();

    expect(q('pane-ndi')?.textContent).toContain('NDI license body');
    expect(q('pane-terms')?.textContent).toContain('Plugin terms body');
    expect(fixture.nativeElement.textContent).toContain('registered trademark of Vizrt NDI AB');
    expect(q('license-hash')?.textContent).toContain('a'.repeat(12));
    expect(q('license-hash')?.getAttribute('title')).toBe(TEXT.licenseSha256);
    expect((q('accept-checkbox') as HTMLInputElement).checked).toBe(false);
    expect(q('accept-label')?.textContent).toContain('on behalf of Acme');
  });

  it('keeps Accept disabled until both panes are scrolled to the end and the box is ticked', async () => {
    await create();
    const box = q('accept-checkbox') as HTMLInputElement;

    box.click();
    fixture.detectChanges();
    expect(acceptDisabled()).toBe(true);

    scrollToEnd(q('pane-ndi') as HTMLElement);
    fixture.detectChanges();
    expect(acceptDisabled()).toBe(true);

    scrollToEnd(q('pane-terms') as HTMLElement);
    fixture.detectChanges();
    expect(acceptDisabled()).toBe(false);
    expect(q('scroll-hint')).toBeNull();

    box.click();
    fixture.detectChanges();
    expect(acceptDisabled()).toBe(true);
  });

  it('treats texts that fit without scrolling as read', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 50,
    });
    await create();

    expect(q('scroll-hint')).toBeNull();
    (q('accept-checkbox') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(acceptDisabled()).toBe(false);
  });

  it('posts the hash of the loaded text and reports success', async () => {
    await create();
    const accepted = vi.fn();
    fixture.componentInstance.accepted.subscribe(accepted);
    scrollToEnd(q('pane-ndi') as HTMLElement);
    scrollToEnd(q('pane-terms') as HTMLElement);
    (q('accept-checkbox') as HTMLInputElement).click();
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('[data-testid="accept-button"]'))
      .triggerEventHandler('mnsClick', new MouseEvent('click'));

    expect(service.accept).toHaveBeenCalledWith('a1', TEXT.licenseSha256);
    expect(toast.success).toHaveBeenCalled();
    expect(accepted).toHaveBeenCalled();
  });

  it('on 409 explains the change, reloads the text and resets the progress', async () => {
    service.accept.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { error: 'license_mismatch' } }),
      ),
    );
    const next: CapturePluginLicenseText = { ...TEXT, licenseSha256: 'b'.repeat(64) };
    await create();
    const stale = vi.fn();
    fixture.componentInstance.stale.subscribe(stale);
    scrollToEnd(q('pane-ndi') as HTMLElement);
    scrollToEnd(q('pane-terms') as HTMLElement);
    (q('accept-checkbox') as HTMLInputElement).click();
    fixture.detectChanges();
    service.getLicenseText.mockReturnValue(of(next));

    fixture.debugElement
      .query(By.css('[data-testid="accept-button"]'))
      .triggerEventHandler('mnsClick', new MouseEvent('click'));
    fixture.detectChanges();

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('license has changed'));
    expect(stale).toHaveBeenCalled();
    expect(service.getLicenseText).toHaveBeenCalledTimes(2);
    expect(q('license-hash')?.getAttribute('title')).toBe(next.licenseSha256);
    expect((q('accept-checkbox') as HTMLInputElement).checked).toBe(false);
    expect(acceptDisabled()).toBe(true);
  });

  it('says so when the text is not available yet', async () => {
    service.getLicenseText.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    await create();

    expect(q('license-error')?.textContent).toContain('not available yet');
    expect(acceptDisabled()).toBe(true);
  });
});
