import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { screenFilePath } from './screen-id.util';
import { Injectable } from '@nestjs/common';
import { DIR_MODE, SECRET_MODE } from '../connection/connection.store';
import { MANIFEST_VERSION } from './ssap-client';

/**
 * The client key an LG TV hands back once someone confirms the pairing prompt
 * with the remote.
 *
 * One per screen, because the key is bound to that set. Keeping it means the
 * prompt appears exactly once per TV in its lifetime — losing the file means
 * someone has to stand in front of the display again, which is why it is
 * written before anything else uses it.
 */
@Injectable()
export class SsapKeyStore {
  constructor(private readonly dir: string) {}

  /**
   * The stored key, or null when there is none **or** it was granted against an
   * older manifest. The second case matters: the set would accept such a key
   * and register without the permissions the manifest now asks for, and the
   * first call needing one would fail with a 401 that no amount of retrying
   * fixes. Returning null asks for the prompt that does.
   */
  async load(screenId: string): Promise<string | null> {
    try {
      const raw = (await readFile(this.pathFor(screenId), 'utf8')).trim();
      if (!raw) {
        return null;
      }
      // Files written before manifest versioning hold the bare key.
      if (!raw.startsWith('{')) {
        return null;
      }
      const stored = JSON.parse(raw) as { key?: unknown; manifestVersion?: unknown };
      if (stored.manifestVersion !== MANIFEST_VERSION || typeof stored.key !== 'string') {
        return null;
      }
      return stored.key || null;
    } catch {
      return null;
    }
  }

  async save(screenId: string, clientKey: string): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: DIR_MODE });
    const path = this.pathFor(screenId);
    const body = JSON.stringify({ key: clientKey, manifestVersion: MANIFEST_VERSION });
    await writeFile(path, `${body}\n`, { encoding: 'utf8', mode: SECRET_MODE });
    await chmod(path, SECRET_MODE);
  }

  async forget(screenId: string): Promise<void> {
    await rm(this.pathFor(screenId), { force: true });
  }

  /**
   * The stored entry as it is, whatever manifest it was granted against. For
   * the backup, which carries the version along so the importing agent can
   * tell a key it can use from one that will only earn a 401.
   */
  async readRaw(screenId: string): Promise<StoredSsapKey | null> {
    try {
      const parsed = JSON.parse(await readFile(this.pathFor(screenId), 'utf8')) as unknown;
      return isStoredSsapKey(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Writes an entry from a backup back exactly as it was stored. */
  async restoreRaw(screenId: string, stored: StoredSsapKey): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: DIR_MODE });
    const path = this.pathFor(screenId);
    const body = JSON.stringify({ key: stored.key, manifestVersion: stored.manifestVersion });
    await writeFile(path, `${body}\n`, { encoding: 'utf8', mode: SECRET_MODE });
    await chmod(path, SECRET_MODE);
  }

  private pathFor(screenId: string): string {
    return screenFilePath(this.dir, screenId, '.key');
  }
}

export interface StoredSsapKey {
  key: string;
  manifestVersion: number;
}

export function isStoredSsapKey(value: unknown): value is StoredSsapKey {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.key === 'string' &&
    candidate.key.length > 0 &&
    candidate.key.length <= 512 &&
    Number.isInteger(candidate.manifestVersion)
  );
}

export function ssapKeyDir(stateDir: string): string {
  return join(stateDir, 'ssap');
}
