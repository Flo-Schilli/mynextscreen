import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DashboardScreenGrid } from './dashboard-screen-grid';
import { ScreenListItem } from '../screens/screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeScreen(overrides: Partial<ScreenListItem> = {}): ScreenListItem {
  return {
    id: 'screen-1',
    organisationId: 'org-1',
    name: 'Lobby',
    resolution: '1920x1080',
    location: 'Entrance',
    isOnline: false,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentPlaylistName: null,
    agentId: null,
    reachability: null,
    currentPlaylistThumbnail: null,
    ...overrides,
  };
}

describe('DashboardScreenGrid', () => {
  let fixture: ComponentFixture<DashboardScreenGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardScreenGrid],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardScreenGrid);
  });

  function setScreens(screens: ScreenListItem[]): void {
    fixture.componentRef.setInput('screens', screens);
    fixture.detectChanges();
  }

  it('renders one shared screen tile per screen', () => {
    setScreens([makeScreen({ id: 'a' }), makeScreen({ id: 'b' }), makeScreen({ id: 'c' })]);

    expect(fixture.debugElement.queryAll(By.css('app-screen-tile')).length).toBe(3);
  });

  it('does not render the per-card delete action on the dashboard', () => {
    setScreens([makeScreen()]);

    expect(fixture.nativeElement.querySelector('.delete-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.menu-trigger')).toBeNull();
  });

  describe('rendered content', () => {
    it('shows the screen name and location', () => {
      setScreens([makeScreen({ name: 'Bar TV', location: 'Backstage' })]);

      expect(fixture.nativeElement.querySelector('.screen-name').textContent?.trim()).toBe(
        'Bar TV',
      );
      expect(fixture.nativeElement.querySelector('.location-text').textContent?.trim()).toBe(
        'Backstage',
      );
    });

    it('falls back to "No location" when location is empty', () => {
      setScreens([makeScreen({ location: '' })]);

      expect(fixture.nativeElement.querySelector('.location-text').textContent?.trim()).toBe(
        'No location',
      );
    });
  });

  it('emits the screen id when a tile is clicked', () => {
    setScreens([makeScreen({ id: 'screen-42' })]);
    const spy = vi.fn();
    fixture.componentInstance.selectScreen.subscribe(spy);

    (fixture.debugElement.query(By.css('.screen-card')).nativeElement as HTMLElement).click();

    expect(spy).toHaveBeenCalledWith('screen-42');
  });
});
