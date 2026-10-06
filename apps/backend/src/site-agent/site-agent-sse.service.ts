import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, finalize, interval, map, merge, takeUntil } from 'rxjs';
import type { SiteAgentCommand } from './site-agent-command.types';

/** Matches the keepalive the screen and dashboard streams use. */
const KEEPALIVE_INTERVAL_MS = 30_000;

/**
 * Shape Nest's `@Sse()` serialises. Declared locally, as the dashboard and
 * screen streams do, so the DOM `MessageEvent` is not pulled in — it carries
 * two dozen fields none of this needs.
 */
interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

interface AgentConnection {
  events: Subject<SiteAgentCommand>;
  close: Subject<void>;
}

/**
 * The server's push channel to a connected site agent.
 *
 * Only carries commands a human asked for right now ("start the app", "run this
 * onboarding check"). Everything the agent does on its own schedule — probing,
 * waking before a schedule, extending Developer Mode — comes from the config it
 * already holds, so a dropped event costs nothing and a reconnect needs no
 * replay.
 *
 * As with the screen and dashboard streams, the connection map is per process.
 * A horizontally scaled backend would only reach an agent from the instance it
 * is connected to. That is the platform's existing shape rather than something
 * new here, but it is the reason this channel carries nothing that must not be
 * lost.
 */
@Injectable()
export class SiteAgentSseService implements OnModuleDestroy {
  private readonly logger = new Logger(SiteAgentSseService.name);
  private readonly connections = new Map<string, AgentConnection>();

  onModuleDestroy(): void {
    for (const [, conn] of this.connections) {
      conn.close.next();
      conn.close.complete();
      conn.events.complete();
    }
    this.connections.clear();
  }

  /** Number of open agent SSE connections. Read by observability. */
  activeConnectionCount(): number {
    return this.connections.size;
  }

  subscribe(agentId: string): Observable<MessageEvent> {
    let conn = this.connections.get(agentId);
    if (!conn) {
      conn = { events: new Subject<SiteAgentCommand>(), close: new Subject<void>() };
      this.connections.set(agentId, conn);
      this.logger.log(`SSE connection opened for site agent ${agentId}`);
    }

    const { events, close } = conn;

    const keepalive$ = interval(KEEPALIVE_INTERVAL_MS).pipe(
      takeUntil(close),
      map((): MessageEvent => ({ data: '', type: 'keepalive' })),
    );

    const events$ = events.pipe(
      map((command): MessageEvent => ({ data: command, type: 'command' })),
    );

    return merge(events$, keepalive$).pipe(
      finalize(() => {
        const current = this.connections.get(agentId);
        if (current && current.events === events && !events.observed) {
          this.connections.delete(agentId);
          this.logger.log(`SSE connection closed for site agent ${agentId}`);
        }
      }),
    );
  }

  /** True when this process holds an open stream to that agent. */
  isConnected(agentId: string): boolean {
    return this.connections.has(agentId);
  }

  /**
   * Pushes a command. Returns false when the agent is not connected — the
   * caller turns that into a 409 rather than queueing: a "start the app now"
   * that fires six hours later is worse than none at all, and the operator
   * needs to know the venue is unreachable, not get a silent accept.
   */
  push(agentId: string, command: SiteAgentCommand): boolean {
    const conn = this.connections.get(agentId);
    if (!conn) {
      return false;
    }
    conn.events.next(command);
    return true;
  }
}
