import type { AgentScreenConfigMessage } from '../protocol/server-protocol';
import type { ScreenRuntime } from './screen-runtime';

/**
 * Minimum gap between two launch attempts on one screen.
 *
 * Fifteen *minutes*, not the fifteen seconds the interactive launcher uses.
 * There a person is watching and will notice a set refusing to start; here the
 * loop is unattended, and a TV that cannot run the app would otherwise be hit
 * four times a minute forever.
 */
export const LAUNCH_COOLDOWN_MS = 15 * 60_000;

/**
 * How long the loop leaves a set alone after it starts answering again.
 *
 * A TV that was just switched on answers on the network long before it has
 * fetched the time over NTP. Until then its clock is off, every certificate
 * looks invalid, and an app launched in that window fails with SSL errors.
 */
export const SETTLE_AFTER_REACHABLE_MS = 3 * 60_000;

/** A TV needs roughly fifteen seconds after a magic packet before it answers. */
export const WAKE_COOLDOWN_MS = 5 * 60_000;

/** Backoff after a failed round: 1x, 2x, 4x … capped. */
export const BACKOFF_CAP_MS = 30 * 60_000;

/**
 * Minimum gap between two searches for a set that stopped answering. A search
 * can sweep the subnet, and a TV that is simply off will not be found anyway.
 */
export const DISCOVERY_COOLDOWN_MS = 2 * 60_000;

/** A set that stays missing (off overnight) is searched for ever less often. */
export const DISCOVERY_COOLDOWN_CAP_MS = 30 * 60_000;

export function discoveryCooldownFor(misses: number): number {
  return Math.min(DISCOVERY_COOLDOWN_MS * 2 ** misses, DISCOVERY_COOLDOWN_CAP_MS);
}

/** Spread the Developer Mode extensions so twenty TVs do not all get SSH at once. */
export const DEVMODE_JITTER_MAX_MS = 30 * 60_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ScreenAction =
  | { kind: 'wake'; reason: 'schedule' | 'unreachable' }
  | { kind: 'extend-devmode' }
  | { kind: 'launch' }
  | { kind: 'none' };

/**
 * Whether the Developer Mode session is due for extension.
 *
 * There is no separate "it was due but the TV was off" state, because that is
 * the same thing as "still due". The flag simply stays set, which is what makes
 * the extension happen the next time the set is on.
 */
export function isDevmodeExtensionDue(
  screen: AgentScreenConfigMessage,
  now: number,
  runtime: ScreenRuntime,
): boolean {
  if (!screen.extendDevmodeEnabled) {
    return false;
  }

  // Whichever is newer: the server's record, or an extension this agent did
  // since it last pulled the config. Without the second one a successful
  // extension stayed invisible until the next pull, and the screen was
  // extended again every round in the meantime.
  const reported = screen.lastDevmodeExtendAt ? Date.parse(screen.lastDevmodeExtendAt) : 0;
  const lastExtendAt = Math.max(reported, runtime.lastDevmodeExtendAt);
  if (!lastExtendAt) {
    return true;
  }

  const intervalMs = screen.devmodeExtendIntervalDays * DAY_MS;
  const age = now - lastExtendAt;
  if (age >= intervalMs * 1.5) {
    // Overdue by half an interval: safety wins over spreading the load, since
    // an expired session means the TV has already deleted the app.
    return true;
  }
  return age >= intervalMs + runtime.devmodeJitterMs;
}

/** Whether a scheduled start is close enough to warrant waking the set. */
export function isWakeBeforeScheduleDue(screen: AgentScreenConfigMessage, now: number): boolean {
  if (!screen.wakeBeforeScheduleEnabled || !screen.macAddress || !screen.nextScheduleStartAt) {
    return false;
  }
  const startsAt = Date.parse(screen.nextScheduleStartAt);
  const leadMs = screen.wakeLeadTimeMinutes * 60_000;
  return startsAt - now <= leadMs && startsAt > now;
}

/**
 * The single decision the loop makes per screen per round.
 *
 * Order is load-bearing. Extending Developer Mode comes before launching the
 * app, because an expired session means the TV has already deleted it — a
 * launch against that would fail for a reason nobody could see.
 *
 * `skipSettle` is for a person standing at the set, such as the onboarding
 * wizard, who would rather see an error than wait three minutes for nothing.
 */
export function decideAction(
  screen: AgentScreenConfigMessage,
  reachable: boolean,
  runtime: ScreenRuntime,
  now: number,
  options: { skipSettle?: boolean } = {},
): ScreenAction {
  if (!reachable) {
    if (now - runtime.lastWakeAt < WAKE_COOLDOWN_MS) {
      return { kind: 'none' };
    }
    if (isWakeBeforeScheduleDue(screen, now)) {
      return { kind: 'wake', reason: 'schedule' };
    }
    if (screen.wakeOnUnreachableEnabled && screen.macAddress) {
      return { kind: 'wake', reason: 'unreachable' };
    }
    return { kind: 'none' };
  }

  // Holds back the extension as well: it makes the set call LG over HTTPS.
  if (!options.skipSettle && isSettling(runtime, now)) {
    return { kind: 'none' };
  }

  if (isDevmodeExtensionDue(screen, now, runtime)) {
    return { kind: 'extend-devmode' };
  }

  if (wantsLaunch(screen) && now - runtime.lastLaunchAt >= LAUNCH_COOLDOWN_MS) {
    return { kind: 'launch' };
  }

  return { kind: 'none' };
}

/**
 * When the loop will launch the app on a set it is leaving to settle, so the
 * dashboard can say so. Null outside the settle wait: a launch cooldown alone
 * follows a launch that already happened, and announcing a retry while the app
 * is still starting would only flicker.
 */
export function plannedLaunchAt(
  screen: AgentScreenConfigMessage,
  runtime: ScreenRuntime,
  now: number,
): number | null {
  if (!runtime.reachable || !wantsLaunch(screen) || !isSettling(runtime, now)) {
    return null;
  }
  const at = Math.max(
    runtime.reachableSince + SETTLE_AFTER_REACHABLE_MS,
    runtime.lastLaunchAt + LAUNCH_COOLDOWN_MS,
  );
  return at > now ? at : null;
}

function isSettling(runtime: ScreenRuntime, now: number): boolean {
  return now - runtime.reachableSince < SETTLE_AFTER_REACHABLE_MS;
}

function wantsLaunch(screen: AgentScreenConfigMessage): boolean {
  return screen.autoLaunchEnabled && screen.playerHeartbeatStale;
}

/** Exponential, capped, measured from the probe interval. */
export function backoffFor(failures: number, probeIntervalMs: number): number {
  return Math.min(probeIntervalMs * 2 ** Math.max(0, failures - 1), BACKOFF_CAP_MS);
}
