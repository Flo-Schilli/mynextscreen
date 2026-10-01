/**
 * What the site agent saw when it last probed the TV on the network.
 *
 * Orthogonal to `screens.isOnline`, which means "the player sent a heartbeat".
 * The pair is what tells "TV is off" apart from "TV is on, app is not running" —
 * a distinction the server cannot make from the heartbeat alone.
 */
export enum ScreenReachability {
  /** No agent assigned, or the agent has not probed this screen yet. */
  Unknown = 'unknown',
  Reachable = 'reachable',
  Unreachable = 'unreachable',
}
