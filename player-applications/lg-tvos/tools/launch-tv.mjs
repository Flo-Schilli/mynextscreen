#!/usr/bin/env node
/**
 * launch-tv.mjs — startet die myNextScreen-App auf einem LG webOS TV via SSAP.
 *
 * SSAP ist LGs WebSocket-Fernsteuerung (Port 3000 = ws, 3001 = wss mit
 * self-signed Zertifikat). Ersatz fuer den Autostart, den nur Signage-Displays
 * koennen: von aussen anstossen statt auf dem TV konfigurieren.
 *
 * Erstverbindung loest einen Pairing-Prompt auf dem TV aus. Der zurueckgelieferte
 * client-key landet in der Key-Datei; jede weitere Verbindung laeuft ohne Prompt.
 *
 * Kein npm-Paket noetig — Node 22 bringt WebSocket mit.
 *
 *   node launch-tv.mjs --host 192.168.1.50
 *   node launch-tv.mjs --host 192.168.1.50 --watch
 *
 * Hinweis zum Handshake: das Register-Manifest hier ist die minimale Variante
 * ohne LGs signierten Block. Lehnt der TV die Registrierung ab (Fehler statt
 * Prompt), hilft die Bibliothek `lgtv2` (npm), die das vollstaendige signierte
 * Manifest mitliefert.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const DEFAULT_APP_ID = 'com.mynextscreen.webos';
const DEFAULT_PORT = 3001;
const DEFAULT_KEY_FILE = resolve(SCRIPT_DIR, '.lgtv-key');

const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 10_000;
const PAIRING_TIMEOUT_MS = 60_000;
const RECONNECT_DELAY_MS = 5_000;
const RELAUNCH_COOLDOWN_MS = 15_000;

const FOREGROUND_URI = 'ssap://com.webos.applicationManager/getForegroundAppInfo';
const LAUNCH_URI = 'ssap://system.launcher/launch';

/** Nur was das Skript wirklich braucht — Launch plus Vordergrund-Status lesen. */
const PERMISSIONS = ['LAUNCH', 'LAUNCH_WEBAPP', 'READ_APP_STATUS', 'READ_RUNNING_APPS', 'READ_INSTALLED_APPS'];

const USAGE = `
myNextScreen — LG webOS App via SSAP starten

  node launch-tv.mjs [Optionen]

Optionen:
  --host <ip>        IP des TV                        (env TV_HOST)
  --port <3000|3001> 3001 = wss (default), 3000 = ws  (env TV_PORT)
  --app <id>         App-ID                           (env TV_APP_ID, default ${DEFAULT_APP_ID})
  --key-file <pfad>  Ablage des client-key            (env TV_KEY_FILE, default tools/.lgtv-key)
  --watch            Verbindung halten und die App bei Wechsel neu starten
  --strict-tls       Zertifikat des TV pruefen (schlaegt bei self-signed fehl)
  -h, --help         Diese Hilfe

Beispiele:
  node launch-tv.mjs --host 192.168.1.50
  TV_HOST=192.168.1.50 node launch-tv.mjs --watch

Die Developer-Mode-Session verlaengert dieses Skript nicht — SSAP reicht die
noetigen Launch-Parameter nicht an die App durch. Dafuer: ./extend-devmode.sh
`.trimStart();

