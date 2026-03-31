import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

export interface DashboardEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const SSE_INITIAL_RETRY_MS = 1_000;
const SSE_MAX_RETRY_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class DashboardSseService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly orgState = inject(OrganisationStateService);
  private readonly zone = inject(NgZone);

  private connectedOrgId: string | null = null;
  private sseAbortController: AbortController | null = null;
  private sseRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private sseRetryDelay = SSE_INITIAL_RETRY_MS;
  private destroyed = false;

  readonly screenOnline$ = new Subject<DashboardEvent>();
  readonly screenOffline$ = new Subject<DashboardEvent>();
  readonly scheduleUpdated$ = new Subject<DashboardEvent>();
  readonly transcodingProgress$ = new Subject<DashboardEvent>();
  readonly transcodingComplete$ = new Subject<DashboardEvent>();
  readonly transcodingFailed$ = new Subject<DashboardEvent>();
  readonly notificationNew$ = new Subject<DashboardEvent>();
  readonly liveStreamHealth$ = new Subject<DashboardEvent>();

  connect(): void {
    const token = this.authService.getToken();
    const orgId = this.orgState.selectedOrgId();
    if (!token || !orgId) return;

    // No-op if already connected to the same org
    if (this.sseAbortController && this.connectedOrgId === orgId) return;

    this.disconnect();

    this.connectedOrgId = orgId;

    const controller = new AbortController();
    this.sseAbortController = controller;

    this.zone.runOutsideAngular(() => {
      this.startSseStream(token, controller);
    });
  }

  disconnect(): void {
    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }
    if (this.sseRetryTimeout !== null) {
      clearTimeout(this.sseRetryTimeout);
      this.sseRetryTimeout = null;
    }
    this.sseRetryDelay = SSE_INITIAL_RETRY_MS;
    this.connectedOrgId = null;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  private async startSseStream(token: string, controller: AbortController): Promise<void> {
    try {
      const response = await fetch('/api/dashboard/events', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'X-Organisation-Id': this.connectedOrgId!,
        },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.zone.run(() => {
        this.sseRetryDelay = SSE_INITIAL_RETRY_MS;
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = this.parseSseBuffer(buffer);
        buffer = events.remaining;

        for (const event of events.parsed) {
          this.zone.run(() => this.routeEvent(event));
        }
      }

      if (!controller.signal.aborted) {
        this.scheduleSseReconnect();
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (!controller.signal.aborted && !this.destroyed) {
        this.scheduleSseReconnect();
      }
    }
  }

  parseSseBuffer(buffer: string): { parsed: DashboardEvent[]; remaining: string } {
    const parsed: DashboardEvent[] = [];
    const blocks = buffer.split('\n\n');
    const remaining = blocks.pop() ?? '';

    for (const block of blocks) {
      const lines = block.split('\n');
      let data = '';
      let eventType = '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          data += line.slice(5).trim();
        } else if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        }
      }

      if (!data || eventType === 'keepalive') continue;

      try {
        const payload = JSON.parse(data) as Record<string, unknown>;

        if (payload['type'] === 'keepalive') continue;

        const event: DashboardEvent = {
          type: (payload['type'] as string) ?? eventType,
          timestamp: (payload['timestamp'] as string) ?? new Date().toISOString(),
          data: (payload['data'] as Record<string, unknown>) ?? payload,
        };

        if (event.type) {
          parsed.push(event);
        }
      } catch {
        // Skip malformed events
      }
    }

    return { parsed, remaining };
  }

  private routeEvent(event: DashboardEvent): void {
    switch (event.type) {
      case 'screen.online':
        this.screenOnline$.next(event);
        break;
      case 'screen.offline':
        this.screenOffline$.next(event);
        break;
      case 'schedule.updated':
        this.scheduleUpdated$.next(event);
        break;
      case 'transcoding.progress':
        this.transcodingProgress$.next(event);
        break;
      case 'transcoding.complete':
        this.transcodingComplete$.next(event);
        break;
      case 'transcoding.failed':
        this.transcodingFailed$.next(event);
        break;
      case 'notification.new':
        this.notificationNew$.next(event);
        break;
      case 'live-stream-health':
        this.liveStreamHealth$.next(event);
        break;
    }
  }

  private scheduleSseReconnect(): void {
    if (this.destroyed) return;

    this.sseRetryTimeout = setTimeout(() => {
      this.sseRetryDelay = Math.min(this.sseRetryDelay * 2, SSE_MAX_RETRY_MS);
      // Re-read token in case it was refreshed
      const token = this.authService.getToken();
      const orgId = this.orgState.selectedOrgId();
      if (!token || !orgId) return;

      const controller = new AbortController();
      this.sseAbortController = controller;
      this.connectedOrgId = orgId;

      this.zone.runOutsideAngular(() => {
        this.startSseStream(token, controller);
      });
    }, this.sseRetryDelay);
  }
}
