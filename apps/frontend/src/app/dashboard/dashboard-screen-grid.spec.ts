import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DashboardScreenGrid } from './dashboard-screen-grid';
import { Screen } from '../screens/screen.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
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

  function setScreens(screens: Screen[]): void {
    fixture.componentRef.setInput('screens', screens);
    fixture.detectChanges();
  }

  it('renders one tile per screen', () => {
    // Arrange & Act
    setScreens([makeScreen({ id: 'a' }), makeScreen({ id: 'b' }), makeScreen({ id: 'c' })]);

    // Assert
    expect(fixture.debugElement.queryAll(By.css('.screen-tile')).length).toBe(3);
  });

  describe('status class branches', () => {
    it('marks an online screen with the online class', () => {
      // Arrange & Act
      setScreens([makeScreen({ isOnline: true, lastHeartbeat: '2026-01-01T00:00:00.000Z' })]);

      // Assert
      const tile = fixture.debugElement.query(By.css('.screen-tile')).nativeElement as HTMLElement;
      expect(tile.classList.contains('online')).toBe(true);
      expect(tile.classList.contains('offline')).toBe(false);
      expect(tile.classList.contains('never')).toBe(false);
    });

    it('marks an offline screen that has a heartbeat with the offline class', () => {
      // Arrange & Act
      setScreens([makeScreen({ isOnline: false, lastHeartbeat: '2026-01-01T00:00:00.000Z' })]);

      // Assert
      const tile = fixture.debugElement.query(By.css('.screen-tile')).nativeElement as HTMLElement;
      expect(tile.classList.contains('offline')).toBe(true);
      expect(tile.classList.contains('online')).toBe(false);
      expect(tile.classList.contains('never')).toBe(false);
    });

    it('marks a never-seen screen (no heartbeat) with the never class', () => {
      // Arrange & Act
      setScreens([makeScreen({ isOnline: false, lastHeartbeat: null })]);

      // Assert
      const tile = fixture.debugElement.query(By.css('.screen-tile')).nativeElement as HTMLElement;
      expect(tile.classList.contains('never')).toBe(true);
      expect(tile.classList.contains('online')).toBe(false);
      expect(tile.classList.contains('offline')).toBe(false);
    });
  });

  describe('rendered content', () => {
    it('shows the screen name and location', () => {
      // Arrange & Act
      setScreens([makeScreen({ name: 'Bar TV', location: 'Backstage' })]);

      // Assert
      const name = fixture.debugElement.query(By.css('.screen-name')).nativeElement as HTMLElement;
      const location = fixture.debugElement.query(By.css('.screen-location'))
        .nativeElement as HTMLElement;
      expect(name.textContent?.trim()).toBe('Bar TV');
      expect(location.textContent?.trim()).toBe('Backstage');
    });

    it('falls back to "No location" when location is empty', () => {
      // Arrange & Act
      setScreens([makeScreen({ location: '' })]);

      // Assert
      const location = fixture.debugElement.query(By.css('.screen-location'))
        .nativeElement as HTMLElement;
      expect(location.textContent?.trim()).toBe('No location');
    });
  });

  it('emits the screen id when a tile is clicked', () => {
    // Arrange
    setScreens([makeScreen({ id: 'screen-42' })]);
    const spy = vi.fn();
    fixture.componentInstance.selectScreen.subscribe(spy);

    // Act
    const tile = fixture.debugElement.query(By.css('.screen-tile'))
      .nativeElement as HTMLButtonElement;
    tile.click();

    // Assert
    expect(spy).toHaveBeenCalledWith('screen-42');
  });
});
