export const SCREEN_ONBOARDING_CHECKED = 'screen.onboarding-checked';
export const SCREEN_REACHABILITY_CHANGED = 'screen.reachability-changed';

/**
 * Result of one onboarding check, on its way to the dashboard's SSE stream.
 *
 * The wizard fires a check over HTTP and gets a 202 with a `commandId`; the
 * answer arrives here, on the stream the dashboard already has open. That keeps
 * a request/response over an async channel from needing a pending-promise map
 * on the request path.
 */
export class ScreenOnboardingCheckedEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
    public readonly commandId: string | null,
    public readonly step: number,
    public readonly ok: boolean,
    public readonly detail: string | null,
  ) {}
}

/** Emitted when an agent's view of a TV's reachability changes. */
export class ScreenReachabilityChangedEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
    public readonly reachability: string,
    public readonly lastProbeAt: Date,
    /** Set only when the agent found the set under a new address this round. */
    public readonly localIp: string | null = null,
  ) {}
}

export const SCREEN_REMOTE_CONFIG_CHANGED = 'screen.remote-config-changed';

/**
 * Something an agent's cached config depends on changed.
 *
 * Carries the agents to notify rather than the new values: the agent re-pulls
 * the whole config, so a missed event self-heals on the next periodic pull.
 * Reassigning a screen touches two agents, which is why this is a list.
 */
export class ScreenRemoteConfigChangedEvent {
  constructor(public readonly agentIds: readonly string[]) {}
}
