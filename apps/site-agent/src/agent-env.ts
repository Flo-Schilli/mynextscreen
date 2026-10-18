import { ConfigService } from '@nestjs/config';

/** Where persistent state lives inside the container. */
export const DEFAULT_STATE_DIR = '/var/lib/mynextscreen-agent';

/** Port the setup UI listens on. `0` disables it entirely. */
export const DEFAULT_SETUP_PORT = 8787;

/** Control socket of the capture plugin, on the volume shared with its container. */
export const DEFAULT_CAPTURE_SOCKET = '/run/mns-capture/plugin.sock';

/** Where the capture plugin writes HLS, on the shared volume. */
export const DEFAULT_CAPTURE_HLS_DIR = '/var/lib/mns-capture/hls';

/**
 * Typed access to the agent's environment, so the defaults live in one place
 * rather than being repeated at every `config.get` call site.
 */
export class AgentEnv {
  constructor(private readonly config: ConfigService) {}

  /**
   * Where this agent belongs. Mandatory: pinning the address closes the
   * rogue-server hole that the old boot PIN used to cover, so there is no
   * unpinned path left to support.
   */
  get serverUrl(): string | null {
    return this.config.get<string>('MNS_SERVER_URL') ?? null;
  }

  /**
   * Lets the pinned address be plain `http://`. Off by default: with the setup
   * code having replaced the boot PIN, the pin is the only thing left standing
   * between the agent and a rogue server, and a venue LAN is exactly where DNS
   * is easiest to bend. Meant for local development against `localhost`.
   */
  get allowInsecureServerUrl(): boolean {
    return this.config.get<string>('MNS_ALLOW_INSECURE_SERVER_URL') === 'true';
  }

  /** Only consulted when no session is stored yet. */
  get enrolmentToken(): string | null {
    return this.config.get<string>('MNS_ENROLMENT_TOKEN') ?? null;
  }

  get stateDir(): string {
    return this.config.get<string>('MNS_STATE_DIR', DEFAULT_STATE_DIR);
  }

  get setupPort(): number {
    return Number(this.config.get<string>('MNS_SETUP_PORT', String(DEFAULT_SETUP_PORT)));
  }

  /** Switch for the whole NDI feature. On unless explicitly set to `false`. */
  get ndiEnabled(): boolean {
    return this.config.get<string>('MNS_NDI_ENABLED') !== 'false';
  }

  get captureSocket(): string {
    return this.config.get<string>('MNS_CAPTURE_SOCKET')?.trim() || DEFAULT_CAPTURE_SOCKET;
  }

  get captureHlsDir(): string {
    return this.config.get<string>('MNS_CAPTURE_HLS_DIR')?.trim() || DEFAULT_CAPTURE_HLS_DIR;
  }
}
