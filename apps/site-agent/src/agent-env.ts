import { ConfigService } from '@nestjs/config';

/** Where persistent state lives inside the container. */
export const DEFAULT_STATE_DIR = '/var/lib/mynextscreen-agent';

/** Port the setup UI listens on. `0` disables it entirely. */
export const DEFAULT_SETUP_PORT = 8787;

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
}
