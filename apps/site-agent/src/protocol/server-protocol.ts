/**
 * The agent's half of the wire contract with the backend.
 *
 * The other half is `apps/backend/src/site-agent/agent-config.types.ts` plus the
 * DTO classes next to it. The two are deliberately not one shared declaration:
 * `libs/shared-types` has no build target, and every app here compiles with
 * `rootDir: ./src`, so importing across that boundary would nest the build
 * output and move the asset paths. Unifying them is a workspace-wide change to
 * both apps' build configuration, not something to smuggle into this feature.
 *
 * Until then: a field added on one side has to be added on the other, and the
 * end-to-end check in `docs/site-agent.md` is what catches it if it is not.
 */

export type ScreenReachabilityValue = 'unknown' | 'reachable' | 'unreachable';

export type DevmodeKeyStatusValue =
  'unknown' | 'ok' | 'key_server_off' | 'wrong_passphrase' | 'unreachable' | 'no_passphrase';

export type SshStatusValue = 'unknown' | 'ok' | 'auth_failed' | 'host_key_mismatch' | 'unreachable';

export type SsapStatusValue = 'unknown' | 'ok' | 'awaiting_pairing' | 'rejected' | 'unreachable';

export type SiteAgentCommandTypeValue =
  | 'launch'
  | 'wake'
  | 'standby'
  | 'extend_devmode'
  | 'install_app'
  | 'refetch_key'
  | 'reload_config'
  | 'probe_now'
  | 'check';

/** One instruction pushed down the agent's SSE channel. */
export interface SiteAgentCommandMessage {
  commandId: string;
  type: SiteAgentCommandTypeValue;
  /** Absent for agent-wide commands such as `reload_config` and `probe_now`. */
  screenId?: string;
  /** Only for `check`: which onboarding step to run. */
  step?: number;
}

/** One screen as the agent sees it. */
export interface AgentScreenConfigMessage {
  screenId: string;
  name: string;
  localIp: string | null;
  macAddress: string | null;
  ssapPort: number;
  /**
   * Plaintext, and necessarily so: the agent decrypts the TV's SSH key with it.
   * This is the only payload that carries it; the dashboard never sees it.
   */
  devmodePassphrase: string | null;
  autoLaunchEnabled: boolean;
  extendDevmodeEnabled: boolean;
  devmodeExtendIntervalDays: number;
  lastDevmodeExtendAt: string | null;
  wakeBeforeScheduleEnabled: boolean;
  wakeLeadTimeMinutes: number;
  wakeOnUnreachableEnabled: boolean;
  playerHeartbeatStale: boolean;
  nextScheduleStartAt: string | null;
  sshHostKeyFingerprint: string | null;
  keyStatus: DevmodeKeyStatusValue;
  sshStatus: SshStatusValue;
  ssapStatus: SsapStatusValue;
  onboardingStep: number;
}

export interface AgentConfigMessage {
  agentId: string;
  organisationId: string;
  probeIntervalMs: number;
  appId: string;
  screens: AgentScreenConfigMessage[];
}

/** One screen's worth of what the agent observed, sent back in a batch. */
export interface AgentScreenReportMessage {
  screenId: string;
  commandId?: string;
  step?: number;
  reachability?: ScreenReachabilityValue;
  detail?: string;
  keyStatus?: DevmodeKeyStatusValue;
  sshStatus?: SshStatusValue;
  ssapStatus?: SsapStatusValue;
  sshHostKeyFingerprint?: string;
  launched?: boolean;
  woken?: boolean;
  devmodeExtended?: boolean;
  /** App id and version the set reports, so the server can spot an outdated app. */
  installedAppId?: string;
  installedAppVersion?: string;
  /** True when the set acknowledged the standby request. */
  standby?: boolean;
  /** Outcome of an install attempt. */
  installStatus?: 'ok' | 'failed';
}

export interface AgentReportMessage {
  screens: AgentScreenReportMessage[];
}

/**
 * Per-screen runtime metrics the agent pushes on heartbeat. The backend mirror
 * of this contract is `apps/backend/src/observability/agent-metrics.types.ts`
 * (kept in sync by hand — see the note at the top of this file). No
 * `organisationId`: org breakdown stays in the dashboard, not Prometheus.
 */
export interface AgentScreenMetricsMessage {
  screenId: string;
  reachable: boolean;
  failures: number;
  devmodeActive: boolean;
  devmodeExtensions: number;
  launches: number;
  wakes: number;
}

/** Agent-level metrics pushed on heartbeat. */
export interface AgentMetricsMessage {
  uptimeSeconds: number;
  memoryRssBytes: number;
  connected: boolean;
  lastConfigPullAtMs: number;
  screenCount: number;
  screens: AgentScreenMetricsMessage[];
}

export type AgentNetworkKindValue = 'ethernet' | 'wifi' | 'unknown';

/**
 * How the agent's machine is attached to the venue network, pushed on
 * heartbeat and shown in the dashboard. Every field may be unknown: it is read
 * best-effort from the host.
 */
export interface AgentNetworkMessage {
  /** Interface carrying the default route, e.g. `eth0` or `wlan0`. */
  interfaceName: string | null;
  kind: AgentNetworkKindValue;
  /** Only on Wi-Fi, and only when `iw` could read it. */
  ssid: string | null;
  /** IPv4 address of that interface, or a global IPv6 one on an IPv6-only link. */
  ipAddress: string | null;
}

export interface AgentSessionMessage {
  accessToken: string;
  refreshToken: string;
  /** Seconds, never an absolute instant: the venue machine's clock may be off. */
  expiresIn: number;
}

export interface AgentEnrolmentMessage extends AgentSessionMessage {
  agentId: string;
  organisationId: string;
}
