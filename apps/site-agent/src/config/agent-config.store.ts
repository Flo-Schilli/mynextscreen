import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { AgentConfigMessage } from '../protocol/server-protocol';
import { DIR_MODE, SECRET_MODE } from '../connection/connection.store';

/**
 * The last configuration the server handed out, kept on disk.
 *
 * This is what lets a venue keep working when the uplink is down: the agent
 * starts from the cache, keeps probing, keeps launching and still wakes a TV
 * before a schedule it already knew about. A server that cannot be reached is
 * not a reason for the hall to go dark.
 *
 * It holds the Developer Mode passphrases, hence mode 0600. That is the same
 * material an operator's laptop carries today, in one documented place instead
 * of a shell history — but an agent that forgot them on restart could not do
 * its job during exactly the outage this cache exists for.
 */
@Injectable()
export class AgentConfigStore {
  private readonly logger = new Logger(AgentConfigStore.name);
  private cached: AgentConfigMessage | null = null;

  constructor(private readonly filePath: string) {}

  /** Null when nothing has ever been pulled. */
  async load(): Promise<AgentConfigMessage | null> {
    if (this.cached) {
      return this.cached;
    }
    try {
      this.cached = JSON.parse(await readFile(this.filePath, 'utf8')) as AgentConfigMessage;
      return this.cached;
    } catch (error) {
      if (!isNotFound(error)) {
        // Carrying on with no config is better than refusing to start: the
        // next successful pull repairs it, and until then nothing is lost that
        // was not already unreadable.
        this.logger.warn(`Discarding unreadable config cache at ${this.filePath}`);
        await rm(this.filePath, { force: true });
      }
      return null;
    }
  }

  async save(config: AgentConfigMessage): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: DIR_MODE });
    await writeFile(this.filePath, JSON.stringify(config, null, 2), {
      encoding: 'utf8',
      mode: SECRET_MODE,
    });
    await chmod(this.filePath, SECRET_MODE);
    this.cached = config;
  }

  /**
   * Replaces one screen's address in the cached config.
   *
   * Written through to disk so a restart does not go back to knocking on the
   * old address until the next pull. The server learns the address from the
   * report, so the next pull agrees with this.
   */
  async updateScreenAddress(screenId: string, localIp: string): Promise<void> {
    const config = this.cached;
    if (!config) {
      return;
    }
    await this.save({
      ...config,
      screens: config.screens.map((screen) =>
        screen.screenId === screenId ? { ...screen, localIp } : screen,
      ),
    });
  }

  async clear(): Promise<void> {
    this.cached = null;
    await rm(this.filePath, { force: true });
  }

  /** Whatever is in memory right now, without touching the disk. */
  current(): AgentConfigMessage | null {
    return this.cached;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

export function configCachePath(stateDir: string): string {
  return join(stateDir, 'config.json');
}
