import { Injectable, Logger } from '@nestjs/common';
import type {
  AgentConfigMessage,
  AgentEnrolmentMessage,
  AgentReportMessage,
  AgentSessionMessage,
} from '../protocol/server-protocol';
import { ConnectionStore, type StoredConnection } from './connection.store';

/** Raised when the server says the session is gone and refreshing did not help. */
export class SessionRejectedError extends Error {
  constructor(message = 'Agent session was rejected') {
    super(message);
    this.name = 'SessionRejectedError';
  }
}

/** Raised when the server could not be reached at all. Not the same thing. */
export class ServerUnreachableError extends Error {
  constructor(cause: unknown) {
    super(`Server unreachable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'ServerUnreachableError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Set on the retry after a refresh, so one 401 cannot loop. */
  isRetry?: boolean;
}

/**
 * Everything the agent sends to the server.
 *
 * Two failure modes are kept strictly apart, because the agent reacts to them
 * in opposite ways: a rejected session means re-enrolment is needed, while an
 * unreachable server means carry on from the cache and try again later. Folding
 * the second into the first would make a flaky uplink look like a revoked agent
 * and strand the venue.
 */
@Injectable()
export class ServerClient {
  private readonly logger = new Logger(ServerClient.name);

  /** In flight refresh, shared by every caller that hit 401 at the same moment. */
  private refreshInFlight: Promise<string> | null = null;
  private accessToken: string | null = null;

  constructor(private readonly connections: ConnectionStore) {}

  /** Redeems a one-time enrolment token and persists the resulting session. */
  async enrol(serverUrl: string, enrolmentToken: string): Promise<StoredConnection> {
    const result = await this.post<AgentEnrolmentMessage>(
      serverUrl,
      '/api/agents/enrol',
      { enrolmentToken },
      null,
    );

    const connection: StoredConnection = {
      serverUrl: normaliseBaseUrl(serverUrl),
      agentId: result.agentId,
      organisationId: result.organisationId,
      refreshToken: result.refreshToken,
    };
    await this.connections.save(connection);
    this.accessToken = result.accessToken;
    return connection;
  }

  async fetchConfig(): Promise<AgentConfigMessage> {
    return this.request<AgentConfigMessage>('/api/agents/me/config');
  }

  async sendHeartbeat(agentVersion: string | null): Promise<void> {
    await this.request('/api/agents/me/heartbeat', {
      method: 'POST',
      body: agentVersion ? { agentVersion } : {},
    });
  }

  async sendReports(report: AgentReportMessage): Promise<void> {
    await this.request('/api/agents/me/reports', { method: 'POST', body: report });
  }

  /** Absolute URL of the command stream, for the SSE consumer to open. */
  async eventsUrl(): Promise<string> {
    const connection = await this.requireConnection();
    return `${connection.serverUrl}/api/agents/me/events`;
  }

  /** A valid access token, refreshing first if there is none. */
  async authorization(): Promise<string> {
    if (!this.accessToken) {
      return `Bearer ${await this.refresh()}`;
    }
    return `Bearer ${this.accessToken}`;
  }

  /** Drops the cached access token so the next call refreshes. */
  invalidateAccessToken(): void {
    this.accessToken = null;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const connection = await this.requireConnection();
    if (!this.accessToken) {
      await this.refresh();
    }

    const response = await this.send(connection.serverUrl, path, options, this.accessToken);

    if (response.status === 401 && !options.isRetry) {
      // The access token is short-lived; one 401 is the normal way to learn it
      // expired, not evidence of anything wrong.
      this.accessToken = null;
      await this.refresh();
      return this.request<T>(path, { ...options, isRetry: true });
    }

    return this.readBody<T>(response, path);
  }

  /**
   * Rotates the refresh token, once, no matter how many callers ask at the
   * same moment.
   *
   * The agent has several independent consumers — the config pull, the SSE
   * stream, the heartbeat, the report upload — that all hit 401 together when
   * the access token expires. Without this, each would present the same refresh
   * token and all but one would look like a replay.
   */
  private async refresh(): Promise<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<string> {
    const connection = await this.requireConnection();
    const result = await this.post<AgentSessionMessage>(
      connection.serverUrl,
      '/api/agents/session/refresh',
      { refreshToken: connection.refreshToken },
      null,
    );

    await this.connections.updateRefreshToken(result.refreshToken);
    this.accessToken = result.accessToken;
    return result.accessToken;
  }

  private async post<T>(
    baseUrl: string,
    path: string,
    body: unknown,
    token: string | null,
  ): Promise<T> {
    const response = await this.send(baseUrl, path, { method: 'POST', body }, token);
    return this.readBody<T>(response, path);
  }

  private async send(
    baseUrl: string,
    path: string,
    options: RequestOptions,
    token: string | null,
  ): Promise<Response> {
    try {
      return await fetch(`${normaliseBaseUrl(baseUrl)}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      throw new ServerUnreachableError(error);
    }
  }

  private async readBody<T>(response: Response, path: string): Promise<T> {
    if (response.status === 401 || response.status === 403 || response.status === 410) {
      throw new SessionRejectedError(`${path} returned ${response.status}`);
    }
    if (!response.ok) {
      throw new Error(`${path} returned ${response.status}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  private async requireConnection(): Promise<StoredConnection> {
    const connection = await this.connections.load();
    if (!connection) {
      throw new SessionRejectedError('Agent is not enrolled');
    }
    return connection;
  }
}

/** Trailing slashes would produce `//api/...`, which some proxies reject. */
export function normaliseBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
