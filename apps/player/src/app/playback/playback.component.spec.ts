/**
 * Playback timing tests.
 *
 * These exist because a screen in a group stopped switching in step with its
 * peers after a restart. The boundary timer used to be armed only from a media
 * `load` event, while `loadFromClock()` cleared it — so a re-anchor that landed
 * on the item already on screen wrote back an `Object.is`-equal signal value,
 * nothing re-rendered, no `load` ever came, and the screen held that item for
 * good. Everything here pins the timer to the shared clock instead of to the
 * DOM, so none of it may be relaxed into "wait for the media event".
 */

import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PlaybackComponent } from './playback.component';
import { PlayerService } from '../player/player.service';
import { TimeSyncService } from '../player/time-sync.service';
import { PlaylistItem } from '../player/player.models';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized by test-setup
}

/** Arbitrary fixed instant; the epoch and the fake clock both start here. */
const EPOCH = 1_700_000_000_000;

function item(url: string, duration: number, transition = 'cut', transitionMs = 0): PlaylistItem {
  return { url, duration, type: 'image', transition, transitionDurationMs: transitionMs };
}

/** Boundaries at +5s, +15s, +30s; one cycle is 30s. */
const ITEMS = [item('/a', 5), item('/b', 10), item('/c', 15)];

describe('PlaybackComponent timing', () => {
  let fixture: ComponentFixture<PlaybackComponent>;
  let component: PlaybackComponent;
  let player: PlayerService;
  let timeSync: TimeSyncService;

  /** Index of the item the component believes is on screen. */
  function currentIndex(): number {
    return (component as unknown as { _currentIndex: () => number })._currentIndex();
  }

  function setSynced(value: boolean): void {
    (timeSync as unknown as { _synced: { set: (v: boolean) => void } })._synced.set(value);
    fixture.detectChanges();
  }

  function setOffset(ms: number): void {
    (timeSync as unknown as { _offsetMs: { set: (v: number) => void } })._offsetMs.set(ms);
    fixture.detectChanges();
  }

  /** Create the component with `items` anchored at EPOCH, `nowMs` past the epoch. */
  function start(items: PlaylistItem[] = ITEMS, nowMs = 0): void {
    vi.setSystemTime(EPOCH + nowMs);
    (player as unknown as { _currentPlaylist: { set: (v: unknown) => void } })._currentPlaylist.set(
      { id: 'p1', name: 'Loop', items },
    );
    (player as unknown as { _epoch: { set: (v: number) => void } })._epoch.set(EPOCH);
    fixture = TestBed.createComponent(PlaybackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function activeImage(): HTMLImageElement | null {
    return fixture.nativeElement.querySelector('img.content-media');
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(EPOCH);
    TestBed.configureTestingModule({
      imports: [PlaybackComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    player = TestBed.inject(PlayerService);
    timeSync = TestBed.inject(TimeSyncService);
    vi.spyOn(player, 'connect').mockResolvedValue(undefined);
    vi.spyOn(player, 'disconnect').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('keeps advancing after the clock sync lands on the item already on screen', () => {
    start();
    expect(currentIndex()).toBe(0);

    // The exact restart shape: the offset arrives, the re-anchor resolves to the
    // same item, and the advance timer must survive it.
    setSynced(true);
    vi.advanceTimersByTime(5000);

    expect(currentIndex()).toBe(1);
  });

  it('advances without any media load event ever firing', () => {
    start();

    // jsdom loads no resources, so no (load) is dispatched anywhere in this spec.
    vi.advanceTimersByTime(5000);

    expect(currentIndex()).toBe(1);
  });

  it('schedules the boundary from the clock, not from one item duration after load', () => {
    // 7s past the epoch is 2s into item 1, whose boundary is at +15s.
    start(ITEMS, 7000);
    expect(currentIndex()).toBe(1);

    vi.advanceTimersByTime(7999);
    expect(currentIndex()).toBe(1);

    vi.advanceTimersByTime(1);
    expect(currentIndex()).toBe(2);
  });

  it('does not let the enter animation delay the first boundary', () => {
    const fading = [item('/a', 5, 'fade', 500), item('/b', 10, 'fade', 500)];
    // 100ms before the first boundary, with a 500ms enter animation configured.
    start(fading, 4900);

    vi.advanceTimersByTime(100);

    expect(currentIndex()).toBe(1);
  });

  it('does not replay the enter animation when a re-anchor keeps the same item', () => {
    const fading = [item('/a', 5, 'fade', 500), item('/b', 10, 'fade', 500)];
    start(fading);
    activeImage()?.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    vi.advanceTimersByTime(500);
    expect(component.layer0Anim()).toBe('');

    setSynced(true);

    expect(component.layer0Anim()).toBe('');
  });

  it('retries a boundary that arrives while the previous switch is still settling', () => {
    start();
    // First boundary: the incoming image is pending, nothing has loaded.
    vi.advanceTimersByTime(5000);
    expect(currentIndex()).toBe(1);

    // Second boundary lands with the gate still held. It must not be dropped.
    vi.advanceTimersByTime(10_000);
    activeImage()?.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(250);

    expect(currentIndex()).toBe(2);
  });

  it('keeps playing when the incoming image fails to load', () => {
    vi.spyOn(player, 'fetchState').mockResolvedValue(undefined as never);
    start();
    vi.advanceTimersByTime(5000);
    expect(currentIndex()).toBe(1);

    // Layer 1 is the incoming one — the active layer is still 0 until the
    // transition commits. An error there used to leave the pending gate held,
    // and every later boundary early-returned on it for good.
    component.onMediaError(new Event('error'), 1);
    vi.advanceTimersByTime(1000);

    expect(currentIndex()).toBe(2);
  });

  it('re-arms the pending boundary when the clock offset moves', () => {
    start();

    // The corrected clock says we are 2s further along than we thought, so the
    // boundary that looked 5s away is now 3s away.
    setOffset(2000);
    vi.advanceTimersByTime(2999);
    expect(currentIndex()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(currentIndex()).toBe(1);
  });

  it('ignores an offset change inside the jitter threshold', () => {
    start();

    setOffset(40);
    vi.advanceTimersByTime(4999);
    expect(currentIndex()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(currentIndex()).toBe(1);
  });
});
