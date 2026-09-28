import { inject, Injectable, signal, computed, OnDestroy } from '@angular/core';
import { ScreenSessionService } from './screen-session.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const STORAGE_KEY_URL = 'signage_server_url';
const STORAGE_KEY_API_KEY = 'signage_api_key';
const STORAGE_KEY_SCREEN_ID = 'signage_screen_id';
const STORAGE_KEY_ORG_ID = 'signage_org_id';
const STORAGE_KEY_PAIRING_ID = 'signage_pairing_id';
/**
 * The 256-bit pairing secret is held in `sessionStorage` (not `localStorage`):
 * it survives an F5 reload mid-pairing but is cleared when the tab/app closes
 * and is not shared across tabs, limiting its exposure window.
 */
const STORAGE_KEY_PAIRING_SECRET = 'signage_pairing_secret';

/**
 * Delay between automatic reconnect attempts when a previously-paired screen
 * starts (or wakes) while the backend is unreachable. The screen retries its
 * saved credentials silently until the server comes back.
 */
const AUTO_RECONNECT_DELAY_MS = 60_000;

/**
 * Error raised by {@link ConnectionService.verifyConnection}. `unreachable`
 * distinguishes a transient server outage (network error / 5xx — worth
 * retrying) from a rejected credential (401/403 — re-pairing required).
 */
class ConnectionError extends Error {
  constructor(
    message: string,
    readonly unreachable: boolean,
  ) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export interface ConnectionSettings {
  serverUrl: string;
  apiKey: string;
  screenId: string;
  organisationId: string;
}

/** Response body of `POST /api/screens/pairing`. */
interface StartPairingResponse {
  pairingId: string;
  code: string;
  expiresAt: string;
  pairingSecret: string;
}

/** Response body of `GET /api/screens/pairing/:id/status`. */
type PairingStatusResponse =
  | { status: 'pending' }
  | { status: 'claimed'; apiKey: string; screenId: string; organisationId: string };

/** Result of a single poll, normalised for the dialog. */
export type PollPairingResult = 'pending' | 'claimed' | 'expired';

/**
 * Origins allowed to hand credentials to the player. Same-origin always counts;
 * `'null'` is the opaque origin of the webOS shell (`file://`). Deployments that
 * do not use that shell pin the list by setting `window.__SIGNAGE_TRUSTED_ORIGINS__`
 * to a comma-separated list before the bundle loads.
 */
export function trustedConnectOrigins(): readonly string[] {
  const configured = (window as { __SIGNAGE_TRUSTED_ORIGINS__?: unknown })
    .__SIGNAGE_TRUSTED_ORIGINS__;
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== '');
  }
  return [window.location.origin, 'null'];
}

