import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenForm } from './screen-form';
import { Screen, CreateScreenRequest, UpdateScreenRequest } from './screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Lobby TV',
    resolution: '1920x1080',
    location: 'Entrance',
    isOnline: true,
    lastHeartbeat: '2026-06-01T09:00:00.000Z',
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('ScreenForm', () => {
  let fixture: ComponentFixture<ScreenForm>;

  async function setUp(
    mode: 'create' | 'edit',
    inputs: Partial<{ screen: Screen; saving: boolean; error: string; repairing: boolean }> = {},
  ): Promise<void> {
    fixture = TestBed.createComponent(ScreenForm);
    fixture.componentRef.setInput('mode', mode);
    if (inputs.screen) fixture.componentRef.setInput('screen', inputs.screen);
    fixture.componentRef.setInput('saving', inputs.saving ?? false);
    fixture.componentRef.setInput('error', inputs.error ?? '');
    fixture.componentRef.setInput('repairing', inputs.repairing ?? false);
    fixture.detectChanges();
    await fixture.whenStable(); // let NgForm register its controls
  }

  // ngModel write-back is asynchronous under zoneless change detection, so
  // flush model <-> view after every field change before reading state.
  async function typeInto(selector: string, value: string): Promise<void> {
    const el: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function submit(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  describe('create mode', () => {
    it('shows the title, hint banner and pairing-code field', async () => {
      await setUp('create');

      expect(fixture.nativeElement.querySelector('.panel-title').textContent).toContain(
        'Add a screen',
      );
      expect(fixture.nativeElement.querySelector('.hint-banner')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#screenPairingCode')).not.toBeNull();
    });

    it('does not emit and shows an error when required fields are missing', async () => {
      await setUp('create');
      let emitted: CreateScreenRequest | undefined;
      fixture.componentInstance.create.subscribe((v) => (emitted = v));

      submit();
      fixture.detectChanges();

      expect(emitted).toBeUndefined();
      expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
        'All fields are required.',
      );
    });

    it('emits create with the preset resolution and pairing code', async () => {
      await setUp('create');
      let emitted: CreateScreenRequest | undefined;
      fixture.componentInstance.create.subscribe((v) => (emitted = v));

      await typeInto('#screenName', 'Lobby TV');
      await typeInto('#screenLocation', 'Entrance');
      await typeInto('#screenPairingCode', '123456');
      submit();

      expect(emitted).toEqual({
        name: 'Lobby TV',
        location: 'Entrance',
        resolution: '1920x1080',
        pairingCode: '123456',
      });
    });

    it('uses the custom resolution field when resolution is "custom"', async () => {
      await setUp('create');
      let emitted: CreateScreenRequest | undefined;
      fixture.componentInstance.create.subscribe((v) => (emitted = v));

      const select: HTMLSelectElement = fixture.nativeElement.querySelector('#screenResolution');
      select.value = 'custom';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('#screenCustomRes')).not.toBeNull();

      await typeInto('#screenName', 'Wall A');
      await typeInto('#screenLocation', 'Hall');
      await typeInto('#screenCustomRes', '1920x1200');
      await typeInto('#screenPairingCode', '654321');
      submit();

      expect(emitted).toEqual({
        name: 'Wall A',
        location: 'Hall',
        resolution: '1920x1200',
        pairingCode: '654321',
      });
    });

    it('does not emit and shows an error when the pairing code is not 6 digits', async () => {
      await setUp('create');
      let emitted: CreateScreenRequest | undefined;
      fixture.componentInstance.create.subscribe((v) => (emitted = v));

      await typeInto('#screenName', 'Lobby TV');
      await typeInto('#screenLocation', 'Entrance');
      await typeInto('#screenPairingCode', '12ab');
      submit();
      fixture.detectChanges();

      expect(emitted).toBeUndefined();
      expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
        'Pairing code must be 6 digits.',
      );
    });

    it('emits dismiss when Cancel is clicked', async () => {
      await setUp('create');
      let dismissed = false;
      fixture.componentInstance.dismiss.subscribe(() => (dismissed = true));

      const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLElement).textContent?.trim() === 'Cancel',
      ) as HTMLButtonElement;
      cancelBtn.click();

      expect(dismissed).toBe(true);
    });
  });

  describe('edit mode', () => {
    it('shows the title and hides the hint banner and pairing-code field', async () => {
      await setUp('edit', { screen: makeScreen() });

      expect(fixture.nativeElement.querySelector('.panel-title').textContent).toContain(
        'Edit screen',
      );
      expect(fixture.nativeElement.querySelector('.hint-banner')).toBeNull();
      expect(fixture.nativeElement.querySelector('#screenPairingCode')).toBeNull();
    });

    it('prefills the name, location and resolution from the screen', async () => {
      await setUp('edit', { screen: makeScreen({ name: 'Bar TV', location: 'Backstage' }) });

      expect((fixture.nativeElement.querySelector('#screenName') as HTMLInputElement).value).toBe(
        'Bar TV',
      );
      expect(
        (fixture.nativeElement.querySelector('#screenLocation') as HTMLInputElement).value,
      ).toBe('Backstage');
      expect(
        (fixture.nativeElement.querySelector('#screenResolution') as HTMLSelectElement).value,
      ).toBe('1920x1080');
    });

    it('maps a non-preset resolution onto the custom escape hatch', async () => {
      await setUp('edit', { screen: makeScreen({ resolution: '1920x1200' }) });

      expect(
        (fixture.nativeElement.querySelector('#screenResolution') as HTMLSelectElement).value,
      ).toBe('custom');
      expect(
        (fixture.nativeElement.querySelector('#screenCustomRes') as HTMLInputElement).value,
      ).toBe('1920x1200');
    });

    it('renders the read-only info block (status / last seen / registered)', async () => {
      await setUp('edit', { screen: makeScreen({ isOnline: true }) });

      const info = fixture.nativeElement.querySelector('.info-grid');
      expect(info).not.toBeNull();
      expect(info.textContent).toContain('Status');
      expect(info.querySelector('.status-badge').textContent.trim()).toContain('Online');
      expect(info.textContent).toContain('Last seen');
      expect(info.textContent).toContain('Registered');
    });

    it('shows "Never" for last seen when there is no heartbeat', async () => {
      await setUp('edit', { screen: makeScreen({ lastHeartbeat: null }) });

      expect(fixture.nativeElement.querySelector('.info-grid').textContent).toContain('Never');
    });

    it('emits update with the edited fields', async () => {
      await setUp('edit', { screen: makeScreen() });
      let emitted: UpdateScreenRequest | undefined;
      fixture.componentInstance.update.subscribe((v) => (emitted = v));

      await typeInto('#screenName', 'Renamed');
      submit();

      expect(emitted).toEqual({
        name: 'Renamed',
        location: 'Entrance',
        resolution: '1920x1080',
        showUnmuteButton: true,
        showDisconnectButton: true,
      });
    });

    it('emits repair with the code when Re-pair is clicked with a valid code', async () => {
      await setUp('edit', { screen: makeScreen() });
      let code: string | undefined;
      fixture.componentInstance.repair.subscribe((c) => (code = c));

      await typeInto('#repairPairingCode', '654321');
      const repairBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
        (b as HTMLElement).textContent?.includes('Re-pair'),
      ) as HTMLButtonElement;
      repairBtn.click();

      expect(code).toBe('654321');
    });

    it('does not emit repair and shows an error when the re-pair code is invalid', async () => {
      await setUp('edit', { screen: makeScreen() });
      let code: string | undefined;
      fixture.componentInstance.repair.subscribe((c) => (code = c));

      await typeInto('#repairPairingCode', '12');
      const repairBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
        (b as HTMLElement).textContent?.includes('Re-pair'),
      ) as HTMLButtonElement;
      repairBtn.click();
      fixture.detectChanges();

      expect(code).toBeUndefined();
      expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
        'Pairing code must be 6 digits.',
      );
    });
  });
});
