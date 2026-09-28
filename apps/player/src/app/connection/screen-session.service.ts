import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY_REFRESH_TOKEN = 'signage_refresh_token';

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
  private inFlight: Promise<boolean> | null = null;

  /** Bearer value for the next request: the session token, or nothing yet. */
  token(): string {
    return this._accessToken();
  }

  hasSession(): boolean {
    return this._accessToken() !== '';
  }

  /** Exchanges the enrolment credential for a session. */
  async establish(serverUrl: string, apiKey: string): Promise<boolean> {
    try {
      const session = await firstValueFrom(
        this.http.post<SessionResponse>(`${serverUrl}/api/screens/session`, null, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
      this.apply(session);
      return true;
    } catch {
      this._accessToken.set('');
      return false;
    }
  }

  /**
   * Renews the session. Rotates the refresh token, and falls back to a fresh
   * exchange with the API key if that fails — a screen whose refresh token was
   * lost or aged out must not need someone standing in front of it.
   */
  async refresh(serverUrl: string, apiKey: string): Promise<boolean> {
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

  private async runRefresh(serverUrl: string, apiKey: string): Promise<boolean> {
    const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN);
    if (refreshToken) {
      try {
        const session = await firstValueFrom(
          this.http.post<SessionResponse>(`${serverUrl}/api/screens/session/refresh`, {
            refreshToken,
          }),
        );
        this.apply(session);
        return true;
      } catch {
        // Fall through to a fresh exchange rather than giving up.
        this._accessToken.set('');
      }
    }
    return apiKey ? this.establish(serverUrl, apiKey) : false;
  }

  private apply(session: SessionResponse): void {
    this._accessToken.set(session.accessToken);
    localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, session.refreshToken);
  }
}
