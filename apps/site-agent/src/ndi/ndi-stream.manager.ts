import { chmod, lstat, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Logger, type OnModuleDestroy } from '@nestjs/common';
import type { HlsUploadService } from '../hls/hls-upload.service';
import type {
  AgentNdiStreamConfig,
  AgentNdiStreamStatusMessage,
} from '../protocol/server-protocol';
import {
  DEFAULT_BACKOFF,
  NdiPipeline,
  type PipelineSettings,
  type StreamDirectory,
} from './ndi-pipeline';
import type { DeviceProbe } from './ndi-encoder';
import type { NdiReceiverFactory } from './ndi-receiver';
import type { FfmpegSpawner } from './ndi-transcoder';
import { isStreamId, streamDir } from './stream-id';

export const NDI_BASE_DIR = join(tmpdir(), 'mns-ndi');

/**
 * Creates the base directory private (0o700) and refuses to use one that could
 * be planted by someone else: a symlink, a non-directory or a directory owned
 * by another user. The base lives in the shared temp dir, where any local user
 * could otherwise pre-create it and read or swap HLS files.
 */
export async function ensureBaseDir(baseDir: string): Promise<void> {
  await mkdir(baseDir, { recursive: true, mode: 0o700 });
  const info = await lstat(baseDir);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error('NDI base directory is not a plain directory');
  }
  const uid = process.getuid?.();
  if (uid !== undefined && info.uid !== uid) {
    throw new Error('NDI base directory is owned by another user');
  }
  if ((info.mode & 0o077) !== 0) {
    await chmod(baseDir, 0o700);
  }
}

export const systemStreamDirectory: StreamDirectory = {
  prepare: async (dir) => {
    await ensureBaseDir(dirname(dir));
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true, mode: 0o700 });
  },
  remove: (dir) => rm(dir, { recursive: true, force: true }),
};

export interface NdiManagerOptions {
  enabled: boolean;
  ffmpegPath: string;
  encoderOverride: string | null;
  arch: string;
  baseDir?: string;
  backoff?: { initialMs: number; maxMs: number };
  directory?: StreamDirectory;
  spawner?: FfmpegSpawner;
  probe?: DeviceProbe;
}

/**
 * True when two stream configs differ in a field the video pipeline depends on.
 * `ptz` is left out on purpose: camera control is read from the current config
 * per command, so changing it must not interrupt the picture.
 */
export function configChanged(a: AgentNdiStreamConfig, b: AgentNdiStreamConfig): boolean {
  return (
    a.cameraHost !== b.cameraHost ||
    a.ndiSourceName !== b.ndiSourceName ||
    a.bandwidth !== b.bandwidth ||
    a.width !== b.width ||
    a.height !== b.height ||
    a.fps !== b.fps ||
    a.bitrateKbps !== b.bitrateKbps ||
    a.encoderPref !== b.encoderPref
  );
}

/**
 * Keeps the running pipelines in line with the server's list of active NDI
 * streams, keyed by stream id. Each stream is started, left alone, restarted
 * (any field changed) or stopped (gone from the list) by `reconcile`, which the
 * supervisor calls after every config refresh.
 */
export class NdiStreamManager implements OnModuleDestroy {
  private readonly logger = new Logger(NdiStreamManager.name);
  private readonly pipelines = new Map<string, NdiPipeline>();
  private queue: Promise<void> = Promise.resolve();
  private warnedDisabled = false;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly receivers: NdiReceiverFactory,
    private readonly uploader: HlsUploadService,
    private readonly options: NdiManagerOptions,
  ) {}

  /** Serialised: overlapping calls (round plus command) cannot interleave start and stop. */
  reconcile(streams: readonly AgentNdiStreamConfig[]): Promise<void> {
    this.queue = this.queue
      .then(() => this.apply(streams))
      .catch((error: unknown) => {
        this.logger.error(
          `NDI reconcile failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    return this.queue;
  }

  /** Calls `listener` whenever any pipeline changes state, e.g. to report it at once. */
  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  status(): AgentNdiStreamStatusMessage[] {
    return [...this.pipelines.values()].map((pipeline) => pipeline.status());
  }

  async onModuleDestroy(): Promise<void> {
    await this.reconcile([]);
  }

  private async apply(streams: readonly AgentNdiStreamConfig[]): Promise<void> {
    const wanted = this.options.enabled ? this.validStreams(streams) : new Map();
    if (!this.options.enabled && streams.length > 0 && !this.warnedDisabled) {
      this.warnedDisabled = true;
      this.logger.warn('NDI streams are configured but MNS_NDI_ENABLED is false; ignoring them');
    }

    for (const [streamId, pipeline] of [...this.pipelines]) {
      const next = wanted.get(streamId);
      if (next && !configChanged(pipeline.config, next)) {
        continue;
      }
      this.pipelines.delete(streamId);
      await pipeline.stop();
      this.logger.log(`Stopped NDI stream ${streamId}`);
    }
    for (const [streamId, config] of wanted) {
      if (!this.pipelines.has(streamId)) {
        this.startPipeline(streamId, config);
      }
    }
  }

  private validStreams(
    streams: readonly AgentNdiStreamConfig[],
  ): Map<string, AgentNdiStreamConfig> {
    const wanted = new Map<string, AgentNdiStreamConfig>();
    for (const stream of streams) {
      if (isStreamId(stream.streamId)) {
        wanted.set(stream.streamId, stream);
      } else {
        this.logger.warn('Ignoring an NDI stream with an invalid id');
      }
    }
    return wanted;
  }

  private startPipeline(streamId: string, config: AgentNdiStreamConfig): void {
    const settings: PipelineSettings = {
      ffmpegPath: this.options.ffmpegPath,
      encoderOverride: this.options.encoderOverride,
      arch: this.options.arch,
      backoff: this.options.backoff ?? DEFAULT_BACKOFF,
    };
    const pipeline = new NdiPipeline(config, {
      receivers: this.receivers,
      uploader: this.uploader,
      directory: this.options.directory ?? systemStreamDirectory,
      dir: streamDir(this.options.baseDir ?? NDI_BASE_DIR, streamId),
      settings,
      spawner: this.options.spawner,
      probe: this.options.probe,
      onChange: () => this.listeners.forEach((listener) => listener()),
    });
    this.pipelines.set(streamId, pipeline);
    pipeline.start();
    this.logger.log(`Started NDI stream ${streamId}`);
  }
}
