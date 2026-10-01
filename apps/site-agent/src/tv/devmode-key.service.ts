import { createPrivateKey } from 'node:crypto';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { screenFilePath } from './screen-id.util';
import { Injectable, Logger } from '@nestjs/common';
import { DIR_MODE, SECRET_MODE } from '../connection/connection.store';
import type { DevmodeKeyStatusValue } from '../protocol/server-protocol';

/** The Developer Mode app serves the key here while its key server is on. */
export const KEY_SERVER_PORT = 9991;
export const KEY_PATH = '/webos_rsa';

const FETCH_TIMEOUT_MS = 8_000;

export interface DevmodeKeyResult {
  status: DevmodeKeyStatusValue;
  /** The encrypted PEM, present only when the status is `ok`. */
  privateKey?: string;
  detail?: string;
}

/**
 * Obtains and caches a TV's SSH key.
 *
 * The key never leaves the venue and is never sent to the server, which only
 * holds the passphrase. What is cached here is the **encrypted** PEM exactly as
 * the TV served it: `ssh2` takes the passphrase at connect time, so there is no
 * reason to ever write a decrypted key to disk.
 *
 * The passphrase is the six-character code shown in the Developer Mode app. It
 * derives from the set's `nduid` and is stable for that device, so it does not
 * need re-entering when Developer Mode is switched on again.
 */
@Injectable()
export class DevmodeKeyService {
  private readonly logger = new Logger(DevmodeKeyService.name);

  constructor(private readonly dir: string) {}

  /**
   * Returns a usable key, fetching it from the TV when the cache has none or
   * the cached one no longer opens with the configured passphrase.
   */
  async obtain(
    screenId: string,
    host: string | null,
    passphrase: string | null,
  ): Promise<DevmodeKeyResult> {
    if (!passphrase) {
      return { status: 'no_passphrase' };
    }

    const cached = await this.readCached(screenId);
    if (cached && this.opensWith(cached, passphrase)) {
      return { status: 'ok', privateKey: cached };
    }

    if (!host) {
      return { status: 'unreachable', detail: 'No address configured for this screen' };
    }

    return this.fetchAndCache(screenId, host, passphrase);
  }

  /** Discards the cached key so the next call pulls a fresh one from the TV. */
  async forget(screenId: string): Promise<void> {
    await rm(this.pathFor(screenId), { force: true });
  }

  private async fetchAndCache(
    screenId: string,
    host: string,
    passphrase: string,
  ): Promise<DevmodeKeyResult> {
    const url = `http://${host}:${KEY_SERVER_PORT}${KEY_PATH}`;
    let pem: string;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        return { status: 'key_server_off', detail: `${url} answered ${response.status}` };
      }
      pem = await response.text();
    } catch (error) {
      // A refused connection is the key server being off, which is a switch in
      // the Developer Mode app; anything else is the TV not being there at all.
      // Telling them apart is what lets the dashboard say what to do.
      //
      // The reason has to be read off the cause chain: Node's fetch reports
      // every transport failure as a bare "fetch failed" and keeps the actual
      // errno one level down.
      const message = describeCause(error);
      const refused = /ECONNREFUSED/i.test(message);
      return {
        status: refused ? 'key_server_off' : 'unreachable',
        detail: `${message} (${url})`,
      };
    }

    if (!this.opensWith(pem, passphrase)) {
      return { status: 'wrong_passphrase', detail: 'The stored passphrase does not open this key' };
    }

    await this.writeCached(screenId, pem);
    this.logger.log(`Fetched Developer Mode key for screen ${screenId} from ${host}`);
    return { status: 'ok', privateKey: pem };
  }

  /**
   * Whether the passphrase actually decrypts the key.
   *
   * Checked here rather than at the first SSH attempt so a wrong passphrase is
   * reported as a wrong passphrase, not as an authentication failure against
   * the TV — two very different things for whoever has to fix it.
   */
  private opensWith(pem: string, passphrase: string): boolean {
    try {
      createPrivateKey({ key: pem, format: 'pem', passphrase });
      return true;
    } catch {
      return false;
    }
  }

  private async readCached(screenId: string): Promise<string | null> {
    try {
      return await readFile(this.pathFor(screenId), 'utf8');
    } catch {
      return null;
    }
  }

  private async writeCached(screenId: string, pem: string): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: DIR_MODE });
    const path = this.pathFor(screenId);
    await writeFile(path, pem, { encoding: 'utf8', mode: SECRET_MODE });
    await chmod(path, SECRET_MODE);
  }

  private pathFor(screenId: string): string {
    return screenFilePath(this.dir, screenId, '.pem');
  }
}

export function devmodeKeyDir(stateDir: string): string {
  return join(stateDir, 'keys');
}

/**
 * Unwraps the cause chain, which is where fetch keeps the real reason.
 *
 * Deliberately duck-typed rather than `instanceof Error`: under Jest the error
 * fetch throws comes from Node's own realm, and a cross-realm `instanceof`
 * silently reports false — which would make every refused connection look like
 * an unreachable host.
 */
function describeCause(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;

  while (isErrorLike(current) && parts.length < 4) {
    parts.push(current.code ?? current.message ?? '');
    current = current.cause;
  }
  return parts.filter(Boolean).join(': ') || String(error);
}

interface ErrorLike {
  message?: string;
  code?: string;
  cause?: unknown;
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null && ('message' in value || 'code' in value);
}
