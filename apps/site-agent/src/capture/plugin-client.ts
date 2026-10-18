import { Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { AgentNdiStreamConfig } from '../protocol/server-protocol';
import {
  CAPTURE_API_MAJOR,
  type PluginErrorResponse,
  type PluginStatus,
  type PluginStreamConfig,
  type PluginStreamStatus,
} from './capture-plugin-protocol';
import { sanitizeStatus, sanitizeStreams } from './plugin-sanitize';
import { NOT_A_SOCKET, PluginUnreachableError, type PluginTransport } from './plugin-transport';

export const POLL_INTERVAL_MS = 2_000;

/**
 * What the agent knows about the plugin.
 * - `unknown`: not polled yet, nothing to act on or report.
 * - `absent`: nobody answers on the socket. The normal state of an agent
 *   without the plugin, so it is never logged as a problem.
 * - `incompatible`: it answers with another API major version, or with
 *   something that is not the documented status.
 * - the plugin's own states otherwise.
 */
export type CaptureState = 'unknown' | 'absent' | 'incompatible' | PluginStatus['state'];

/** Reason the agent itself (not the plugin) gives for `incompatible`. */
export type AgentSideErrorCode = 'unsupported_api_version';

export interface CaptureSnapshot {
  state: CaptureState;
  /** The last status the plugin sent; null while `unknown` or `absent`. */
  status: PluginStatus | null;
  /** Running streams as the plugin lists them; empty unless `ready`. */
  streams: readonly PluginStreamStatus[];
  /** Set when the agent classified the plugin as `incompatible` itself. */
  agentErrorCode: AgentSideErrorCode | null;
}

const UNKNOWN: CaptureSnapshot = {
  state: 'unknown',
  status: null,
  streams: [],
  agentErrorCode: null,
};

/** A plugin answer that is not 2xx. The code is the plugin's fixed vocabulary. */
export class PluginRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Capture plugin answered ${status} (${code})`);
    this.name = 'PluginRequestError';
  }
}

/** Fields the plugin takes: the agent's stream config without id and camera control. */
export function toPluginConfig(config: AgentNdiStreamConfig): PluginStreamConfig {
  return {
    cameraHost: config.cameraHost,
    ndiSourceName: config.ndiSourceName,
    bandwidth: config.bandwidth,
    width: config.width,
    height: config.height,
    fps: config.fps,
    bitrateKbps: config.bitrateKbps,
    encoderPref: config.encoderPref,
  };
}

function errorCodeOf(body: unknown): string {
  const code = (body as Partial<PluginErrorResponse> | undefined)?.error?.code;
  return typeof code === 'string' ? code : 'unknown';
}

/** Major version of an `apiVersion` such as `1` or `1.2`. */
const majorOf = (apiVersion: string): string => apiVersion.split('.')[0] ?? '';

/**
 * Talks to the capture plugin over its unix socket.
 *
 * The socket and the HLS directory live on a volume shared with the plugin
 * container, owned by uid 1000 on both sides: that volume is a trust boundary,
 * and plugin answers are treated as untrusted input (see `plugin-sanitize.ts`).
 *
 * Polls `GET /v1/status` and, while the plugin is `ready`, `GET /v1/streams`
 * every {@link POLL_INTERVAL_MS}. A missing socket is the plugin not being
 * installed, so it becomes the state `absent` without any log line. Every
 * other change of state is logged once, not on every poll.
 */
export class PluginClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PluginClient.name);
  private current: CaptureSnapshot = UNKNOWN;
  private timer: ReturnType<typeof setInterval> | null = null;
  private polling: Promise<void> | null = null;
  private warnedNotSocket = false;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly transport: PluginTransport,
    private readonly options: { enabled: boolean; pollIntervalMs?: number },
  ) {}

  onModuleInit(): void {
    if (!this.options.enabled) {
      return;
    }
    void this.poll();
    this.timer = setInterval(
      () => void this.poll(),
      this.options.pollIntervalMs ?? POLL_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  snapshot(): CaptureSnapshot {
    return this.current;
  }

  /** Calls `listener` after every completed poll. */
  onPoll(listener: () => void): void {
    this.listeners.add(listener);
  }

  /** One poll. Overlapping calls share the poll already in flight. */
  poll(): Promise<void> {
    this.polling ??= this.pollOnce().finally(() => {
      this.polling = null;
    });
    return this.polling;
  }

  /** Starts the stream, or replaces it when the config differs. Throws on any failure. */
  async putStream(streamId: string, config: AgentNdiStreamConfig): Promise<void> {
    const response = await this.transport.send(
      'PUT',
      `/v1/streams/${streamId}`,
      toPluginConfig(config),
    );
    if (response.status !== 200) {
      throw new PluginRequestError(response.status, errorCodeOf(response.body));
    }
  }

  /** Stops the stream; the plugin answers 204 for an unknown id too. */
  async deleteStream(streamId: string): Promise<void> {
    const response = await this.transport.send('DELETE', `/v1/streams/${streamId}`);
    if (response.status !== 204) {
      throw new PluginRequestError(response.status, errorCodeOf(response.body));
    }
  }

  private async pollOnce(): Promise<void> {
    const next = await this.observe();
    if (next.state !== this.current.state) {
      this.logTransition(this.current.state, next);
    }
    this.current = next;
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        this.logger.error(
          `Capture plugin listener failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async observe(): Promise<CaptureSnapshot> {
    let statusResponse;
    try {
      statusResponse = await this.transport.send('GET', '/v1/status');
    } catch (error) {
      return this.unreachable(error);
    }
    if (statusResponse.status !== 200) {
      return { ...UNKNOWN, state: 'error' };
    }
    const body = sanitizeStatus(statusResponse.body);
    if (!body) {
      return { ...UNKNOWN, state: 'incompatible', agentErrorCode: 'unsupported_api_version' };
    }
    if (majorOf(body.apiVersion) !== CAPTURE_API_MAJOR) {
      return {
        state: 'incompatible',
        status: body,
        streams: [],
        agentErrorCode: 'unsupported_api_version',
      };
    }
    const streams = body.state === 'ready' ? await this.listStreams() : null;
    if (streams === null && body.state === 'ready') {
      // Status answered but the stream list did not: keep what we knew rather
      // than reporting streams as gone.
      return {
        state: body.state,
        status: body,
        streams: this.current.streams,
        agentErrorCode: null,
      };
    }
    return { state: body.state, status: body, streams: streams ?? [], agentErrorCode: null };
  }

  private async listStreams(): Promise<PluginStreamStatus[] | null> {
    try {
      const response = await this.transport.send('GET', '/v1/streams');
      return response.status === 200 ? sanitizeStreams(response.body) : null;
    } catch {
      return null;
    }
  }

  private unreachable(error: unknown): CaptureSnapshot {
    if (error instanceof PluginUnreachableError && error.code === NOT_A_SOCKET) {
      if (!this.warnedNotSocket) {
        this.warnedNotSocket = true;
        this.logger.warn(`${error.message}: check MNS_CAPTURE_SOCKET and the shared volume`);
      }
    } else if (!(error instanceof PluginUnreachableError)) {
      this.logger.warn(
        `Unexpected capture plugin failure: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return { ...UNKNOWN, state: 'absent' };
  }

  private logTransition(from: CaptureState, next: CaptureSnapshot): void {
    if (next.state === 'absent') {
      // Silent for an agent that never had the plugin; one line when it vanishes.
      if (from !== 'unknown') {
        this.logger.warn('Capture plugin is no longer reachable');
      }
      return;
    }
    if (next.state === 'incompatible') {
      this.logger.warn(
        `Capture plugin is incompatible (API version ${next.status?.apiVersion ?? 'unknown'}, this agent speaks ${CAPTURE_API_MAJOR}.x)`,
      );
      return;
    }
    this.logger.log(
      `Capture plugin state: ${next.state}${next.status ? ` (plugin ${next.status.pluginVersion})` : ''}`,
    );
  }
}