function parseArgs(argv) {
  const options = {
    host: process.env.TV_HOST ?? '',
    port: Number(process.env.TV_PORT ?? DEFAULT_PORT),
    appId: process.env.TV_APP_ID ?? DEFAULT_APP_ID,
    keyFile: process.env.TV_KEY_FILE ?? DEFAULT_KEY_FILE,
    watch: false,
    strictTls: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Option ${arg} erwartet einen Wert`);
      }
      i += 1;
      return value;
    };

    switch (arg) {
      case '--host':
        options.host = next();
        break;
      case '--port':
        options.port = Number(next());
        break;
      case '--app':
        options.appId = next();
        break;
      case '--key-file':
        options.keyFile = resolve(next());
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--strict-tls':
        options.strictTls = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        throw new Error(`Unbekannte Option: ${arg}`);
    }
  }

  return options;
}

function validate(options) {
  if (!options.host) {
    throw new Error('Keine TV-IP angegeben — --host <ip> oder TV_HOST setzen');
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65_535) {
    throw new Error(`Ungueltiger Port: ${options.port}`);
  }
}

async function loadClientKey(keyFile) {
  try {
    const key = (await readFile(keyFile, 'utf8')).trim();
    return key.length > 0 ? key : undefined;
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw new Error(`Key-Datei ${keyFile} nicht lesbar: ${error.message}`);
  }
}

async function saveClientKey(keyFile, clientKey) {
  await mkdir(dirname(keyFile), { recursive: true });
  await writeFile(keyFile, `${clientKey}\n`, { mode: 0o600 });
}

function buildRegisterPayload(clientKey) {
  return {
    forcePairing: false,
    pairingType: 'PROMPT',
    ...(clientKey ? { 'client-key': clientKey } : {}),
    manifest: {
      manifestVersion: 1,
      appVersion: '1.0',
      vendorId: 'com.mynextscreen',
      localizedAppNames: { '': 'myNextScreen Launcher' },
      permissions: PERMISSIONS,
    },
  };
}

/** Duenner SSAP-Client: Request/Response-Korrelation ueber die Message-ID. */
class SsapClient {
  #socket;
  #pending = new Map();
  #counter = 0;

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener('message', (event) => this.#dispatch(event.data));
    socket.addEventListener('close', () => this.#rejectAll(new Error('Verbindung zum TV geschlossen')));
  }

  #dispatch(raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      console.error('[ssap] Antwort ist kein JSON, ignoriert');
      return;
    }

    const handler = this.#pending.get(message.id);
    if (!handler) return;

    if (message.type === 'error') {
      this.#pending.delete(message.id);
      handler.reject(new Error(message.error ?? 'Unbekannter SSAP-Fehler'));
      return;
    }

    if (handler.keepOpen) {
      handler.resolve(message);
      return;
    }

    this.#pending.delete(message.id);
    handler.resolve(message);
  }

  #rejectAll(error) {
    for (const handler of this.#pending.values()) handler.reject(error);
    this.#pending.clear();
  }

  #send(message, { timeoutMs, keepOpen = false }) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(message.id);
        reject(new Error(`Timeout nach ${timeoutMs} ms fuer ${message.uri ?? message.type}`));
      }, timeoutMs);

      this.#pending.set(message.id, {
        keepOpen,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });

      this.#socket.send(JSON.stringify(message));
    });
  }

  #nextId(prefix) {
    this.#counter += 1;
    return `${prefix}_${this.#counter}`;
  }

  /**
   * Registriert den Client. Ohne gueltigen client-key erscheint ein Prompt auf
   * dem TV; erst dessen Bestaetigung liefert den Key.
   */
  async register(clientKey) {
    const id = this.#nextId('register');
    const message = { type: 'register', id, payload: buildRegisterPayload(clientKey) };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error('Pairing nicht bestaetigt — Prompt auf dem TV uebersehen?'));
      }, PAIRING_TIMEOUT_MS);

      this.#pending.set(id, {
        keepOpen: true,
        resolve: (response) => {
          if (response.type === 'response' && response.payload?.pairingType === 'PROMPT') {
            if (!clientKey) console.log('[ssap] Pairing-Prompt auf dem TV bestaetigen …');
            return;
          }
          if (response.type !== 'registered') return;

          clearTimeout(timer);
          this.#pending.delete(id);
          resolve(response.payload?.['client-key']);
        },
        reject: (error) => {
          clearTimeout(timer);
          this.#pending.delete(id);
          reject(error);
        },
      });

      this.#socket.send(JSON.stringify(message));
    });
  }

  async request(uri, payload = {}) {
    const message = { type: 'request', id: this.#nextId('req'), uri, payload };
    const response = await this.#send(message, { timeoutMs: REQUEST_TIMEOUT_MS });
    if (response.payload?.returnValue === false) {
      throw new Error(response.payload.errorText ?? `${uri} abgelehnt`);
    }
    return response.payload;
  }

  subscribe(uri, onUpdate, onError) {
    const message = { type: 'subscribe', id: this.#nextId('sub'), uri, payload: {} };
    this.#pending.set(message.id, {
      keepOpen: true,
      resolve: (response) => onUpdate(response.payload ?? {}),
      reject: onError,
    });
    this.#socket.send(JSON.stringify(message));
  }

  close() {
    this.#socket.close();
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`TV unter ${url} nicht erreichbar (Timeout)`));
    }, CONNECT_TIMEOUT_MS);

    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve(socket);
    }, { once: true });

    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error(`Verbindung zu ${url} fehlgeschlagen — Port offen? Quick Start+ aktiv?`));
    }, { once: true });
  });
}

