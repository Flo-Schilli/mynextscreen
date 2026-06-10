import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScreenCreateForm } from './screen-create-form';
import { CreateScreenRequest } from './screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('ScreenCreateForm', () => {
  let fixture: ComponentFixture<ScreenCreateForm>;

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(ScreenCreateForm);
    fixture.componentRef.setInput('creating', false);
    fixture.componentRef.setInput('error', '');
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

  it('does not emit and shows an error when required fields are missing', async () => {
    await setUp();
    let emitted: CreateScreenRequest | undefined;
    fixture.componentInstance.create.subscribe((v) => (emitted = v));

    submit();
    fixture.detectChanges();

    expect(emitted).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.error').textContent).toContain(
      'All fields are required.',
    );
  });

  it('emits the selected preset resolution when name and location are filled', async () => {
    await setUp();
    let emitted: CreateScreenRequest | undefined;
    fixture.componentInstance.create.subscribe((v) => (emitted = v));

    await typeInto('#createName', 'Lobby TV');
    await typeInto('#createLocation', 'Entrance');
    submit();

    expect(emitted).toEqual({
      name: 'Lobby TV',
      location: 'Entrance',
      resolution: '1920x1080',
    });
  });

  it('uses the custom resolution field when resolution is "custom"', async () => {
    await setUp();
    let emitted: CreateScreenRequest | undefined;
    fixture.componentInstance.create.subscribe((v) => (emitted = v));

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#createResolution');
    select.value = 'custom';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable(); // flush change -> model
    fixture.detectChanges(); // re-evaluate @if (resolution === 'custom')
    await fixture.whenStable(); // render the custom-resolution field
    expect(fixture.nativeElement.querySelector('#createCustomRes')).not.toBeNull();

    await typeInto('#createName', 'Wall A');
    await typeInto('#createLocation', 'Hall');
    await typeInto('#createCustomRes', '1920x1200');
    submit();

    expect(emitted).toEqual({
      name: 'Wall A',
      location: 'Hall',
      resolution: '1920x1200',
    });
  });

  it('emits dismiss when Cancel is clicked', async () => {
    await setUp();
    let dismissed = false;
    fixture.componentInstance.dismiss.subscribe(() => (dismissed = true));

    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();

    expect(dismissed).toBe(true);
  });
});
