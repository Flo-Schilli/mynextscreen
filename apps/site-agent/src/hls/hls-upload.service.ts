import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import {
  HLS_PLAYLIST_CONTENT_TYPE,
  HLS_SEGMENT_CONTENT_TYPE,
} from '../connection/server-client.service';

export const PLAYLIST_NAME = 'index.m3u8';
const SEGMENT_NAME = /^[A-Za-z0-9_-]+\.ts$/;

/** Segments uploaded at the same time; more would only crowd the uplink. */
export const UPLOAD_CONCURRENCY = 2;
export const UPLOAD_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 200;
/** After a failed pass the stream is retried on this delay, so a quiet encoder cannot stall it. */
const PASS_RETRY_DELAY_MS = 1_000;

/** What the uploader needs from the server connection. */
export interface HlsUploadTarget {
  putHlsFile(streamId: string, filename: string, body: Buffer, contentType: string): Promise<void>;
  deleteHlsFile(streamId: string, filename: string): Promise<void>;
}

/** The file system side, injectable so specs need no disk or watcher. */
export interface HlsFileSystem {
  /** Calls `listener` whenever something in `dir` changes. */
  watch(dir: string, listener: () => void): { close(): void };
  readFile(path: string): Promise<Buffer>;
}

export const systemHlsFileSystem: HlsFileSystem = {
  watch: (dir, listener) => watch(dir, () => listener()),
  readFile: (path) => readFile(path),
};

export interface HlsUploadHandle {
  /** Milliseconds from a segment being listed to the server accepting it, last upload. */
  uploadLagMs(): number | null;
  stop(): Promise<void>;
}

/** Segment names listed in a playlist, in order; anything not matching the allowlist is ignored. */
export function parsePlaylistSegments(playlist: string): string[] {
  return playlist
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => SEGMENT_NAME.test(line));
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pushes one stream's HLS output to the server.
 *
 * FFmpeg only lists a segment in the playlist once it is complete, so the
 * playlist is the trigger: on each change every newly listed segment is
 * uploaded, and only then the playlist itself. That order is load-bearing: a
 * player that fetches the playlist must find every segment it names. Segments
 * that left the playlist are deleted on the server afterwards.
 *
 * Segments of an earlier FFmpeg run are not known to a fresh uploader and are
 * not deleted by it: that would need a list endpoint. Their names carry the
 * run id, so they never collide with new ones; the backend removes the whole
 * stream directory on deactivation, and each run leaves at most a few
 * one-second segments behind.
 */
class StreamUploader implements HlsUploadHandle {
  private readonly logger = new Logger('HlsUpload');
  private readonly uploaded = new Set<string>();
  private readonly watcher: { close(): void };
  private running = false;
  private dirty = false;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();
  private lagMs: number | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly streamId: string,
    private readonly dir: string,
    private readonly target: HlsUploadTarget,
    private readonly files: HlsFileSystem,
    private readonly retryDelayMs: number,
  ) {
    this.watcher = files.watch(dir, () => this.trigger());
  }

  uploadLagMs(): number | null {
    return this.lagMs;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.watcher.close();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    await this.current;
  }

  private trigger(): void {
    if (this.stopped) {
      return;
    }
    this.dirty = true;
    if (!this.running) {
      this.current = this.drain();
    }
  }

  private async drain(): Promise<void> {
    this.running = true;
    try {
      while (this.dirty && !this.stopped) {
        this.dirty = false;
        if (!(await this.pass())) {
          this.scheduleRetry();
        }
      }
    } finally {
      this.running = false;
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer || this.stopped) {
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.trigger();
    }, PASS_RETRY_DELAY_MS);
  }

  /** One sync of local state to the server. False when something failed and a retry is needed. */
  private async pass(): Promise<boolean> {
    let playlist: Buffer;
    try {
      playlist = await this.files.readFile(join(this.dir, PLAYLIST_NAME));
    } catch {
      return true; // not written yet, or already cleaned up
    }
    const listed = parsePlaylistSegments(playlist.toString('utf8'));
    const detectedAt = Date.now();
    const fresh = listed.filter((name) => !this.uploaded.has(name));

    if (!(await this.uploadSegments(fresh, detectedAt))) {
      return false;
    }
    if (
      !(await this.attempt(() => this.putFile(PLAYLIST_NAME, playlist, HLS_PLAYLIST_CONTENT_TYPE)))
    ) {
      return false;
    }
    await this.removeRolledOff(new Set(listed));
    return true;
  }

  /** Uploads with a bounded number in flight; false when any segment failed for good. */
  private async uploadSegments(names: string[], detectedAt: number): Promise<boolean> {
    let allOk = true;
    const queue = [...names];
    const worker = async (): Promise<void> => {
      for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
        if (!(await this.uploadSegment(name, detectedAt))) {
          allOk = false;
        }
      }
    };
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));
    return allOk;
  }

  private async uploadSegment(name: string, detectedAt: number): Promise<boolean> {
    let body: Buffer;
    try {
      body = await this.files.readFile(join(this.dir, name));
    } catch {
      // Already rolled off locally; the playlist no longer needs it either.
      this.uploaded.add(name);
      return true;
    }
    const ok = await this.attempt(() => this.putFile(name, body, HLS_SEGMENT_CONTENT_TYPE));
    if (ok) {
      this.uploaded.add(name);
      this.lagMs = Date.now() - detectedAt;
    }
    return ok;
  }

  private putFile(name: string, body: Buffer, contentType: string): Promise<void> {
    return this.target.putHlsFile(this.streamId, name, body, contentType);
  }

  private async removeRolledOff(listed: Set<string>): Promise<void> {
    for (const name of [...this.uploaded]) {
      if (listed.has(name)) {
        continue;
      }
      this.uploaded.delete(name);
      // Best effort: the server also trims, and a leftover segment is harmless.
      await this.target.deleteHlsFile(this.streamId, name).catch((error: unknown) => {
        this.logger.debug(`Could not delete ${name}: ${describeError(error)}`);
      });
    }
  }

  private async attempt(action: () => Promise<void>): Promise<boolean> {
    for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
      try {
        await action();
        return true;
      } catch (error) {
        this.logger.warn(`Upload attempt ${attempt} failed: ${describeError(error)}`);
        if (attempt < UPLOAD_ATTEMPTS && !this.stopped) {
          await sleep(this.retryDelayMs * 2 ** (attempt - 1));
        }
        if (this.stopped) {
          return false;
        }
      }
    }
    return false;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Starts one uploader per stream. Constructed with its seams in `app.module.ts`. */
export class HlsUploadService {
  constructor(
    private readonly target: HlsUploadTarget,
    private readonly files: HlsFileSystem = systemHlsFileSystem,
    private readonly retryDelayMs = RETRY_BASE_DELAY_MS,
  ) {}

  start(streamId: string, dir: string): HlsUploadHandle {
    return new StreamUploader(streamId, dir, this.target, this.files, this.retryDelayMs);
  }
}
