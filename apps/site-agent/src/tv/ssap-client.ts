import { WebSocket } from 'ws';

/** LG's remote-control WebSocket. 3001 is TLS, 3000 plain. */
export const SSAP_TLS_PORT = 3001;

const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;
/** The prompt has to be confirmed with the remote, by a person, once per TV. */
const PAIRING_TIMEOUT_MS = 60_000;

const PERMISSIONS = [
  'LAUNCH',
  'LAUNCH_WEBAPP',
  'READ_APP_STATUS',
  'READ_RUNNING_APPS',
  'READ_INSTALLED_APPS',
  'CONTROL_POWER',
];

/**
 * Bumped whenever {@link PERMISSIONS} changes.
 *
 * A client key is bound to the manifest it was granted for, so a key stored
 * against an older permission set would register without the new rights and
 * fail at the first call that needs them — a confusing 401 rather than the
 * prompt that actually resolves it. Storing the version alongside the key makes
 * the agent ask for a fresh prompt instead.
 */
export const MANIFEST_VERSION = 2;

export const FOREGROUND_URI = 'ssap://com.webos.applicationManager/getForegroundAppInfo';
export const LAUNCH_URI = 'ssap://system.launcher/launch';
export const LIST_APPS_URI = 'ssap://com.webos.applicationManager/listApps';
/**
 * Standby, not screen-off. Measured on a real set: the whole
 * `com.webos.service.tvpower` category answers 401 over SSAP even with
 * CONTROL_POWER granted, so turning only the panel off is not reachable this
 * way. The set stays on the network afterwards when Quick Start+ is on, which
 * is why reachability must never be read as "powered on".
 */
export const TURN_OFF_URI = 'ssap://system/turnOff';

interface SsapMessage {
  id?: string;
  type?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

interface Pending {
  keepOpen: boolean;
  resolve: (message: SsapMessage) => void;
  reject: (error: Error) => void;
}

/** Raised when the TV is showing the prompt and nobody confirmed it. */
export class SsapPairingTimeoutError extends Error {
  constructor() {
    super('Pairing prompt was not confirmed on the TV');
    this.name = 'SsapPairingTimeoutError';
  }
}

export class SsapUnreachableError extends Error {
  constructor(url: string) {
    super(`TV at ${url} did not answer — is Quick Start+ on?`);
    this.name = 'SsapUnreachableError';
  }
}

/**
 * Thin SSAP client: request/response correlated by message id.
 *
 * Ported from `player-applications/lg-tvos/tools/launch-tv.mjs`, which is the
 * version that was verified against a real set. Two things from that file are
 * load-bearing and must not be "improved" here:
 *
 * - Extending the Developer Mode session over SSAP does **not** work. The TV
 *   acks with `returnValue: true` and does nothing; the parameters never reach
 *   the app. That path lives in `SshService` over the Luna bus instead.
 * - On port 3001 the set presents a self-signed certificate. The reference
 *   script turned verification off for its whole process; this one cannot,
 *   because the same process also talks TLS to the signage server. `ws` takes
 *   `rejectUnauthorized` per socket, so the exception stays on the one
 *   connection to a device on the venue's own LAN whose address an operator
 *   typed in.
 */
export class SsapClient {
  private readonly pending = new Map<string, Pending>();
  private counter = 0;

  private constructor(private readonly socket: WebSocket) {
    socket.on('message', (data: Buffer | string) => this.dispatch(data.toString()));
    socket.on('close', () => this.rejectAll(new Error('Connection to the TV was closed')));
    // Without a listener, `ws` turns a socket error into an uncaught exception
    // and takes the agent down with one unreachable TV.
    socket.on('error', () => undefined);
  }

  static async connect(host: string, port: number): Promise<SsapClient> {
    const scheme = port === SSAP_TLS_PORT ? 'wss' : 'ws';
    const url = `${scheme}://${host}:${port}`;
    const socket = await openSocket(url);
    return new SsapClient(socket);
  }

