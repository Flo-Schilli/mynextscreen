import type { DevmodeKeyStatus } from './devmode-key-status.enum';
import type { PtzProtocol } from '../live-stream/ptz-protocol.enum';
import type { SshStatus } from './ssh-status.enum';
import type { SsapStatus } from './ssap-status.enum';

/**
 * One screen as the agent sees it.
 *
 * Structurally separate from {@link ScreenRemoteControlDto}, the dashboard's
 * view of the same row, because exactly one of the two may carry
 * `devmodePassphrase` in the clear. Keeping them as two types makes that a
 * property of the type system rather than of whoever writes the next mapper.
 */
export interface AgentScreenConfig {
  screenId: string;
  name: string;
  localIp: string | null;
  macAddress: string | null;
  ssapPort: number;
  /**
   * Plaintext, and necessarily so: the agent decrypts the TV's SSH key with it.
   * It travels over TLS to a machine that already has network reach to the set.
   */
  devmodePassphrase: string | null;
  autoLaunchEnabled: boolean;
  extendDevmodeEnabled: boolean;
  devmodeExtendIntervalDays: number;
  /** So a restarted agent does not immediately extend again. */
  lastDevmodeExtendAt: string | null;
  wakeBeforeScheduleEnabled: boolean;
  wakeLeadTimeMinutes: number;
  wakeOnUnreachableEnabled: boolean;
  /**
   * Derived server-side from the player heartbeat, so the agent does not have
   * to know the offline threshold or keep a clock in sync to apply it.
   */
  playerHeartbeatStale: boolean;
  /**
   * When playback is next due, within the next 24 hours. The agent sets its own
   * wake timer from this rather than waiting for a push: a venue must still
   * come up on time when the uplink is down.
   */
  nextScheduleStartAt: string | null;
  /** Pinned on first connect; a mismatch is reported, never silently accepted. */
  sshHostKeyFingerprint: string | null;
  keyStatus: DevmodeKeyStatus;
  sshStatus: SshStatus;
  ssapStatus: SsapStatus;
  onboardingStep: number;
}

/** One NDI camera the agent turns into an uploaded HLS stream. */
export interface AgentNdiStreamConfig {
  streamId: string;
  /** IP handed to NDI discovery as an extra address. */
  cameraHost: string;
  /** Exact source name; null means the first source found under `cameraHost`. */
  ndiSourceName: string | null;
  bandwidth: 'lowest' | 'highest';
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  encoderPref: 'auto' | 'software' | 'hardware';
  /** Null when PTZ is off. The port is already resolved to the protocol default. */
  ptz: { protocol: PtzProtocol; port: number } | null;
}

/** What the agent hands its capture plugin; absent acceptance means "not accepted". */
export interface AgentNdiPluginConfig {
  /** The active dashboard acceptance. Device acceptances live in the plugin's environment. */
  acceptance: { licenseSha256: string } | null;
}

export interface AgentConfig {
  agentId: string;
  organisationId: string;
  probeIntervalMs: number;
  /** Whether the agent may sweep its subnet to find a display that moved. */
  subnetSweepEnabled: boolean;
  /** The webOS application the agent keeps in the foreground. */
  appId: string;
  screens: AgentScreenConfig[];
  /** Active NDI streams bound to this agent; the agent reconciles against it. */
  ndiStreams: AgentNdiStreamConfig[];
  ndiPlugin: AgentNdiPluginConfig;
}
