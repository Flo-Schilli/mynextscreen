/**
 * Tests for the info panel.
 *
 * The panel carries the disconnect action, which used to be a button pinned to
 * the top-right corner of the content at all times. On a display whose whole
 * purpose is to show content, permanent chrome is a defect; these tests hold the
 * action to the panel and to the server-side per-screen toggle.
 */

import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatusOverlayComponent } from './status-overlay.component';
import { PlayerService } from '../player/player.service';
import { ConnectionService } from '../connection/connection.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized by test-setup
}

describe('StatusOverlayComponent', () => {
  let fixture: ComponentFixture<StatusOverlayComponent>;

  function setScreen(overrides: Record<string, unknown>): void {
    TestBed.inject(PlayerService)['_screen'].set({
      id: 'screen-1',
      name: 'Lobby',
      resolution: '1920x1080',
      ...overrides,
    });
  }

  function disconnectButton(): HTMLButtonElement | null {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    return buttons.find((button) => button.textContent?.includes('Disconnect')) ?? null;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [StatusOverlayComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(StatusOverlayComponent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offers disconnect inside the panel rather than over the content', () => {
    setScreen({ showDisconnectButton: true });
    fixture.detectChanges();

    expect(disconnectButton()).not.toBeNull();
  });

  it('hides the action when the screen has the toggle switched off', () => {
    setScreen({ showDisconnectButton: false });
    fixture.detectChanges();

    expect(disconnectButton()).toBeNull();
  });

  it('disconnects the screen when the action is used', () => {
    setScreen({ showDisconnectButton: true });
    fixture.detectChanges();
    const disconnect = vi.spyOn(TestBed.inject(ConnectionService), 'disconnect');

    disconnectButton()!.click();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('stays open once asked for, so the action can be aimed at', () => {
    setScreen({ showDisconnectButton: true });
    fixture.detectChanges();

    // The panel shows itself on start and gets out of the way after 5s.
    vi.advanceTimersByTime(6_000);
    fixture.detectChanges();
    expect(disconnectButton()).toBeNull();

    // Opened deliberately, it stays: five seconds is not enough to find and hit
    // a button with a TV remote.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
    fixture.detectChanges();
    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();

    expect(disconnectButton()).not.toBeNull();
  });
});
