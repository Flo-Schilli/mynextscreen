import { PlaylistItem } from '../player/player.models';
import { resolveTransition, enterAnim, exitAnim, KNOWN_TRANSITIONS } from './playback-transitions';

function item(partial: Partial<PlaylistItem>): PlaylistItem {
  return { url: '/x', duration: 10, type: 'image', ...partial } as PlaylistItem;
}

describe('resolveTransition', () => {
  it('falls back to a 500ms fade for a null item', () => {
    expect(resolveTransition(null)).toEqual({ type: 'fade', duration: 500 });
  });

  it('falls back to a 500ms fade for an unknown transition', () => {
    expect(resolveTransition(item({ transition: 'spin-around' }))).toEqual({
      type: 'fade',
      duration: 500,
    });
  });

  it('uses the item transition and duration when known', () => {
    expect(
      resolveTransition(item({ transition: 'slide-left', transitionDurationMs: 800 })),
    ).toEqual({ type: 'slide-left', duration: 800 });
  });

  it('defaults the duration to 500ms when not provided', () => {
    expect(resolveTransition(item({ transition: 'zoom-in' }))).toEqual({
      type: 'zoom-in',
      duration: 500,
    });
  });

  it('knows all eight transition types', () => {
    expect(KNOWN_TRANSITIONS.size).toBe(8);
    for (const t of [
      'cut',
      'fade',
      'slide-left',
      'slide-right',
      'slide-up',
      'slide-down',
      'zoom-in',
      'zoom-out',
    ]) {
      expect(KNOWN_TRANSITIONS.has(t)).toBe(true);
    }
  });
});

describe('animation shorthands', () => {
  it('builds the enter animation string', () => {
    expect(enterAnim('fade', 500)).toBe('fade-enter 500ms ease-in-out both');
  });

  it('builds the exit animation string', () => {
    expect(exitAnim('slide-up', 300)).toBe('slide-up-exit 300ms ease-in-out both');
  });
});
