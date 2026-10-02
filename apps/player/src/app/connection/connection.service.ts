import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import { ScreenSessionService } from './screen-session.service';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export const STORAGE_KEY_URL = 'mynextscreen_server_url';
const STORAGE_KEY_API_KEY = 'mynextscreen_api_key';
const STORAGE_KEY_SCREEN_ID = 'mynextscreen_screen_id';
const STORAGE_KEY_ORG_ID = 'mynextscreen_org_id';
const STORAGE_KEY_PAIRING_ID = 'mynextscreen_pairing_id';
/**
 * The 256-bit pairing secret is held in `sessionStorage` (not `localStorage`):
 * it survives an F5 reload mid-pairing but is cleared when the tab/app closes
 * and is not shared across tabs, limiting its exposure window.
 */
const STORAGE_KEY_PAIRING_SECRET = 'mynextscreen_pairing_secret';

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
 * Origins allowed to hand the server URL to the player.
 *
 * Same-origin always counts, as does a `file://` origin: that is what the webOS
 * shell sends. Real sets report it as `file://<app-id>-webos` rather than the
 * opaque `'null'` this once assumed, and with only `'null'` trusted the handoff
 * was rejected on every TV — the player then fell back to guessing the server
 * from its own hostname, which cannot work for an address with a port.
 *
 * `'null'` stays accepted for shells that do send it, and it is the weak part
 * of the list: an opaque origin proves nothing, because a page can obtain one
 * for itself by framing through a `sandbox="allow-scripts"` document. A
 * `file://` origin cannot be forged by a web page.
 *
 * A deployment without the webOS shell should therefore drop it, by setting
 * `window.__SIGNAGE_TRUSTED_ORIGINS__` to a comma-separated list before the
 * bundle loads (see `index.html`). With `'null'` gone, the whole class of
 * handoffs from a hostile embedder is gone with it.
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

/** Whether `origin` may hand this player its server URL. */
export function isTrustedConnectOrigin(origin: string): boolean {
  const configured = (window as { __SIGNAGE_TRUSTED_ORIGINS__?: unknown })
    .__SIGNAGE_TRUSTED_ORIGINS__;
  if (typeof configured === 'string' && configured.trim() !== '') {
    return trustedConnectOrigins().includes(origin);
  }
  // Any `file://` origin, not one spelled-out app id: webOS derives it from the
  // id, so pinning one here would break the moment the app is renamed, and a
  // web page cannot claim a file:// origin in the first place.
  return origin.startsWith('file://') || trustedConnectOrigins().includes(origin);
}

