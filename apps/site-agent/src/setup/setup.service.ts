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

  constructor(
    private readonly connections: ConnectionStore,
    private readonly configs: AgentConfigStore,
    private readonly client: ServerClient,
    private readonly agentVersion: string,
    /** From `MNS_SERVER_URL`, already normalised; null when the file decides. */
    private readonly pinnedServerUrl: string | null = null,
  ) {}

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
    } catch (error) {
      // The operator is standing at the machine with the token in hand; a
      // generic failure would send them looking in the wrong place.
      throw new BadRequestException(describeEnrolmentFailure(error));
    }
    return this.status();
  }

  /** Forgets the session and the cached config, back to the setup screen. */
  async reset(): Promise<SetupStatus> {
    await this.connections.clear();
    await this.configs.clear();
    this.client.invalidateAccessToken();
    this.lastConfigPullAt = null;
    this.logger.warn('Agent reset: session and cached configuration discarded');
    return this.status();
  }
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
