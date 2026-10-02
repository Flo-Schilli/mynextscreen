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

/**
 * Transitions that dissolve the incoming layer over the outgoing one.
 *
 * These must animate the incoming layer only. Ramping both opacities at once
 * composites to `new·α + old·(1−α)·α`, which covers just 75% at the midpoint —
 * the remaining quarter is the black container behind both layers. That dip
 * reads as the old picture blending out and the new one blending in, two
 * separate fades through black instead of one dissolve.
 */
const CROSS_DISSOLVES = new Set(['fade', 'zoom-in', 'zoom-out']);

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

/** True when the outgoing layer has to stay opaque under the incoming one. */
export function crossDissolves(type: string): boolean {
  return CROSS_DISSOLVES.has(type);
}

/** CSS `animation` shorthand for the entering layer of a transition. */
export function enterAnim(type: string, duration: number): string {
  return `${type}-enter ${duration}ms ease-in-out both`;
}

/**
 * CSS `animation` shorthand for the exiting layer of a transition, or an empty
 * string for a cross-dissolve, whose outgoing layer must not animate at all.
 */
export function exitAnim(type: string, duration: number): string {
  if (CROSS_DISSOLVES.has(type)) return '';
  return `${type}-exit ${duration}ms ease-in-out both`;
}
