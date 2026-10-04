import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { spawn, execFile, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { LiveStream } from '../db/schema';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { TranscodingPreset } from './transcoding-preset.enum';
import { getNumberConfig } from '../config/numeric-config.util';

const execFileAsync = promisify(execFile);

export interface ProbeResult {
  videoCodec: string;
  pixelFormat: string;
  audioCodec: string;
}

export interface PassthroughCompatibility {
  compatible: boolean;
  warnings: string[];
}

interface PresetConfig {
  scale: string;
  videoBitrate: string;
  maxrate: string;
  bufsize: string;
}

export const PRESET_MAP: Record<
  Exclude<TranscodingPreset, TranscodingPreset.Passthrough>,
  PresetConfig
> = {
  [TranscodingPreset.Low480p]: {
    scale: '854:-2',
    videoBitrate: '1000k',
    maxrate: '1200k',
    bufsize: '2400k',
  },
  [TranscodingPreset.Medium720p]: {
    scale: '1280:-2',
    videoBitrate: '2000k',
    maxrate: '2400k',
    bufsize: '4800k',
  },
  [TranscodingPreset.High1080p]: {
    scale: '1920:-2',
    videoBitrate: '2500k',
    maxrate: '3000k',
    bufsize: '6000k',
  },
  [TranscodingPreset.FullHdPlus1440p]: {
    scale: '2560:-2',
    videoBitrate: '5000k',
    maxrate: '6000k',
    bufsize: '12000k',
  },
};

export const LIVE_STREAM_PROCESS_EXITED = 'live-stream.process-exited';

export class LiveStreamProcessExitedEvent {
  constructor(
    public readonly streamId: string,
    public readonly exitCode: number | null,
  ) {}
}

/** Grace period before escalating SIGTERM to SIGKILL, and before giving up. */
const SIGTERM_GRACE_MS = 5_000;
const SIGKILL_GRACE_MS = 2_000;

/**
 * Cap on concurrently running encoders. Each libx264 process can saturate a
 * core, so without a cap a handful of streams takes the host down — and any
 * org admin can start one.
 */
const DEFAULT_MAX_CONCURRENT_STREAMS = 4;

/** FFmpeg wants microseconds: 30s without data on the input aborts the run. */
const INPUT_RW_TIMEOUT_US = 30_000_000;

/**
 * Explicit protocol allow-list per source protocol. Without it the demuxer's
 * defaults decide what a remote playlist may pull in — an attacker-hosted
 * .m3u8 can reference secondary URIs, and whether that turns into a local file
 * read depends on the FFmpeg build, which is not pinned here. `file` is
 * deliberately absent from the RTP list: an SDP source has no use for it.
 */
function protocolWhitelistFor(sourceUrl: string, protocol: LiveStreamProtocol): string {
  if (protocol === LiveStreamProtocol.Rtp) {
    return 'rtp,udp';
  }
  const scheme = sourceUrl.split(':', 1)[0].toLowerCase();
  switch (scheme) {
    case 'rtsp':
      return 'rtsp,rtp,udp,tcp';
    case 'http':
    case 'https':
      return 'http,https,tcp,tls,crypto';
    default:
      return 'rtmp,tcp';
  }
}

@Injectable()
export class FfmpegLiveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FfmpegLiveService.name);
  private readonly processes = new Map<string, ChildProcess>();
  private readonly stoppedIds = new Set<string>();
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;
  private readonly hlsOutputDir: string;
  private readonly maxConcurrentStreams: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = this.configService.get<string>('FFPROBE_PATH', 'ffprobe');
    this.hlsOutputDir = this.configService.get<string>('HLS_OUTPUT_DIR', '/tmp/mynextscreen-hls');
    this.maxConcurrentStreams = getNumberConfig(
      this.configService,
      'MAX_CONCURRENT_LIVE_STREAMS',
      DEFAULT_MAX_CONCURRENT_STREAMS,
    );
  }

  onModuleInit(): void {
    try {
      const proc = spawn(this.ffmpegPath, ['-version'], {
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      proc.on('error', () => {
        this.logger.warn(
          `FFmpeg binary not found at '${this.ffmpegPath}'. Live streaming will not work until FFmpeg is installed.`,
        );
      });
      proc.on('close', () => {
        /* noop — binary exists */
      });
    } catch {
      this.logger.warn(
        `FFmpeg binary not found at '${this.ffmpegPath}'. Live streaming will not work until FFmpeg is installed.`,
      );
    }
  }

  /**
   * Node does not kill child processes on exit, so every running FFmpeg would
   * outlive an API restart as an orphan while the database still reported the
   * stream as active. StreamHealthService already does this; this service did
   * not.
   */
  async onModuleDestroy(): Promise<void> {
    const running = [...this.processes.keys()];
    if (running.length === 0) {
      return;
    }
    this.logger.log(`Shutting down: terminating ${running.length} FFmpeg process(es)`);
    await Promise.all(running.map((streamId) => this.stop(streamId)));
  }

  async start(stream: LiveStream): Promise<void> {
    if (this.processes.has(stream.id)) {
      return; // already running — idempotent
    }

    if (this.processes.size >= this.maxConcurrentStreams) {
      throw new ServiceUnavailableException(
        `Too many live streams running (limit ${this.maxConcurrentStreams}). Stop one and try again.`,
      );
    }

    const outputDir = path.join(this.hlsOutputDir, stream.id);
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'index.m3u8');
    const args = this.buildArgs(stream, outputPath);

    const proc = spawn(this.ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    proc.stderr!.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        if (message.toLowerCase().includes('error') || message.toLowerCase().includes('fatal')) {
          this.logger.error(`[stream:${stream.id}] ${message}`);
        } else {
          this.logger.log(`[stream:${stream.id}] ${message}`);
        }
      }
    });

    proc.on('error', (err) => {
      this.logger.error(`[stream:${stream.id}] Failed to spawn FFmpeg: ${err.message}`);
      this.processes.delete(stream.id);
    });

    proc.on('close', (code) => {
      this.processes.delete(stream.id);

      if (this.stoppedIds.has(stream.id)) {
        // Explicit stop — not an unplanned exit
        this.stoppedIds.delete(stream.id);
        return;
      }

      // Unplanned exit
      this.logger.warn(`[stream:${stream.id}] FFmpeg exited unexpectedly with code ${code}`);
      this.eventEmitter.emit(
        LIVE_STREAM_PROCESS_EXITED,
        new LiveStreamProcessExitedEvent(stream.id, code),
      );
    });

    this.processes.set(stream.id, proc);
  }

  /**
   * SIGTERM, then SIGKILL if the process ignores it, and only then remove the
   * output directory — the previous version dropped the map entry immediately
   * and deleted the directory while FFmpeg might still be writing to it, so a
   * hung process became an untracked leak that `isRunning()` reported as gone.
   */
  async stop(streamId: string): Promise<void> {
    const proc = this.processes.get(streamId);
    if (proc) {
      this.stoppedIds.add(streamId);
      proc.kill('SIGTERM');
      await this.waitForExit(proc, streamId);
      this.processes.delete(streamId);
    }

    // Clean up HLS output directory
    const outputDir = path.join(this.hlsOutputDir, streamId);
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup — directory may not exist
    }
  }

  /** Resolves once the process is gone, escalating to SIGKILL after a grace period. */
  private waitForExit(proc: ChildProcess, streamId: string): Promise<void> {
    // `?? null` on purpose: an unknown state counts as "still running", so the
    // caller waits rather than deleting the directory under a live process.
    if ((proc.exitCode ?? null) !== null || (proc.signalCode ?? null) !== null) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const kill = setTimeout(() => {
        this.logger.warn(`[stream:${streamId}] FFmpeg ignored SIGTERM — sending SIGKILL`);
        proc.kill('SIGKILL');
      }, SIGTERM_GRACE_MS);
      const giveUp = setTimeout(() => {
        this.logger.error(`[stream:${streamId}] FFmpeg did not exit after SIGKILL`);
        cleanup();
        resolve();
      }, SIGTERM_GRACE_MS + SIGKILL_GRACE_MS);

      const cleanup = (): void => {
        clearTimeout(kill);
        clearTimeout(giveUp);
      };

      proc.once('exit', () => {
        cleanup();
        resolve();
      });
    });
  }

  isRunning(streamId: string): boolean {
    return this.processes.has(streamId);
  }

  /** Number of FFmpeg live processes currently tracked. Read by observability. */
  activeStreamCount(): number {
    return this.processes.size;
  }

  getHlsOutputDir(streamId: string): string {
    return path.join(this.hlsOutputDir, streamId);
  }

  async probeSourceStream(sourceUrl: string, protocol: LiveStreamProtocol): Promise<ProbeResult> {
    const args: string[] = ['-protocol_whitelist', protocolWhitelistFor(sourceUrl, protocol)];

    args.push('-v', 'quiet', '-print_format', 'json', '-show_streams', sourceUrl);

    const { stdout } = await execFileAsync(this.ffprobePath, args, {
      timeout: 5000,
    });

    const data = JSON.parse(stdout);
    const streams: Array<{
      codec_type?: string;
      codec_name?: string;
      pix_fmt?: string;
    }> = data.streams ?? [];

    const videoStream = streams.find((s) => s.codec_type === 'video');
    const audioStream = streams.find((s) => s.codec_type === 'audio');

    return {
      videoCodec: videoStream?.codec_name ?? 'unknown',
      pixelFormat: videoStream?.pix_fmt ?? 'unknown',
      audioCodec: audioStream?.codec_name ?? 'none',
    };
  }

  checkPassthroughCompatibility(probeResult: ProbeResult): PassthroughCompatibility {
    const warnings: string[] = [];

    if (probeResult.videoCodec !== 'h264') {
      warnings.push(
        `Video codec "${probeResult.videoCodec}" is not H.264 — browsers may not play this stream.`,
      );
    }

    if (probeResult.pixelFormat.includes('10le') || probeResult.pixelFormat.includes('10be')) {
      warnings.push(
        `Pixel format "${probeResult.pixelFormat}" is 10-bit — most browsers only support 8-bit H.264.`,
      );
    }

    if (probeResult.audioCodec !== 'aac' && probeResult.audioCodec !== 'none') {
      warnings.push(
        `Audio codec "${probeResult.audioCodec}" is not AAC — browsers may not play the audio track.`,
      );
    }

    return {
      compatible: warnings.length === 0,
      warnings,
    };
  }

  buildArgs(stream: LiveStream, outputPath: string): string[] {
    const args: string[] = [
      '-protocol_whitelist',
      protocolWhitelistFor(stream.sourceUrl, stream.protocol),
    ];

    // A source that accepts the connection and then goes quiet would otherwise
    // hold an encoder forever.
    args.push('-rw_timeout', String(INPUT_RW_TIMEOUT_US));

    args.push('-i', stream.sourceUrl);

    const preset = stream.transcodingPreset ?? TranscodingPreset.High1080p;

    if (preset === TranscodingPreset.Passthrough) {
      args.push('-c:v', 'copy');
    } else {
      const config = PRESET_MAP[preset];
      args.push(
        '-vf',
        `scale=${config.scale},format=yuv420p`,
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'zerolatency',
        '-b:v',
        config.videoBitrate,
        '-maxrate',
        config.maxrate,
        '-bufsize',
        config.bufsize,
        '-g',
        '60',
      );
    }

    const audioEnabled = stream.audioEnabled ?? true;
    if (audioEnabled) {
      args.push('-c:a', 'aac', '-b:a', '128k');
    } else {
      args.push('-an');
    }

    args.push(
      '-f',
      'hls',
      '-hls_time',
      '2',
      '-hls_list_size',
      '5',
      '-hls_flags',
      'delete_segments+append_list',
      outputPath,
    );

    return args;
  }
}
