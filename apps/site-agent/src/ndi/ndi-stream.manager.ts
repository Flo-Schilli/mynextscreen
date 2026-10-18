import { join } from 'node:path';
import { Logger, type OnModuleDestroy } from '@nestjs/common';
import type { PluginClient } from '../capture/plugin-client';
import type { HlsUploadHandle, HlsUploadService } from '../hls/hls-upload.service';
import {
  NDI_STATUS_MAX_ENCODER,
  NDI_STATUS_MAX_SOURCE_NAME,
  type AgentCapturePluginMessage,
  type AgentNdiStreamConfig,
  type AgentNdiStreamStatusMessage,
} from '../protocol/server-protocol';
import { isStreamId } from './stream-id';

export interface NdiManagerOptions {
  enabled: boolean;
  /** Where the plugin writes `<streamId>/index.m3u8`; the shared volume. */
  hlsDir: string;
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

const truncate = (value: string | null, max: number): string | null =>
  value !== null && value.length > max ? value.slice(0, max) : value;

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The part of the plugin client the manager drives; specs pass a fake. */
export type CapturePluginPort = Pick<
  PluginClient,
  'snapshot' | 'onPoll' | 'poll' | 'putStream' | 'deleteStream'
>;

interface AppliedStream {
  config: AgentNdiStreamConfig;
  upload: HlsUploadHandle;
}

/**
 * Keeps the capture plugin's streams in line with the server's list of active
 * NDI streams, keyed by stream id. The video pipelines run in the plugin; this
 * class tells it what to run (`PUT`/`DELETE /v1/streams/:id`) and uploads the
 * HLS files the plugin writes to the shared volume.
 *
 * `reconcile` takes the wanted list, which the supervisor passes after every
 * config refresh. It is remembered, and applied again after every plugin poll,
 * so a plugin that starts later, restarts or is accepted after the agent has
 * its config catches up within one poll interval.
 */
export class NdiStreamManager implements OnModuleDestroy {
  private readonly logger = new Logger(NdiStreamManager.name);
  private wanted: ReadonlyMap<string, AgentNdiStreamConfig> = new Map();
  private readonly applied = new Map<string, AppliedStream>();
  private queue: Promise<void> = Promise.resolve();
  private warnedDisabled = false;
  private applying = false;
  private readonly failing = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private lastSignature = '';

  constructor(
    private readonly plugin: CapturePluginPort,
    private readonly uploader: HlsUploadService,
    private readonly options: NdiManagerOptions,
  ) {
    plugin.onPoll(() => {
      // A poll that apply() asked for itself must not queue another apply.
      if (!this.applying) {
        this.resync();
      }
      this.notifyIfChanged();
    });
  }

  /** Serialised: overlapping calls (round plus command) cannot interleave start and stop. */
  reconcile(streams: readonly AgentNdiStreamConfig[]): Promise<void> {
    if (!this.options.enabled && streams.length > 0 && !this.warnedDisabled) {
      this.warnedDisabled = true;
      this.logger.warn('NDI streams are configured but MNS_NDI_ENABLED is false; ignoring them');
    }
    this.wanted = this.options.enabled ? this.validStreams(streams) : new Map();
    return this.enqueue();
  }

  /** Calls `listener` whenever a stream or the plugin changes state, e.g. to report it at once. */
  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  /** One entry per wanted stream, filled from what the plugin reports. */
  status(): AgentNdiStreamStatusMessage[] {
    const { state, streams } = this.plugin.snapshot();
    return [...this.wanted.keys()].map((streamId): AgentNdiStreamStatusMessage => {
      const stream = streams.find((candidate) => candidate.streamId === streamId);
      const uploadLagMs = this.applied.get(streamId)?.upload.uploadLagMs() ?? null;
      if (stream) {
        return {
          streamId,
          state: stream.state,
          sourceName: truncate(stream.sourceName, NDI_STATUS_MAX_SOURCE_NAME),
          encoder: truncate(stream.encoder, NDI_STATUS_MAX_ENCODER),
          fps: stream.fps,
          framesDropped: stream.framesDropped,
          uploadLagMs,
          error: stream.error,
        };
      }
      // Not listed yet: still starting, or the plugin cannot run it. The fixed
      // error vocabulary has no code for "plugin unavailable"; the plugin block
      // in the report carries the reason.
      const waiting = state === 'unknown' || state === 'ready';
      return {
        streamId,
        state: waiting ? 'connecting' : 'error',
        sourceName: null,
        encoder: null,
        fps: null,
        framesDropped: 0,
        uploadLagMs,
        error: waiting ? null : 'internal_error',
      };
    });
  }

  /** The plugin block of the report; null while nothing is known or the plugin is absent. */
  capturePlugin(): AgentCapturePluginMessage | null {
    if (!this.options.enabled) {
      return null;
    }
    const { state, status, agentErrorCode } = this.plugin.snapshot();
    if (state === 'unknown' || state === 'absent') {
      return null;
    }
    const message: AgentCapturePluginMessage = { state };
    if (status) {
      message.pluginVersion = status.pluginVersion;
      message.apiVersion = status.apiVersion;
      if (status.sdkVersion) {
        message.sdkVersion = status.sdkVersion;
      }
      if (status.license) {
        message.license = {
          licenseSha256: status.license.licenseSha256,
          ndiLicenseSha256: status.license.ndiLicenseSha256,
          termsSha256: status.license.termsSha256,
        };
      }
    }
    const errorCode = status?.errorCode ?? agentErrorCode;
    if (errorCode) {
      message.errorCode = errorCode;
    }
    return message;
  }

