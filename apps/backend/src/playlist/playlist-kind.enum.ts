import type { PlaylistRule } from './playlist-rule.types';

/**
 * `static`: items are curated by hand. `dynamic`: items are materialised from a
 * rule over a content-source event pool and must not be edited manually.
 */
export enum PlaylistKind {
  Static = 'static',
  Dynamic = 'dynamic',
}

/** Stored rule of a dynamic playlist; `PlaylistRuleDto` validates its shape. */
export type PlaylistRuleData = PlaylistRule;
