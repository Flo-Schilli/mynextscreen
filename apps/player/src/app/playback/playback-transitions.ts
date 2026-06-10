import { PlaylistItem } from '../player/player.models';

export interface TransitionSpec {
  type: string;
  duration: number;
}

/** Transition types the player knows how to animate (have matching keyframes). */
export const KNOWN_TRANSITIONS = new Set([
  'cut',
  'fade',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out',
]);

const DEFAULT_DURATION_MS = 500;

/**
 * Resolve the transition to use for an item, falling back to a 500ms fade when
 * the item is missing or names an unknown transition.
 */
export function resolveTransition(item: PlaylistItem | null): TransitionSpec {
  if (!item || !KNOWN_TRANSITIONS.has(item.transition)) {
    return { type: 'fade', duration: DEFAULT_DURATION_MS };
  }
  return { type: item.transition, duration: item.transitionDurationMs ?? DEFAULT_DURATION_MS };
}

/** CSS `animation` shorthand for the entering layer of a transition. */
export function enterAnim(type: string, duration: number): string {
  return `${type}-enter ${duration}ms ease-in-out both`;
}

/** CSS `animation` shorthand for the exiting layer of a transition. */
export function exitAnim(type: string, duration: number): string {
  return `${type}-exit ${duration}ms ease-in-out both`;
}
