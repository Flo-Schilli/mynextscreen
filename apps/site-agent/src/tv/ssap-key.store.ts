import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { screenFilePath } from './screen-id.util';
import { Injectable } from '@nestjs/common';
import { DIR_MODE, SECRET_MODE } from '../connection/connection.store';

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

  async load(screenId: string): Promise<string | null> {
    try {
      const key = await readFile(this.pathFor(screenId), 'utf8');
      return key.trim() || null;
    } catch {
      return null;
    }
  }

  async save(screenId: string, clientKey: string): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: DIR_MODE });
    const path = this.pathFor(screenId);
    await writeFile(path, `${clientKey}\n`, { encoding: 'utf8', mode: SECRET_MODE });
    await chmod(path, SECRET_MODE);
  }

  async forget(screenId: string): Promise<void> {
    await rm(this.pathFor(screenId), { force: true });
  }

  private pathFor(screenId: string): string {
    return screenFilePath(this.dir, screenId, '.key');
  }
}

export function ssapKeyDir(stateDir: string): string {
  return join(stateDir, 'ssap');
}
