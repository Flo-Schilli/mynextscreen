import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenDetail } from './screen-detail';
import { Screen } from './screen.model';

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
    lastHeartbeat: '2026-06-01T09:00:00.000Z',
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

describe('ScreenDetail', () => {
  let fixture: ComponentFixture<ScreenDetail>;

  async function setUp(screen: Screen, regenerating = false): Promise<void> {
    fixture = TestBed.createComponent(ScreenDetail);
    fixture.componentRef.setInput('screen', screen);
    fixture.componentRef.setInput('regenerating', regenerating);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function byText(text: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLElement).textContent?.trim() === text,
    ) as HTMLButtonElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders the screen name, location and resolution', async () => {
    await setUp(makeScreen());

    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Main Stage');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Hall A');
    expect(text).toContain('1920x1080');
  });

  it('shows the Online badge for an online screen', async () => {
    await setUp(makeScreen({ isOnline: true }));

    const badge = fixture.debugElement.query(By.css('.status-badge'));
    expect(badge.nativeElement.classList).toContain('online');
    expect(badge.nativeElement.textContent.trim()).toBe('Online');
  });

  it('shows the Offline badge for an offline screen', async () => {
    await setUp(makeScreen({ isOnline: false }));

    const badge = fixture.debugElement.query(By.css('.status-badge'));
    expect(badge.nativeElement.classList).toContain('offline');
    expect(badge.nativeElement.textContent.trim()).toBe('Offline');
  });

  it('renders "Never" when there is no heartbeat', async () => {
    await setUp(makeScreen({ lastHeartbeat: null }));

    expect(fixture.nativeElement.textContent).toContain('Never');
  });

  it('formats the heartbeat date when present', async () => {
    await setUp(makeScreen({ lastHeartbeat: '2026-06-01T09:00:00.000Z' }));

    // The medium date pipe never emits the literal "Never" sentinel.
    expect(fixture.nativeElement.textContent).not.toContain('Never');
  });

  it('emits edit when the Edit button is clicked', async () => {
    await setUp(makeScreen());
    const spy = vi.fn();
    fixture.componentInstance.edit.subscribe(spy);

    byText('Edit').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits dismiss when the Close button is clicked', async () => {
    await setUp(makeScreen());
    const spy = vi.fn();
    fixture.componentInstance.dismiss.subscribe(spy);

    byText('Close').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits regenerate when the Regenerate API Key button is clicked', async () => {
    await setUp(makeScreen());
    const spy = vi.fn();
    fixture.componentInstance.regenerate.subscribe(spy);

    byText('Regenerate API Key').click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('disables the regenerate button while regenerating', async () => {
    await setUp(makeScreen(), true);

    expect(byText('Regenerate API Key').disabled).toBe(true);
  });
});
