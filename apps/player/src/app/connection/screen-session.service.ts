import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY_REFRESH_TOKEN = 'mynextscreen_refresh_token';

/**
 * Why a refresh ended the way it did. Only `rejected` means the credential is
 * dead; `unreachable` (no network, TLS before the clock is set, 5xx, 429) must
 * be retried, or a TV that boots before its network is up asks for pairing.
 */
export type RefreshOutcome = 'renewed' | 'rejected' | 'unreachable';

/** No network, timeout, throttling or a server fault: worth another try. */
const TRANSIENT_STATUSES = new Set([0, 408, 425, 429]);

function failureOf(error: unknown): RefreshOutcome {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  return TRANSIENT_STATUSES.has(status) || status >= 500 ? 'unreachable' : 'rejected';
}

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  /** Seconds. Never an instant — the clock of a TV can be days off. */
  expiresIn: number;
}

/**
 * Holds the screen's session: a short-lived access token for every request and
 * a rotating refresh token that replaces it.
 *
 * The API key is now only an enrolment credential. It is still kept by
 * {@link ConnectionService} and used here when there is no session yet or when
 * refreshing fails, so a screen can always recover on its own — removing it
 * from the device is a later step, and only for players that are not hosted by
 * the webOS shell.
 *
 * Refreshing is **single-flight**. A player has five independent consumers
 * (state, heartbeat, SSE, HLS and media) that hit 401 in the same moment; each
 * one rotating on its own would present an already-consumed token. The server
 * tolerates that within a grace window, but there is no reason to rely on it.
 */
@Injectable({ providedIn: 'root' })
export class ScreenSessionService {
  private readonly http = inject(HttpClient);

  private readonly _accessToken = signal('');
  readonly accessToken = this._accessToken.asReadonly();

  /** Shared by every caller that races into a refresh. */
  private inFlight: Promise<RefreshOutcome> | null = null;

  /** Bearer value for the next request: the session token, or nothing yet. */
  token(): string {
    return this._accessToken();
  }

  hasSession(): boolean {
    return this._accessToken() !== '';
  }

  /** True when a session can be resumed without the enrolment credential. */
  hasStoredRefreshToken(): boolean {
    return (localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN) ?? '') !== '';
  }

  /** Exchanges the enrolment credential for a session. */
  async establish(serverUrl: string, apiKey: string): Promise<boolean> {
    return (await this.exchange(serverUrl, apiKey)) === 'renewed';
  }

  /**
   * Renews the session. Rotates the refresh token, and falls back to a fresh
   * exchange with the API key if that fails — a screen whose refresh token was
   * lost or aged out must not need someone standing in front of it.
   */
  async refresh(serverUrl: string, apiKey: string): Promise<RefreshOutcome> {
    this.inFlight ??= this.runRefresh(serverUrl, apiKey).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Drops the session. The enrolment credential is not touched here. */
  clear(): void {
    this._accessToken.set('');
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  }

  private async runRefresh(serverUrl: string, apiKey: string): Promise<RefreshOutcome> {
    const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
    if (refreshToken) {
      try {
        const session = await firstValueFrom(
          this.http.post<SessionResponse>(`${serverUrl}/api/screens/session/refresh`, {
            refreshToken,
          }),
        );
        this.apply(session);
        return 'renewed';
      } catch (error: unknown) {
        // A transient failure says nothing about either token: keep both and retry later.
        if (failureOf(error) === 'unreachable') return 'unreachable';
        // Rejected: fall through to a fresh exchange rather than giving up.
        this._accessToken.set('');
      }
    }
    return apiKey ? this.exchange(serverUrl, apiKey) : 'rejected';
  }

  private async exchange(serverUrl: string, apiKey: string): Promise<RefreshOutcome> {
    try {
      const session = await firstValueFrom(
        this.http.post<SessionResponse>(`${serverUrl}/api/screens/session`, null, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
      this.apply(session);
      return 'renewed';
    } catch (error: unknown) {
      const outcome = failureOf(error);
      if (outcome === 'rejected') this._accessToken.set('');
      return outcome;
    }
  }

  private apply(session: SessionResponse): void {
    this._accessToken.set(session.accessToken);
    localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, session.refreshToken);
  }
}