  /**
   * Registers the client. Without a valid key the TV shows a prompt, and only
   * confirming it yields the key that makes every later connection silent.
   */
  register(clientKey: string | null, onPromptShown?: () => void): Promise<string | null> {
    const id = this.nextId('register');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new SsapPairingTimeoutError());
      }, PAIRING_TIMEOUT_MS);

      this.pending.set(id, {
        keepOpen: true,
        resolve: (message) => {
          if (message.type === 'response' && message.payload?.pairingType === 'PROMPT') {
            if (!clientKey) {
              onPromptShown?.();
            }
            return;
          }
          if (message.type !== 'registered') {
            return;
          }
          clearTimeout(timer);
          this.pending.delete(id);
          resolve((message.payload?.['client-key'] as string | undefined) ?? null);
        },
        reject: (error) => {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(error);
        },
      });

      this.socket.send(
        JSON.stringify({ type: 'register', id, payload: buildRegisterPayload(clientKey) }),
      );
    });
  }

  async request(
    uri: string,
    payload: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const message = { type: 'request', id: this.nextId('req'), uri, payload };
    const response = await this.send(message, REQUEST_TIMEOUT_MS);
    if (response.payload?.returnValue === false) {
      throw new Error((response.payload.errorText as string) ?? `${uri} was refused`);
    }
    return response.payload ?? {};
  }

  /** Id of the app currently in the foreground, or null when nothing is. */
  async foregroundAppId(): Promise<string | null> {
    const payload = await this.request(FOREGROUND_URI);
    const appId = payload.appId;
    return typeof appId === 'string' && appId.length > 0 ? appId : null;
  }

  /**
   * Starts the app, optionally handing it launch parameters.
   *
   * The shell uses them to learn the server address, so a freshly installed
   * display needs nobody typing a URL with a remote. Omitted entirely when
   * empty: `params: {}` is not the same as no params to every webOS build.
   */
  async launch(appId: string, params?: Record<string, unknown>): Promise<void> {
    const payload: Record<string, unknown> = { id: appId };
    if (params && Object.keys(params).length > 0) {
      payload.params = params;
    }
    await this.request(LAUNCH_URI, payload);
  }

  /**
   * Version of an installed app, or null when the set does not have it.
   *
   * Covered by READ_INSTALLED_APPS, which the manifest already asks for, so
   * this needs neither Developer Mode nor a new pairing prompt. Verified
   * against a real set: it answers while the app is running.
   */
  async installedAppVersion(appId: string): Promise<string | null> {
    const payload = await this.request(LIST_APPS_URI);
    const apps = payload.apps;
    if (!Array.isArray(apps)) {
      return null;
    }
    const match = apps.find(
      (app): app is { id: string; version?: unknown } =>
        typeof app === 'object' && app !== null && (app as { id?: unknown }).id === appId,
    );
    return typeof match?.version === 'string' ? match.version : null;
  }

  /** Puts the set into standby. Coming back needs Wake-on-LAN. */
  async standby(): Promise<void> {
    await this.request(TURN_OFF_URI);
  }

  close(): void {
    this.socket.close();
  }

  private dispatch(raw: string): void {
    let message: SsapMessage;
    try {
      message = JSON.parse(raw) as SsapMessage;
    } catch {
      return;
    }

    const id = message.id;
    if (!id) {
      return;
    }
    const handler = this.pending.get(id);
    if (!handler) {
      return;
    }

    if (message.type === 'error') {
      this.pending.delete(id);
      handler.reject(new Error(message.error ?? 'Unknown SSAP error'));
      return;
    }

    if (!handler.keepOpen) {
      this.pending.delete(id);
    }
    handler.resolve(message);
  }

  private rejectAll(error: Error): void {
    for (const handler of this.pending.values()) {
      handler.reject(error);
    }
    this.pending.clear();
  }

  private send(message: object & { id: string }, timeoutMs: number): Promise<SsapMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(message.id);
        reject(new Error(`SSAP request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(message.id, {
        keepOpen: false,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      this.socket.send(JSON.stringify(message));
    });
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }
}

function buildRegisterPayload(clientKey: string | null): Record<string, unknown> {
  return {
    forcePairing: false,
    pairingType: 'PROMPT',
    ...(clientKey ? { 'client-key': clientKey } : {}),
    manifest: {
      manifestVersion: 1,
      appVersion: '1.0',
      vendorId: 'com.mynextscreen',
      localizedAppNames: { '': 'myNextScreen Site Agent' },
      permissions: PERMISSIONS,
    },
  };
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    // Scoped to this socket only — see the note on the class.
    const socket = new WebSocket(url, {
      rejectUnauthorized: false,
      handshakeTimeout: CONNECT_TIMEOUT_MS,
    });
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new SsapUnreachableError(url));
    }, CONNECT_TIMEOUT_MS);

    socket.once('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once('error', () => {
      clearTimeout(timer);
      reject(new SsapUnreachableError(url));
    });
  });
}
