/** Per-screen state the loop keeps in memory, not on disk. */
export interface ScreenRuntime {
  /** Consecutive failed rounds, for the backoff. */
  failures: number;
  /** Earliest time this screen is looked at again. */
  nextAttemptAt: number;
  lastLaunchAt: number;
  lastWakeAt: number;
  /**
   * When this agent last extended Developer Mode, 0 if never.
   *
   * Kept here as well as in the server's config because the cached config is
   * not refetched after a report: relying on it alone made the extension look
   * due on every round, which relaunched the Developer Mode app each minute and
   * starved the launch branch that follows it.
   */
  lastDevmodeExtendAt: number;
  /**
   * When the installed app version was last read, 0 if never.
   *
   * A healthy screen rarely relaunches, so reading the version only during a
   * launch would leave it unknown indefinitely. One read per agent run covers
   * that without opening an SSAP session every round.
   */
  appVersionReadAt: number;
  /** Jitter offset for the Developer Mode extension, stable per screen. */
  devmodeJitterMs: number;
  /** Monotonic count of successful app launches since start, for metrics. */
  launchCount: number;
  /** Monotonic count of Wake-on-LAN packets sent since start, for metrics. */
  wakeCount: number;
  /** Monotonic count of successful Developer Mode extensions, for metrics. */
  devmodeExtendCount: number;
  /** Last observed network reachability of the TV, for metrics. */
  reachable: boolean;
  /**
   * When the set last came back after not answering, 0 while it does not.
   *
   * A TV that was just switched on has no network time yet, so its TLS
   * connections fail until NTP has run. The loop waits from this moment on
   * before it touches the set.
   */
  reachableSince: number;
  /** When the set was last searched for under a new address, 0 if never. */
  lastDiscoveryAt: number;
  /** Consecutive searches that did not find the set, for their own backoff. */
  discoveryMisses: number;
  /**
   * A new address the server has not confirmed yet. Re-sent with every report
   * until one is delivered, and laid over pulled configs until then, so a lost
   * report cannot hand the old address back.
   */
  pendingLocalIp: string | null;
}

export function newRuntime(devmodeJitterMs: number): ScreenRuntime {
  return {
    failures: 0,
    nextAttemptAt: 0,
    lastLaunchAt: 0,
    lastWakeAt: 0,
    lastDevmodeExtendAt: 0,
    appVersionReadAt: 0,
    devmodeJitterMs,
    launchCount: 0,
    wakeCount: 0,
    devmodeExtendCount: 0,
    reachable: false,
    reachableSince: 0,
    lastDiscoveryAt: 0,
    discoveryMisses: 0,
    pendingLocalIp: null,
  };
}
