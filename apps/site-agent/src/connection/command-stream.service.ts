import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConnectionStore } from './connection.store';
import { ServerClient } from './server-client.service';
import type { SiteAgentCommandMessage } from '../protocol/server-protocol';

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export type CommandHandler = (command: SiteAgentCommandMessage) => Promise<void> | void;

/**
 * Holds the SSE stream the server pushes operator commands down.
 *
 * `EventSource` is not used because the stream needs an `Authorization`
 * header — the same reason the dashboard parses SSE by hand. The reconnect
 * backoff matches that implementation too.
 *
 * Losing this connection costs nothing: everything the agent does on a schedule
 * comes from its cached config, so there is no state to replay and no gap to
 * fill when it comes back.
 */
@Injectable()
export class CommandStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommandStreamService.name);
  private readonly handlers: CommandHandler[] = [];
  private controller: AbortController | null = null;
  private stopped = false;
  private backoffMs = INITIAL_BACKOFF_MS;

  constructor(
    private readonly connections: ConnectionStore,
    private readonly client: ServerClient,
  ) {}

  onModuleInit(): void {
    void this.run();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.controller?.abort();
  }

  onCommand(handler: CommandHandler): void {
    this.handlers.push(handler);
  }

  private async run(): Promise<void> {
    while (!this.stopped) {
      if (!(await this.connections.load())) {
        // Not enrolled yet: the setup UI is where that happens, so simply wait.
        await delay(this.backoffMs);
        continue;
      }

      try {
        await this.consume();
        this.backoffMs = INITIAL_BACKOFF_MS;
      } catch (error) {
        if (this.stopped) {
          return;
        }
        this.logger.warn(`Command stream dropped: ${describe(error)}`);
        await delay(this.backoffMs);
        this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      }
    }
  }

  private async consume(): Promise<void> {
    this.controller = new AbortController();
    const response = await fetch(await this.client.eventsUrl(), {
      headers: { Accept: 'text/event-stream', Authorization: await this.client.authorization() },
      signal: this.controller.signal,
    });

    if (response.status === 401) {
      this.client.invalidateAccessToken();
      throw new Error('Command stream rejected the session');
    }
    if (!response.ok || !response.body) {
      throw new Error(`Command stream returned ${response.status}`);
    }

    this.logger.log('Command stream connected');
    await this.readEvents(response.body);
  }

  private async readEvents(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        throw new Error('Command stream ended');
      }

      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line; a partial frame stays in the
      // buffer until its terminator arrives.
      let separator = buffer.indexOf('\n\n');
      while (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        await this.handleFrame(frame);
        separator = buffer.indexOf('\n\n');
      }
    }
  }

  private async handleFrame(frame: string): Promise<void> {
    const dataLines = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());

    const payload = dataLines.join('\n');
    if (!payload) {
      // A keepalive carries an empty data field. Nothing to do, and the fact
      // that it arrived is already proof the connection is alive.
      return;
    }

    let command: SiteAgentCommandMessage;
    try {
      command = JSON.parse(payload) as SiteAgentCommandMessage;
    } catch {
      this.logger.warn('Ignoring a command that was not JSON');
      return;
    }

    for (const handler of this.handlers) {
      try {
        await handler(command);
      } catch (error) {
        // One failing handler must not tear down the stream.
        this.logger.error(`Command ${command.type} failed: ${describe(error)}`);
      }
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
