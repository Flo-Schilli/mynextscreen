import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenTile, resolutionLabel } from './screen-tile';
import { ScreenListItem } from './screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeScreen(overrides: Partial<ScreenListItem> = {}): ScreenListItem {
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
    currentPlaylistName: null,
    ...overrides,
  };
}

describe('resolutionLabel', () => {
  it('maps known presets to short labels', () => {
    expect(resolutionLabel('1920x1080')).toBe('FHD');
    expect(resolutionLabel('3840x2160')).toBe('4K');
    expect(resolutionLabel('2560x1440')).toBe('QHD');
    expect(resolutionLabel('1280x720')).toBe('HD');
    expect(resolutionLabel('1080x1920')).toBe('FHD↕');
  });

  it('returns the raw string for unknown resolutions', () => {
    expect(resolutionLabel('1920x1200')).toBe('1920x1200');
  });
});

describe('ScreenTile', () => {
  let fixture: ComponentFixture<ScreenTile>;

  async function setUp(screen: ScreenListItem, showActions = false): Promise<void> {
    fixture = TestBed.createComponent(ScreenTile);
    fixture.componentRef.setInput('screen', screen);
    fixture.componentRef.setInput('showActions', showActions);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders the name and location', async () => {
    await setUp(makeScreen());

    expect(fixture.nativeElement.querySelector('.screen-name').textContent).toContain('Main Stage');
    expect(fixture.nativeElement.querySelector('.location-text').textContent).toContain('Hall A');
  });

  it('shows the Online status badge for an online screen', async () => {
    await setUp(makeScreen({ isOnline: true }));

    const badge = fixture.debugElement.query(By.css('.status-badge')).nativeElement as HTMLElement;
    expect(badge.classList).toContain('online');
    expect(badge.textContent?.trim()).toContain('Online');
  });

  it('shows the Offline status badge when offline but seen before', async () => {
    await setUp(makeScreen({ isOnline: false, lastHeartbeat: '2026-06-01T09:00:00.000Z' }));

    const badge = fixture.debugElement.query(By.css('.status-badge')).nativeElement as HTMLElement;
    expect(badge.classList).toContain('offline');
    expect(badge.textContent?.trim()).toContain('Offline');
  });

  it('shows the Never status badge when never seen', async () => {
    await setUp(makeScreen({ isOnline: false, lastHeartbeat: null }));

    const badge = fixture.debugElement.query(By.css('.status-badge')).nativeElement as HTMLElement;
    expect(badge.classList).toContain('never');
    expect(badge.textContent?.trim()).toContain('Never');
  });

  it('renders the short resolution label', async () => {
    await setUp(makeScreen({ resolution: '3840x2160' }));

    expect(fixture.nativeElement.querySelector('.res-badge').textContent).toContain('4K');
  });

  it('shows the now-playing playlist when online with a current playlist', async () => {
    await setUp(makeScreen({ isOnline: true, currentPlaylistName: 'Morning Loop' }));

    const footer = fixture.nativeElement.querySelector('.card-footer');
    expect(footer.querySelector('.now-playing')).toBeTruthy();
    expect(footer.textContent).toContain('Morning Loop');
  });

  it('shows the last-seen timestamp when offline with a heartbeat', async () => {
    await setUp(makeScreen({ isOnline: false, lastHeartbeat: '2026-06-01T09:00:00.000Z' }));

    const footer = fixture.nativeElement.querySelector('.card-footer');
    expect(footer.textContent).toContain('Last seen');
    expect(footer.querySelector('.now-playing')).toBeNull();
  });

  it('shows "Never connected" when there is no heartbeat', async () => {
    await setUp(makeScreen({ isOnline: false, lastHeartbeat: null }));

    expect(fixture.nativeElement.querySelector('.card-footer').textContent).toContain(
      'Never connected',
    );
  });

  it('emits open when the card is clicked', async () => {
    const screen = makeScreen();
    await setUp(screen);
    const spy = vi.fn();
    fixture.componentInstance.open.subscribe(spy);

    fixture.debugElement.query(By.css('.screen-card')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith(screen);
  });

  it('emits open when Enter is pressed on the card', async () => {
    const screen = makeScreen();
    await setUp(screen);
    const spy = vi.fn();
    fixture.componentInstance.open.subscribe(spy);

    fixture.debugElement
      .query(By.css('.screen-card'))
      .nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(spy).toHaveBeenCalledWith(screen);
  });

  describe('delete action', () => {
    it('hides the trash button when showActions is false', async () => {
      await setUp(makeScreen(), false);

      expect(fixture.nativeElement.querySelector('.delete-btn')).toBeNull();
    });

    it('does not render the legacy ⋯ menu trigger', async () => {
      await setUp(makeScreen(), true);

      expect(fixture.nativeElement.querySelector('.menu-trigger')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.menu-item').length).toBe(0);
    });

    it('emits delete when the trash button is clicked', async () => {
      const screen = makeScreen();
      await setUp(screen, true);
      const deleteSpy = vi.fn();
      fixture.componentInstance.delete.subscribe(deleteSpy);

      (fixture.nativeElement.querySelector('.delete-btn') as HTMLButtonElement).click();

      expect(deleteSpy).toHaveBeenCalledWith(screen);
    });

    it('does not emit open when the trash button is clicked', async () => {
      await setUp(makeScreen(), true);
      const openSpy = vi.fn();
      fixture.componentInstance.open.subscribe(openSpy);

      (fixture.nativeElement.querySelector('.delete-btn') as HTMLButtonElement).click();

      expect(openSpy).not.toHaveBeenCalled();
    });
  });
});