  async onModuleDestroy(): Promise<void> {
    this.wanted = new Map();
    await this.queue;
    // Stop the uploaders but leave the plugin's streams alone: an agent restart
    // (update, reboot of the container) must not interrupt a running picture.
    await Promise.all([...this.applied.values()].map((entry) => entry.upload.stop()));
    this.applied.clear();
  }

  private resync(): void {
    void this.enqueue();
  }

  private enqueue(): Promise<void> {
    this.queue = this.queue
      .then(() => this.apply())
      .catch((error: unknown) => {
        this.logger.error(`NDI reconcile failed: ${describe(error)}`);
      });
    return this.queue;
  }

  private async apply(): Promise<void> {
    this.applying = true;
    try {
      await this.applyOnce();
    } finally {
      this.applying = false;
    }
  }

  private async applyOnce(): Promise<void> {
    const snapshot = this.plugin.snapshot();
    if (snapshot.state === 'unknown') {
      return;
    }
    if (snapshot.state !== 'ready') {
      // The plugin cannot run anything (or is gone): what it ran is stopped.
      await this.stopUploads([...this.applied.keys()]);
      return;
    }

    const listed = new Set(snapshot.streams.map((stream) => stream.streamId));
    let changed = false;

    for (const streamId of new Set([...listed, ...this.applied.keys()])) {
      if (!this.wanted.has(streamId)) {
        changed = (await this.remove(streamId)) || changed;
      }
    }
    for (const [streamId, config] of this.wanted) {
      changed = (await this.ensure(streamId, config, listed.has(streamId))) || changed;
    }
    if (changed) {
      // Show the new state at once instead of at the next scheduled poll.
      await this.plugin.poll();
    }
  }

  /** Stops a stream the server no longer wants, or one the plugin runs without our knowledge. */
  private async remove(streamId: string): Promise<boolean> {
    await this.stopUploads([streamId]);
    try {
      await this.plugin.deleteStream(streamId);
      this.failing.delete(`stop:${streamId}`);
      this.logger.log(`Stopped NDI stream ${streamId}`);
      return true;
    } catch (error) {
      this.logFailure(`stop:${streamId}`, `did not stop NDI stream ${streamId}`, error);
      return false;
    }
  }

  /** Makes the plugin run `config`; true when a call was made. */
  private async ensure(
    streamId: string,
    config: AgentNdiStreamConfig,
    listed: boolean,
  ): Promise<boolean> {
    const current = this.applied.get(streamId);
    if (current && listed && !configChanged(current.config, config)) {
      this.applied.set(streamId, { ...current, config });
      return false;
    }
    // Not listed although applied: the plugin restarted, or the list is a poll
    // behind. Asking again covers both, the plugin leaves an identical stream alone.
    if (current && configChanged(current.config, config)) {
      await this.stopUploads([streamId]);
    }
    try {
      await this.plugin.putStream(streamId, config);
    } catch (error) {
      this.logFailure(`start:${streamId}`, `did not start NDI stream ${streamId}`, error);
      return false;
    }
    this.failing.delete(`start:${streamId}`);
    const upload = this.applied.get(streamId)?.upload ?? this.startUpload(streamId);
    this.applied.set(streamId, { config, upload });
    if (!current) {
      this.logger.log(`Started NDI stream ${streamId}`);
    }
    // Re-asserting an unchanged stream the list did not show leaves the plugin as it was.
    return !current || configChanged(current.config, config);
  }

  private startUpload(streamId: string): HlsUploadHandle {
    return this.uploader.start(streamId, join(this.options.hlsDir, streamId.toLowerCase()));
  }

  private async stopUploads(streamIds: readonly string[]): Promise<void> {
    for (const streamId of streamIds) {
      const entry = this.applied.get(streamId);
      if (entry) {
        this.applied.delete(streamId);
        await entry.upload.stop();
      }
    }
  }

  /** Logs the first failure of an operation, then stays quiet until it succeeds again. */
  private logFailure(key: string, what: string, error: unknown): void {
    if (this.failing.has(key)) {
      return;
    }
    this.failing.add(key);
    this.logger.warn(`The capture plugin ${what}: ${describe(error)}`);
  }

  private validStreams(
    streams: readonly AgentNdiStreamConfig[],
  ): Map<string, AgentNdiStreamConfig> {
    const valid = new Map<string, AgentNdiStreamConfig>();
    for (const stream of streams) {
      if (isStreamId(stream.streamId)) {
        valid.set(stream.streamId, stream);
      } else {
        this.logger.warn('Ignoring an NDI stream with an invalid id');
      }
    }
    return valid;
  }

  private notifyIfChanged(): void {
    const signature = JSON.stringify([
      this.plugin.snapshot().state,
      this.status().map((entry) => [entry.streamId, entry.state, entry.error]),
    ]);
    if (signature === this.lastSignature) {
      return;
    }
    this.lastSignature = signature;
    this.listeners.forEach((listener) => listener());
  }
}
