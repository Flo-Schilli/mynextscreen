import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenEditForm } from './screen-edit-form';
import { Screen, UpdateScreenRequest } from './screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: 'org1',
    name: 'Main Stage',
    resolution: '1920x1080',
    location: 'Hall A',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScreenEditForm', () => {
  let fixture: ComponentFixture<ScreenEditForm>;

  async function setUp(screen: Screen): Promise<void> {
    fixture = TestBed.createComponent(ScreenEditForm);
    fixture.componentRef.setInput('screen', screen);
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    await fixture.whenStable(); // let ngModel seed model -> view
  }

  function field(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector);
  }

  // ngModel write-back is asynchronous under zoneless change detection.
  async function typeInto(selector: string, value: string): Promise<void> {
    const el = field(selector);
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

  it('seeds the form from the screen input on init', async () => {
    await setUp(makeScreen());
    expect(field('#editName').value).toBe('Main Stage');
    expect(field('#editLocation').value).toBe('Hall A');
    expect(field('#editResolution').value).toBe('1920x1080');
  });

  it('emits an update payload with the edited values', async () => {
    await setUp(makeScreen());
    let emitted: UpdateScreenRequest | undefined;
    fixture.componentInstance.save.subscribe((v) => (emitted = v));

    await typeInto('#editName', 'Renamed');
    submit();

    expect(emitted).toEqual({
      name: 'Renamed',
      location: 'Hall A',
      resolution: '1920x1080',
    });
  });

  it('does not emit and shows an error when a field is cleared', async () => {
    await setUp(makeScreen());
    let emitted: UpdateScreenRequest | undefined;
    fixture.componentInstance.save.subscribe((v) => (emitted = v));

    await typeInto('#editName', '');
    submit();
    fixture.detectChanges();

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'All fields are required.',
    );
  });

  it('emits dismiss when Cancel is clicked', async () => {
    await setUp(makeScreen());
    let cancelled = false;
    fixture.componentInstance.dismiss.subscribe(() => (cancelled = true));

    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();

    expect(cancelled).toBe(true);
  });
});
