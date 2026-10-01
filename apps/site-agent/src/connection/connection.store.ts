import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { normaliseBaseUrl } from './server-url';

/** Owner-only. The directory holds one tenant's credential and every TV key. */
const SECRET_MODE = 0o600;
const DIR_MODE = 0o700;

export interface StoredConnection {
  serverUrl: string;
  agentId: string;
  organisationId: string;
  refreshToken: string;
}

/**
 * What the agent remembers between restarts: where its server is and how to
 * prove who it is.
 *
 * Deliberately separate from the config cache. This one is the credential; it
 * is written once at enrolment and only replaced on token rotation, while the
 * cache is rewritten on every pull.
 */
@Injectable()
export class ConnectionStore {
  private readonly logger = new Logger(ConnectionStore.name);
  private cached: StoredConnection | null = null;

  constructor(private readonly filePath: string) {}

  /** Null when the agent has never been enrolled. */
  async load(): Promise<StoredConnection | null> {
    if (this.cached) {
      return this.cached;
    }
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as StoredConnection;
      // Checked on the way in, not on first use. A file that has been edited
      // into something the agent should not dial is worth refusing at startup,
      // where it is visible in the log, rather than at whatever request
      // happens to come first.
      this.cached = { ...parsed, serverUrl: normaliseBaseUrl(parsed.serverUrl) };
      return this.cached;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      // A corrupt or tampered file must not look like "never enrolled": that
      // would send the agent back to the setup screen and silently discard a
      // working session.
      this.logger.error(`Connection state at ${this.filePath} is unreadable: ${describe(error)}`);
      throw error;
    }
  }

  async save(connection: StoredConnection): Promise<void> {
    const canonical = { ...connection, serverUrl: normaliseBaseUrl(connection.serverUrl) };
    await mkdir(dirname(this.filePath), { recursive: true, mode: DIR_MODE });
    await writeFile(this.filePath, JSON.stringify(canonical, null, 2), {
      encoding: 'utf8',
      mode: SECRET_MODE,
    });
    // writeFile only applies the mode when it creates the file, so an existing
    // one keeps whatever permissions it had.
    await chmod(this.filePath, SECRET_MODE);
    this.cached = canonical;
  }

  /** Rotation writes the successor token; everything else stays. */
  async updateRefreshToken(refreshToken: string): Promise<void> {
    const current = await this.load();
    if (!current) {
      throw new Error('Cannot rotate a refresh token before enrolment');
    }
    await this.save({ ...current, refreshToken });
  }

  /** Forgets the session. Used by the setup UI's reset action. */
  async clear(): Promise<void> {
    this.cached = null;
    await rm(this.filePath, { force: true });
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Path helper, so the layout is stated once. */
export function connectionFilePath(stateDir: string): string {
  return join(stateDir, 'connection.json');
}

export { SECRET_MODE, DIR_MODE };
