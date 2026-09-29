import { inject, Injectable, signal, computed, NgZone, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConnectionService } from '../connection/connection.service';
import { ScreenSessionService } from '../connection/screen-session.service';
import { PlayerVersionService } from './player-version.service';
import { TimeSyncService } from './time-sync.service';
import {
  ScreenStateResponse,
  ScreenEvent,
  ScreenEventType,
  Playlist,
  LiveStream,
  ScreenInfo,
  ScheduleEntry,
  GroupInfo,
  GroupPlayEvent,
  PendingEvent,
} from './player.models';

export type PlayerConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

const HEARTBEAT_INTERVAL_MS = 30_000;
const SSE_INITIAL_RETRY_MS = 1_000;
const SSE_MAX_RETRY_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class PlayerService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly connection = inject(ConnectionService);
  private readonly session = inject(ScreenSessionService);
  private readonly playerVersion = inject(PlayerVersionService);
  private readonly timeSync = inject(TimeSyncService);
  private readonly zone = inject(NgZone);

  private readonly _screen = signal<ScreenInfo | null>(null);
  private readonly _currentPlaylist = signal<Playlist | null>(null);
  private readonly _fallbackPlaylist = signal<Playlist | null>(null);
  private readonly _epoch = signal(0);
  private readonly _scheduleEntries = signal<ScheduleEntry[]>([]);
  private readonly _activeLiveStream = signal<LiveStream | null>(null);
  private readonly _status = signal<PlayerConnectionStatus>('disconnected');
  private readonly _lastEvent = signal<ScreenEvent | null>(null);
  private readonly _groupInfo = signal<GroupInfo | null>(null);
  private readonly _groupPlayEvent = signal<GroupPlayEvent | null>(null);
  private readonly _pendingEvent = signal<PendingEvent | null>(null);

  readonly screen = this._screen.asReadonly();
  readonly currentPlaylist = this._currentPlaylist.asReadonly();
  readonly fallbackPlaylist = this._fallbackPlaylist.asReadonly();
  readonly epoch = this._epoch.asReadonly();
  readonly scheduleEntries = this._scheduleEntries.asReadonly();
  readonly activeLiveStream = this._activeLiveStream.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastEvent = this._lastEvent.asReadonly();
  readonly groupInfo = this._groupInfo.asReadonly();
  readonly groupPlayEvent = this._groupPlayEvent.asReadonly();
  readonly pendingEvent = this._pendingEvent.asReadonly();

  readonly activePlaylist = computed(() => this._currentPlaylist() ?? this._fallbackPlaylist());
  readonly isLiveStreaming = computed(() => this._activeLiveStream() !== null);
  readonly isSplitMode = computed(() => this._groupInfo()?.mode === 'split');
  // Player UI toggles — default to shown when the flag is absent (older server).
  readonly showUnmuteButton = computed(() => this._screen()?.showUnmuteButton !== false);
  readonly showDisconnectButton = computed(() => this._screen()?.showDisconnectButton !== false);

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private sseAbortController: AbortController | null = null;
  private sseRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private sseRetryDelay = SSE_INITIAL_RETRY_MS;
  private destroyed = false;

  private readonly beforeUnloadHandler = () => this.disconnect();

  async connect(): Promise<void> {
    if (this._status() === 'connected' || this._status() === 'connecting') {
      return;
    }

    this._status.set('connecting');

    try {
      await this.fetchState();
      this._status.set('connected');
      this.timeSync.start();
      this.startHeartbeat();
      this.connectSse();
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    } catch {
      this._status.set('disconnected');
      throw new Error('Failed to fetch screen state');
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.disconnectSse();
    this.timeSync.stop();
    this._status.set('disconnected');
    this.applyScreen(null);
    this._currentPlaylist.set(null);
    this._fallbackPlaylist.set(null);
    this._epoch.set(0);
    this._scheduleEntries.set([]);
    this._activeLiveStream.set(null);
    this._lastEvent.set(null);
    this._groupInfo.set(null);
    this._groupPlayEvent.set(null);
    this._pendingEvent.set(null);
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.disconnect();
  }

  async fetchState(): Promise<ScreenStateResponse> {
    const state = await this.withSessionRetry(() =>
      firstValueFrom(
        this.http.get<ScreenStateResponse>(
          `${this.connection.serverUrl()}/api/screens/${this.connection.screenId()}/state`,
          { headers: this.authHeaders() },
        ),
      ),
    );

    this.applyState(state);
    return state;
  }

  applyState(state: ScreenStateResponse): void {
    this.applyScreen(state.screen);
    this._currentPlaylist.set(state.currentPlaylist);
    this._fallbackPlaylist.set(state.fallbackPlaylist);
    this._scheduleEntries.set(state.schedule);
    this._activeLiveStream.set(state.liveStream);
    this._groupInfo.set(state.group);
    this._epoch.set(state.epoch ?? 0);
  }

  /**
   * Stores the screen and pushes its `showDisconnectButton` flag down to
   * {@link ConnectionService}, which enforces it on the shell's unpair message
   * but cannot read it from here: this service already depends on it, so the
   * other direction would close a cycle. Done on the same line as the state
   * write rather than in an `effect`, so the policy is never a render behind
   * the screen it belongs to.
   */
  private applyScreen(screen: ScreenInfo | null): void {
    this._screen.set(screen);
    this.connection.setDisconnectAllowed(this.showDisconnectButton());
  }

  handleEvent(event: ScreenEvent): void {
    this._lastEvent.set(event);

    switch (event.type) {
      case 'schedule_update':
      case 'playlist_update':
      case 'content_update':
      case 'settings_update':
        this.fetchState().catch(() => undefined);
        break;

      case 'refresh':
        // Reload the player like an F5 — picks up fresh assets and re-syncs.
        window.location.reload();
        break;

      case 'live_stream_start':
        // Refetch full state to get the live stream ID needed for HLS URL construction
        this.fetchState().catch(() => undefined);
        break;

      case 'live_stream_stop':
        this._activeLiveStream.set(null);
        break;

      case 'group_play':
        this._groupPlayEvent.set(event.data as unknown as GroupPlayEvent);
        break;

      case 'pending':
        this._pendingEvent.set(event.data as unknown as PendingEvent);
        break;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendHeartbeat(): void {
    void this.withSessionRetry(() =>
      firstValueFrom(
        this.http.post(
          `${this.connection.serverUrl()}/api/screens/${this.connection.screenId()}/heartbeat`,
          // Reported so an operator can see which screens still run an old
          // build; the server only stores it when it is present.
          { playerVersion: this.playerVersion.version() ?? undefined },
          { headers: this.authHeaders() },
        ),
      ),
    ).catch(() => undefined);
  }

  private connectSse(): void {
    this.disconnectSse();

    if (this.destroyed) return;

    const controller = new AbortController();
    this.sseAbortController = controller;

    const url = `${this.connection.serverUrl()}/api/screens/${this.connection.screenId()}/events`;

    this.zone.runOutsideAngular(() => {
      this.startSseStream(url, controller);
    });
  }

  private async startSseStream(url: string, controller: AbortController): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.bearer()}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        // The stream is authorised once, at subscribe: a rejected credential
        // here means renew before retrying, not back off forever.
        await this.session.refresh(this.connection.serverUrl(), this.connection.apiKey());
      }
      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.zone.run(() => {
        this.sseRetryDelay = SSE_INITIAL_RETRY_MS;
        if (this._status() === 'reconnecting') {
          this._status.set('connected');
          // Re-anchor the clock after a gap — the connection may have been down
          // long enough for the local clock to drift.
          this.timeSync.sync().catch(() => undefined);
        }
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
          this.zone.run(() => this.handleEvent(event));
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

  parseSseBuffer(buffer: string): { parsed: ScreenEvent[]; remaining: string } {
    const parsed: ScreenEvent[] = [];
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

      if (!data) continue;

      try {
        const payload = JSON.parse(data) as Record<string, unknown>;

        if (payload['type'] === 'keepalive') continue;

        const event: ScreenEvent = {
          type: (payload['type'] || eventType) as ScreenEventType,
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

  private scheduleSseReconnect(): void {
    if (this.destroyed) return;

    this.zone.run(() => {
      if (this._status() === 'connected') {
        this._status.set('reconnecting');
      }
    });

    // Jittered: without it every screen in an installation reconnects in the
    // same instant after a backend restart, and they all refresh at once too.
    const jitter = 0.5 + Math.random();
    this.sseRetryTimeout = setTimeout(
      () => {
        this.sseRetryDelay = Math.min(this.sseRetryDelay * 2, SSE_MAX_RETRY_MS);
        this.connectSse();
      },
      Math.round(this.sseRetryDelay * jitter),
    );
  }

  private disconnectSse(): void {
    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }
    if (this.sseRetryTimeout !== null) {
      clearTimeout(this.sseRetryTimeout);
      this.sseRetryTimeout = null;
    }
    this.sseRetryDelay = SSE_INITIAL_RETRY_MS;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.bearer()}` });
  }

  /**
   * Only the session token. The API key no longer authenticates anything but
   * the exchange itself, so sending it here would just be a 401 with a
   * credential attached.
   */
  private bearer(): string {
    return this.session.token();
  }

  /**
   * Runs a request and, on a rejected credential, renews the session once and
   * retries. 401 is the primary trigger by design: a TV clock cannot be trusted
   * to decide when a token has expired.
   */
  private async withSessionRetry<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error: unknown) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (status !== 401 && status !== 403) {
        throw error;
      }
      const renewed = await this.session.refresh(
        this.connection.serverUrl(),
        this.connection.apiKey(),
      );
      if (!renewed) {
        throw error;
      }
      return run();
    }
  }
}
