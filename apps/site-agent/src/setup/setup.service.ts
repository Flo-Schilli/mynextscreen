import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConnectionStore } from '../connection/connection.store';
import { ServerClient } from '../connection/server-client.service';
import { AgentConfigStore } from '../config/agent-config.store';

/** What the setup page shows. Contains no secret, so it needs no PIN. */
export interface SetupStatus {
  connected: boolean;
  serverUrl: string | null;
  /** True when `MNS_SERVER_URL` fixed the address; the page then shows it read-only. */
  serverUrlPinned: boolean;
  agentId: string | null;
  organisationId: string | null;
  screenCount: number;
  lastConfigPullAt: string | null;
  agentVersion: string;
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);
  private lastConfigPullAt: Date | null = null;
  private readonly enrolledListeners: Array<() => void> = [];

  constructor(
    private readonly connections: ConnectionStore,
    private readonly configs: AgentConfigStore,
    private readonly client: ServerClient,
    private readonly agentVersion: string,
    /** From `MNS_SERVER_URL`, already normalised; null when the file decides. */
    private readonly pinnedServerUrl: string | null = null,
  ) {}

  /**
   * Lets the supervisor check in right after enrolment. Without it the server
   * learns of the agent only on the next heartbeat tick, up to a minute after
   * this page already said "connected". A listener here rather than injecting
   * the supervisor, which already depends on this service.
   */
  onEnrolled(listener: () => void): void {
    this.enrolledListeners.push(listener);
  }

  /** Called by the supervisor so the page can show how fresh the config is. */
  recordConfigPull(at: Date = new Date()): void {
    this.lastConfigPullAt = at;
  }

  async status(): Promise<SetupStatus> {
    const connection = await this.connections.load();
    const config = this.configs.current();

    return {
      connected: connection !== null,
      serverUrl: connection?.serverUrl ?? this.pinnedServerUrl,
      serverUrlPinned: this.connections.isServerUrlPinned,
      agentId: connection?.agentId ?? null,
      organisationId: connection?.organisationId ?? null,
      screenCount: config?.screens.length ?? 0,
      lastConfigPullAt: this.lastConfigPullAt?.toISOString() ?? null,
      agentVersion: this.agentVersion,
    };
  }

  async enrol(serverUrl: string | undefined, enrolmentToken: string): Promise<SetupStatus> {
    // When the deployment pinned the address, the form cannot move it. Letting
    // the page enrol somewhere else would reopen exactly the hole the pin
    // closes — the agent would hand a fresh session to whoever asked.
    const target = this.pinnedServerUrl ?? serverUrl;
    if (!target) {
      throw new BadRequestException('Enter the address of the myNextScreen server.');
    }
    try {
      const connection = await this.client.enrol(target, enrolmentToken);
      this.logger.log(`Enrolled as agent ${connection.agentId}`);
      this.enrolledListeners.forEach((listener) => listener());
    } catch (error) {
      // The operator is standing at the machine with the token in hand; a
      // generic failure would send them looking in the wrong place.
      throw new BadRequestException(describeEnrolmentFailure(error));
    }
    return this.status();
  }

  /**
   * Forgets the session and the cached config, back to the setup screen.
   *
   * Gated on a fresh setup code from the dashboard: the server is asked to end
   * the session first, which only succeeds for an authenticated OrgAdmin's code
   * scoped to this agent's organisation. That keeps anyone with mere reach to
   * the venue LAN from stranding the agent by resetting it. The local state is
   * cleared only after the server has accepted the code.
   */
  async reset(setupCode: string): Promise<SetupStatus> {
    try {
      await this.client.requestReset(setupCode);
    } catch (error) {
      throw new BadRequestException(describeResetFailure(error));
    }
    await this.connections.clear();
    await this.configs.clear();
    this.client.invalidateAccessToken();
    this.lastConfigPullAt = null;
    this.logger.warn('Agent reset: session and cached configuration discarded');
    return this.status();
  }
}

function describeResetFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('410')) {
    return 'That setup code has already been used. Issue a new one in the dashboard.';
  }
  if (message.includes('401') || message.includes('403')) {
    return 'That setup code is not valid or has expired. Issue a new one in the dashboard.';
  }
  if (message.startsWith('Server unreachable')) {
    return 'The server could not be reached to confirm the reset.';
  }
  return `Reset failed: ${message}`;
}

function describeEnrolmentFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('410')) {
    return 'That enrolment token has already been used. Issue a new one in the dashboard.';
  }
  if (message.includes('401')) {
    return 'That enrolment token is not valid or has expired.';
  }
  if (message.startsWith('Server unreachable')) {
    return 'The server could not be reached at that address.';
  }
  return `Enrolment failed: ${message}`;
}