@Injectable({ providedIn: 'root' })
export class ConnectionService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly session = inject(ScreenSessionService);
  /**
   * Accepts a `signage-connect` handoff only from a sender we have reason to
   * trust. Without this, any page that iframes the player can pair the physical
   * display to a screen of its own choosing — the player is deliberately
   * frameable for the LG webOS shell, so framing is not itself a signal.
   *
   * Three conditions, none of which alone is sufficient:
   * - the origin is allow-listed (same-origin by default; `'null'` covers the
   *   webOS shell, which is served from `file://` and therefore has an opaque
   *   origin; operators can pin the list via `window.__SIGNAGE_TRUSTED_ORIGINS__`);
   * - the message comes from the embedding window, not from a random frame;
   * - the player is not connected yet, so a paired display can never be
   *   re-paired by a message.
   */
  private readonly onMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (data == null || typeof data !== 'object' || data.type !== 'signage-connect') {
      return;
    }

    if (!this.isTrustedConnectSender(event)) {
      console.warn(`Ignored signage-connect from untrusted origin ${event.origin}`);
      return;
    }

    const { serverUrl, apiKey } = data;
    if (typeof serverUrl !== 'string' || !serverUrl || typeof apiKey !== 'string' || !apiKey) {
      return;
    }

    this.connect(serverUrl, apiKey);
  };

  private isTrustedConnectSender(event: MessageEvent): boolean {
    if (this._connected()) {
      return false;
    }
    const isFramed = window.parent !== window;
    if (!isFramed || event.source !== window.parent) {
      return false;
    }
    return trustedConnectOrigins().includes(event.origin);
  }

  constructor() {
    window.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMessage);
    this.stopAutoReconnect();
  }

  private readonly _connected = signal(false);
  private readonly _serverUrl = signal('');
  private readonly _apiKey = signal('');
  private readonly _screenId = signal('');
  private readonly _organisationId = signal('');
  private readonly _error = signal('');
  private readonly _connecting = signal(false);
  private readonly _pairingCode = signal('');
  private readonly _pairingExpiresAt = signal('');
  private readonly _reconnecting = signal(false);

  /** Timer for the saved-credentials auto-reconnect loop (see {@link tryAutoConnect}). */
  private autoReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly connected = this._connected.asReadonly();
  readonly serverUrl = this._serverUrl.asReadonly();
  readonly apiKey = this._apiKey.asReadonly();
  readonly screenId = this._screenId.asReadonly();
  readonly organisationId = this._organisationId.asReadonly();
  readonly error = this._error.asReadonly();
  readonly connecting = this._connecting.asReadonly();
  readonly pairingCode = this._pairingCode.asReadonly();
  readonly pairingExpiresAt = this._pairingExpiresAt.asReadonly();
  /** True while a saved-credentials reconnect attempt is pending after a failed auto-connect. */
  readonly reconnecting = this._reconnecting.asReadonly();

  readonly hasSavedSettings = computed(() => {
    const url = localStorage.getItem(STORAGE_KEY_URL);
    const key = localStorage.getItem(STORAGE_KEY_API_KEY);
    return !!url && !!key;
  });

  async tryAutoConnect(): Promise<boolean> {
    const serverUrl = localStorage.getItem(STORAGE_KEY_URL);
    const apiKey = localStorage.getItem(STORAGE_KEY_API_KEY) ?? '';
    const screenId = localStorage.getItem(STORAGE_KEY_SCREEN_ID);
    const organisationId = localStorage.getItem(STORAGE_KEY_ORG_ID);

    // The API key is no longer required to be on disk: a stored refresh token
    // is enough to resume, and after the first exchange the key is removed.
    if (!serverUrl || !screenId || !organisationId) {
      return false;
    }
    if (!apiKey && !this.session.hasStoredRefreshToken()) {
      return false;
    }

    this._serverUrl.set(serverUrl);
    this._apiKey.set(apiKey);
    this._screenId.set(screenId);
    this._organisationId.set(organisationId);

    try {
      // A session now has to exist before anything else: the API key is only a
      // credential on the enrolment route. `refresh` rotates the stored token
      // and falls back to exchanging the key, so it covers both cases.
      await this.session.refresh(serverUrl, apiKey);
      await this.verifyConnection(serverUrl, this.session.token(), screenId);
      this.forgetStoredApiKey();
      this._connected.set(true);
      this.stopAutoReconnect();
      return true;
    } catch (err: unknown) {
      // Backend unreachable (outage / 5xx) for a screen we have credentials for:
      // keep retrying silently so it self-heals when the server returns. A
      // rejected credential (401/403) is not retried — that needs re-pairing.
      if (err instanceof ConnectionError && err.unreachable) {
        this.scheduleAutoReconnect();
      } else {
        this.stopAutoReconnect();
      }
      return false;
    }
  }

  /**
   * Schedules a single auto-reconnect attempt after {@link AUTO_RECONNECT_DELAY_MS}.
   * Each failed attempt re-arms the timer (via {@link tryAutoConnect}), forming a
   * loop that runs until the server returns, the screen connects, or it is
   * disconnected / re-paired.
   */
  private scheduleAutoReconnect(): void {
    this.stopAutoReconnect();
    this._reconnecting.set(true);
    this.autoReconnectTimer = setTimeout(() => {
      this.autoReconnectTimer = null;
      void this.tryAutoConnect();
    }, AUTO_RECONNECT_DELAY_MS);
  }

  private stopAutoReconnect(): void {
    if (this.autoReconnectTimer !== null) {
      clearTimeout(this.autoReconnectTimer);
      this.autoReconnectTimer = null;
    }
    this._reconnecting.set(false);
  }

  async connect(serverUrl: string, apiKey: string): Promise<boolean> {
    this._error.set('');
    this._connecting.set(true);

    const normalizedUrl = serverUrl.replace(/\/+$/, '');

    try {
      // The exchange is the credential check now: the API key opens exactly one
      // route, so everything after this point runs on the session token.
      await this.session.establish(normalizedUrl, apiKey);
      const identity = await this.identify(normalizedUrl, this.session.token());

      await this.verifyConnection(normalizedUrl, this.session.token(), identity.screenId);

      this._serverUrl.set(normalizedUrl);
      this._apiKey.set(apiKey);
      this._screenId.set(identity.screenId);
      this._organisationId.set(identity.organisationId);
      this._connected.set(true);
      this.stopAutoReconnect();

      localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
      localStorage.setItem(STORAGE_KEY_SCREEN_ID, identity.screenId);
      localStorage.setItem(STORAGE_KEY_ORG_ID, identity.organisationId);
      this.persistApiKeyUnlessSessionEstablished(apiKey);

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      this._error.set(message);
      return false;
    } finally {
      this._connecting.set(false);
    }
  }

  /**
   * Begins a device-flow pairing: asks the backend for a fresh 6-digit code,
   * persists the returned pairing id + secret (so a reload mid-pairing can
   * resume polling), and exposes the code/expiry via signals for the dialog.
   */
  async startPairing(serverUrl: string): Promise<{ code: string; expiresAt: string }> {
    this._error.set('');

    const normalizedUrl = serverUrl.replace(/\/+$/, '');

    try {
      const res = await firstValueFrom(
        this.http.post<StartPairingResponse>(`${normalizedUrl}/api/screens/pairing`, null),
      );

      this._serverUrl.set(normalizedUrl);
      this._pairingCode.set(res.code);
      this._pairingExpiresAt.set(res.expiresAt);

      localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
      localStorage.setItem(STORAGE_KEY_PAIRING_ID, res.pairingId);
      sessionStorage.setItem(STORAGE_KEY_PAIRING_SECRET, res.pairingSecret);

      return { code: res.code, expiresAt: res.expiresAt };
    } catch {
      this._error.set('Could not reach the server. Check the URL and try again.');
      throw new Error('Failed to start pairing');
    }
  }

  /**
   * Polls the pairing status once.
   * - `pending`: keep polling.
   * - `claimed`: stores the delivered apiKey/screenId/org via the connected
   *   localStorage keys, clears the pairing keys and marks the player connected.
   * - `expired`: the code is gone (410) or unknown/wrong secret (404) — the
   *   caller must restart pairing.
   */
  async pollPairing(serverUrl: string): Promise<PollPairingResult> {
    const normalizedUrl = serverUrl.replace(/\/+$/, '');
    const pairingId = localStorage.getItem(STORAGE_KEY_PAIRING_ID);
    const pairingSecret = sessionStorage.getItem(STORAGE_KEY_PAIRING_SECRET);

    if (!pairingId || !pairingSecret) {
      return 'expired';
    }

    const headers = new HttpHeaders({ 'X-Pairing-Secret': pairingSecret });

    try {
      const res = await firstValueFrom(
        this.http.get<PairingStatusResponse>(
          `${normalizedUrl}/api/screens/pairing/${pairingId}/status`,
          { headers },
        ),
      );

      if (res.status === 'claimed') {
        this._serverUrl.set(normalizedUrl);
        this._apiKey.set(res.apiKey);
        this._screenId.set(res.screenId);
        this._organisationId.set(res.organisationId);
        // Exchange right away: from here the screen runs on a session token.
        await this.session.establish(normalizedUrl, res.apiKey);
        this._connected.set(true);
        this._error.set('');
        this.stopAutoReconnect();

        localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
        localStorage.setItem(STORAGE_KEY_SCREEN_ID, res.screenId);
        localStorage.setItem(STORAGE_KEY_ORG_ID, res.organisationId);
        // The key is written only if the exchange did not work, so the screen
        // can try again after a restart. On success it stays out of storage.
        this.persistApiKeyUnlessSessionEstablished(res.apiKey);

        this.clearPairing();
        return 'claimed';
      }

      return 'pending';
    } catch (err: unknown) {
      // 410 Gone (expired/consumed) and 404 (unknown id / wrong secret) both
      // mean this pairing can never complete → restart with a new code.
      if (err instanceof HttpErrorResponse && (err.status === 410 || err.status === 404)) {
        this.clearPairing();
        return 'expired';
      }
      // Transient network error — keep polling.
      return 'pending';
    }
  }

  private clearPairing(): void {
    this._pairingCode.set('');
    this._pairingExpiresAt.set('');
    localStorage.removeItem(STORAGE_KEY_PAIRING_ID);
    sessionStorage.removeItem(STORAGE_KEY_PAIRING_SECRET);
  }

  disconnect(): void {
    this.session.clear();
    this.stopAutoReconnect();
    this._connected.set(false);
    this._serverUrl.set('');
    this._apiKey.set('');
    this._screenId.set('');
    this._organisationId.set('');
    this._error.set('');

    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    localStorage.removeItem(STORAGE_KEY_SCREEN_ID);
    localStorage.removeItem(STORAGE_KEY_ORG_ID);

    this.clearPairing();
  }

  /**
   * Keeps the enrolment credential out of storage once a session exists.
   *
   * The rotating refresh token is what resumes a screen from now on. The key is
   * only written when the exchange failed, so a screen that could not get a
   * session yet can still retry after a restart instead of needing someone to
   * re-pair it in person.
   */
  private persistApiKeyUnlessSessionEstablished(apiKey: string): void {
    if (this.session.hasSession()) {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
    }
  }

  /** Drops a key left over from an earlier version once a session is running. */
  private forgetStoredApiKey(): void {
    if (this.session.hasSession()) {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  }

  private async identify(
    serverUrl: string,
    apiKey: string,
  ): Promise<{ screenId: string; organisationId: string }> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${apiKey}`,
    });

    try {
      return await firstValueFrom(
        this.http.get<{ screenId: string; organisationId: string }>(`${serverUrl}/api/screens/me`, {
          headers,
        }),
      );
    } catch {
      throw new Error('Invalid API key or server unreachable');
    }
  }

  private async verifyConnection(
    serverUrl: string,
    apiKey: string,
    screenId: string,
  ): Promise<void> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${apiKey}`,
    });

    try {
      await firstValueFrom(
        this.http.get(`${serverUrl}/api/screens/${screenId}/state`, {
          headers,
        }),
      );
    } catch (err: unknown) {
      // status 0 (network error) or 5xx ⇒ server down/restarting → retryable.
      // 401/403 ⇒ the credential itself was rejected → re-pairing required.
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      const unreachable = status === 0 || status >= 500;
      throw new ConnectionError(
        unreachable ? 'Server unreachable' : 'Invalid API key',
        unreachable,
      );
    }
  }
}
