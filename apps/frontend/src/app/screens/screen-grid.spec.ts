import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ScreenGrid } from './screen-grid';
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
    agentId: null,
    reachability: null,
    currentPlaylistThumbnail: null,
    ...overrides,
  };
}

describe('ScreenGrid', () => {
  let fixture: ComponentFixture<ScreenGrid>;

  async function setUp(screens: ScreenListItem[]): Promise<void> {
    fixture = TestBed.createComponent(ScreenGrid);
    fixture.componentRef.setInput('screens', screens);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('renders one tile per screen', async () => {
    await setUp([makeScreen(), makeScreen({ id: 's2', name: 'Bar TV' })]);

    expect(fixture.debugElement.queryAll(By.css('app-screen-tile')).length).toBe(2);
  });

  it('renders the screen name, status badge and resolution badge in the tile', async () => {
    await setUp([makeScreen({ isOnline: true })]);

    const tile = fixture.nativeElement.querySelector('app-screen-tile');
    expect(tile.querySelector('.screen-name').textContent).toContain('Main Stage');
    expect(tile.querySelector('.status-badge').textContent.trim()).toContain('Online');
    expect(tile.querySelector('.res-badge').textContent).toContain('FHD');
  });

  it('shows the now-playing footer for an online screen with a current playlist', async () => {
    await setUp([makeScreen({ isOnline: true, currentPlaylistName: 'Morning Loop' })]);

    expect(fixture.nativeElement.querySelector('.now-playing').textContent).toContain(
      'Morning Loop',
    );
  });

  it('renders status filter pills with counts', async () => {
    await setUp([
      makeScreen({ id: 's1', isOnline: true }),
      makeScreen({ id: 's2', isOnline: false }),
      makeScreen({ id: 's3', isOnline: false }),
    ]);

    const pills = fixture.debugElement.queryAll(By.css('.filter-pill'));
    expect(pills.length).toBe(3);
    expect(pills[0].nativeElement.textContent).toContain('3'); // all
    expect(pills[1].nativeElement.textContent).toContain('1'); // online
    expect(pills[2].nativeElement.textContent).toContain('2'); // offline
  });

  it('filters to online screens when the Online pill is clicked', async () => {
    await setUp([
      makeScreen({ id: 's1', isOnline: true }),
      makeScreen({ id: 's2', isOnline: false }),
    ]);

    const onlinePill = fixture.debugElement.queryAll(By.css('.filter-pill'))[1].nativeElement;
    onlinePill.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.css('app-screen-tile')).length).toBe(1);
  });

  it('forwards the tile open event as selectItem', async () => {
    const screen = makeScreen();
    await setUp([screen]);
    const spy = vi.fn();
    fixture.componentInstance.selectItem.subscribe(spy);

    fixture.debugElement.query(By.css('.screen-card')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith(screen);
  });

  it('forwards the tile delete action as remove', async () => {
    const screen = makeScreen();
    await setUp([screen]);
    const removeSpy = vi.fn();
    fixture.componentInstance.remove.subscribe(removeSpy);

    (fixture.nativeElement.querySelector('.delete-btn') as HTMLButtonElement).click();

    expect(removeSpy).toHaveBeenCalledWith(screen);
  });

  it('renders the trash action on each tile and no legacy ⋯ menu', async () => {
    await setUp([makeScreen()]);

    expect(fixture.nativeElement.querySelector('.delete-btn')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.menu-trigger')).toBeNull();
  });

  it('renders nothing in the grid when there are no screens', async () => {
    await setUp([]);

    expect(fixture.debugElement.queryAll(By.css('app-screen-tile')).length).toBe(0);
  });
});