async function openSession(options) {
  const scheme = options.port === 3000 ? 'ws' : 'wss';
  const url = `${scheme}://${options.host}:${options.port}`;

  console.log(`[ssap] verbinde mit ${url}`);
  const socket = await connect(url);
  const client = new SsapClient(socket);

  const storedKey = await loadClientKey(options.keyFile);
  const clientKey = await client.register(storedKey);

  if (clientKey && clientKey !== storedKey) {
    await saveClientKey(options.keyFile, clientKey);
    console.log(`[ssap] client-key gespeichert: ${options.keyFile}`);
  }
  console.log('[ssap] registriert');

  return { client, socket };
}

async function launchOnce(options) {
  const { client } = await openSession(options);
  await client.request(LAUNCH_URI, { id: options.appId });
  console.log(`[ssap] ${options.appId} gestartet`);
  client.close();
}

/**
 * Haelt die Verbindung offen, beobachtet die Vordergrund-App und startet die
 * Signage-App neu, sobald etwas anderes laeuft. Der Cooldown verhindert eine
 * Neustart-Schleife, wenn der Launch dauerhaft fehlschlaegt.
 */
async function watch(options) {
  let lastLaunchAt = 0;

  const runSession = async () => {
    const { client, socket } = await openSession(options);

    await new Promise((resolveSession) => {
      socket.addEventListener('close', () => {
        console.warn('[ssap] Verbindung verloren');
        resolveSession();
      }, { once: true });

      client.subscribe(
        FOREGROUND_URI,
        (payload) => {
          const foreground = payload.appId ?? '';
          if (foreground === options.appId) {
            console.log('[ssap] App laeuft im Vordergrund');
            return;
          }

          const now = Date.now();
          if (now - lastLaunchAt < RELAUNCH_COOLDOWN_MS) return;
          lastLaunchAt = now;

          console.log(`[ssap] Vordergrund "${foreground || '<leer>'}" — starte ${options.appId}`);
          client.request(LAUNCH_URI, { id: options.appId }).catch((error) => {
            console.error(`[ssap] Start fehlgeschlagen: ${error.message}`);
          });
        },
        (error) => console.error(`[ssap] Subscription beendet: ${error.message}`),
      );
    });
  };

  for (;;) {
    try {
      await runSession();
    } catch (error) {
      console.error(`[ssap] ${error.message}`);
    }
    console.log(`[ssap] neuer Versuch in ${RECONNECT_DELAY_MS / 1000} s`);
    await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(USAGE);
    return;
  }

  validate(options);

  // Der TV nutzt auf 3001 ein self-signed Zertifikat. Betrifft nur diesen Prozess.
  if (options.port !== 3000 && !options.strictTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('[ssap] TLS-Pruefung aus (self-signed Zertifikat des TV) — --strict-tls erzwingt sie');
  }

  if (options.watch) {
    await watch(options);
    return;
  }

  await launchOnce(options);
}

main().catch((error) => {
  console.error(`[ssap] ${error.message}`);
  process.exitCode = 1;
});