@Injectable({ providedIn: 'root' })
export class ConnectionService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly session = inject(ScreenSessionService);
  /**
   * Handles the two messages an embedder (the LG webOS shell) may send:
   * `mynextscreen-connect`, which hands over the server URL, and
   * `mynextscreen-disconnect`, which unpairs the display.
   *
   * Both go through {@link isTrustedEmbedder}, which is the whole boundary.
   * Without it, any page that iframes the player could point the physical
   * display at a server of its choosing or reset it — and the player is
   * deliberately frameable for the shell, so framing is not itself a signal.
   */
  private readonly onMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (data == null || typeof data !== 'object') {
      return;
    }

    if (data.type === 'mynextscreen-connect') {
      this.onConnectMessage(event, data);
    } else if (data.type === 'mynextscreen-disconnect') {
      this.onDisconnectMessage(event);
    }
  };

  private onConnectMessage(event: MessageEvent, data: { serverUrl?: unknown }): void {
    if (!this.isTrustedConnectSender(event)) {
      console.warn(`Ignored mynextscreen-connect from untrusted origin ${event.origin}`);
      return;
    }

    const { serverUrl } = data;
    if (typeof serverUrl !== 'string' || !serverUrl) {
      return;
    }

    // Only the server URL is taken. An `apiKey` in the message is ignored: a
    // handoff used to be able to enrol the display with one, which meant any
    // sender past the trust check could enrol it with a string they invented.
    // Enrolment now happens one way only — the code on the display, claimed in
    // the dashboard.
    this.useServerUrl(serverUrl);
  }

  /**
   * Unpairs the display at the request of the embedding shell.
   *
   * This is how a TV reaches the disconnect at all. The in-player button needs
   * a focus and a pointer that a plain remote does not have, so the shell owns
   * the entry point (a key on the remote plus its settings overlay), the player
   * owns the credentials, and this message is the seam between them.
   *
   * The per-screen `showDisconnectButton` flag governs it exactly as it governs
   * that button — otherwise the shell would be a way around a screen an
   * operator deliberately locked down.
   */
  private onDisconnectMessage(event: MessageEvent): void {
    if (!this.isTrustedEmbedder(event)) {
      console.warn(`Ignored mynextscreen-disconnect from untrusted origin ${event.origin}`);
      return;
    }
    if (!this._connected()) {
      this.replyToEmbedder(event, false, 'not-paired');
      return;
    }
    if (!this._disconnectAllowed()) {
      this.replyToEmbedder(event, false, 'disabled');
      return;
    }
    this.disconnect();
    this.replyToEmbedder(event, true);
  }

  /**
   * Answers the shell so it can tell whoever holds the remote what happened.
   * A refusal is otherwise silent, and on a TV a silent button reads as broken.
   *
   * The shell's origin is opaque (`'null'`), which `postMessage` cannot target,
   * so the reply has to go to `'*'`. What it carries is a boolean and a reason
   * — nothing a listener could not have read off the screen anyway.
   */
  private replyToEmbedder(event: MessageEvent, ok: boolean, reason?: string): void {
    const source = event.source as Window | null;
    if (!source) {
      return;
    }
    source.postMessage(
      { type: 'mynextscreen-disconnect-result', ok, reason },
      event.origin === 'null' ? '*' : event.origin,
    );
  }

  /**
   * Takes the server URL handed over by an embedder and points pairing at it.
   *
   * The dialog derives a URL from its own hostname, which is a guess that only
   * holds for the `player.*`/`api.*` convention. The shell knows the real one,
   * so it wins — and it is persisted, so the next start needs no handoff at all.
   *
   * Note what this trusts: {@link isTrustedConnectSender} is the whole boundary.
   * Whoever clears it can send an unpaired display to a server of their choice,
   * which can then answer its own pairing poll and own the display. That is not
   * new — the key-carrying branch above already granted the equivalent — but it
   * is the reason that check, not the absence of a credential, is what keeps a
   * display safe.
   */
  private useServerUrl(serverUrl: string): void {
    const normalizedUrl = serverUrl.replace(/\/+$/, '');
    if (normalizedUrl === this._serverUrl()) {
      return;
    }
    this._serverUrl.set(normalizedUrl);
    localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
    this._handedServerUrl.set(normalizedUrl);
  }

  /**
   * Whether a message really comes from the shell that embeds the player.
   *
   * Three conditions, none of which alone is sufficient:
   * - the origin is allow-listed (same-origin by default; `'null'` covers the
   *   webOS shell, which is served from `file://` and therefore has an opaque
   *   origin; operators can pin the list via `window.__SIGNAGE_TRUSTED_ORIGINS__`);
   * - the message comes from the embedding window, not from a random frame;
   * - that window is the top-level document, which is what the shell is. This
   *   costs the shell nothing and blocks the cheapest way to fake an opaque
   *   origin — framing the player through a nested `sandbox="allow-scripts"`
   *   document. It does not block a sandboxed *top-level* page, so it raises the
   *   bar rather than closing the door; dropping `'null'` is what closes it.
   */
  private isTrustedEmbedder(event: MessageEvent): boolean {
    const isFramed = window.parent !== window;
    if (!isFramed || event.source !== window.parent) {
      return false;
    }
    if (window.parent !== window.top) {
      return false;
    }
    return isTrustedConnectOrigin(event.origin);
  }

  /**
   * As {@link isTrustedEmbedder}, plus: the player is not connected yet, so a
   * paired display can never be re-pointed at another server by a message.
   */
  private isTrustedConnectSender(event: MessageEvent): boolean {
    if (this._connected()) {
      return false;
    }
    return this.isTrustedEmbedder(event);
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
  /** Last server URL handed over by an embedder; '' when none ever was. */
  private readonly _handedServerUrl = signal('');
  /**
   * Mirror of the screen's `showDisconnectButton` flag, pushed here by
   * `PlayerService` whenever screen state arrives. This service cannot read it
   * itself — `PlayerService` already depends on it, so injecting it back would
   * close a cycle. Defaults to allowed, which is what an absent flag (older
   * server) means everywhere else.
   */
  private readonly _disconnectAllowed = signal(true);

  /** Timer for the saved-credentials auto-reconnect loop (see {@link tryAutoConnect}). */
  private autoReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Id of the newest pairing request; older ones are not allowed to commit. */
  private pairingRequestSeq = 0;

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
  /** Server URL handed over by an embedder, for the dialog to pair against. */
  readonly handedServerUrl = this._handedServerUrl.asReadonly();

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
   *
   * Returns `null` when a newer request has been started in the meantime. Two
   * requests are genuinely in flight whenever an embedder hands over the real
   * server URL while the dialog is still asking the one it guessed, and the
   * slower answer must not commit: it would put its code on the display, its
   * pairing id in storage and possibly its error on screen, none of which
   * belong to the server actually being polled.
   */
  async startPairing(serverUrl: string): Promise<{ code: string; expiresAt: string } | null> {
    this._error.set('');

    const normalizedUrl = serverUrl.replace(/\/+$/, '');
    const request = ++this.pairingRequestSeq;

    try {
      const res = await firstValueFrom(
        this.http.post<StartPairingResponse>(`${normalizedUrl}/api/screens/pairing`, null),
      );

      if (request !== this.pairingRequestSeq) {
        return null;
      }

      this._serverUrl.set(normalizedUrl);
      this._pairingCode.set(res.code);
      this._pairingExpiresAt.set(res.expiresAt);

      localStorage.setItem(STORAGE_KEY_URL, normalizedUrl);
      localStorage.setItem(STORAGE_KEY_PAIRING_ID, res.pairingId);
      sessionStorage.setItem(STORAGE_KEY_PAIRING_SECRET, res.pairingSecret);

      return { code: res.code, expiresAt: res.expiresAt };
    } catch {
      if (request !== this.pairingRequestSeq) {
        return null;
      }
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

  /** Applies the screen's `showDisconnectButton` flag; see {@link _disconnectAllowed}. */
  setDisconnectAllowed(allowed: boolean): void {
    this._disconnectAllowed.set(allowed);
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
