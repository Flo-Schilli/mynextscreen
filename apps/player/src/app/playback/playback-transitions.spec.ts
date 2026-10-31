import { PlaylistItem } from '../player/player.models';
import {
  resolveTransition,
  enterAnim,
  exitAnim,
  crossDissolves,
  KNOWN_TRANSITIONS,
} from './playback-transitions';
import globalStyles from '../../styles.css?raw';
import componentSource from './playback.component.ts?raw';

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

  it('gives a cross-dissolve no exit animation, so the outgoing layer stays opaque', () => {
    expect(exitAnim('fade', 500)).toBe('');
    expect(exitAnim('zoom-in', 500)).toBe('');
    expect(exitAnim('zoom-out', 500)).toBe('');
  });
});

describe('crossDissolves', () => {
  it('is true for the transitions that blend one layer over the other', () => {
    expect(crossDissolves('fade')).toBe(true);
    expect(crossDissolves('zoom-in')).toBe(true);
    expect(crossDissolves('zoom-out')).toBe(true);
  });

  it('is false for transitions that move the outgoing layer off screen', () => {
    for (const type of ['slide-left', 'slide-right', 'slide-up', 'slide-down']) {
      expect(crossDissolves(type)).toBe(false);
    }
  });

  it('is false for cut', () => {
    expect(crossDissolves('cut')).toBe(false);
  });
});

describe('transition keyframes', () => {
  /** Keyframe names declared in a stylesheet. */
  function keyframes(css: string): Set<string> {
    return new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
  }

  /** The keyframe name an `animation` shorthand refers to. */
  function animationName(shorthand: string): string {
    return shorthand.split(' ')[0];
  }

  // The animation is applied through an inline style binding. Angular renames
  // keyframes declared in a component stylesheet, so only global ones match it.
  it.each([...KNOWN_TRANSITIONS].filter((type) => type !== 'cut'))(
    'declares the keyframes for %s in the global stylesheet',
    (type) => {
      const declared = keyframes(globalStyles);
      expect(declared).toContain(animationName(enterAnim(type, 500)));
      const exit = exitAnim(type, 500);
      if (exit) expect(declared).toContain(animationName(exit));
    },
  );

  it('declares no keyframes in the playback component stylesheet', () => {
    expect(keyframes(componentSource).size).toBe(0);
  });
});
