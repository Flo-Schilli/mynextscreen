import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { spawn, execFile, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { LiveStream } from '../db/schema';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { TranscodingPreset } from './transcoding-preset.enum';

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

@Injectable()
export class FfmpegLiveService implements OnModuleInit {
  private readonly logger = new Logger(FfmpegLiveService.name);
  private readonly processes = new Map<string, ChildProcess>();
  private readonly stoppedIds = new Set<string>();
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;
  private readonly hlsOutputDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = this.configService.get<string>('FFPROBE_PATH', 'ffprobe');
    this.hlsOutputDir = this.configService.get<string>('HLS_OUTPUT_DIR', '/tmp/signage-hls');
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

  async start(stream: LiveStream): Promise<void> {
    if (this.processes.has(stream.id)) {
      return; // already running — idempotent
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

  async stop(streamId: string): Promise<void> {
    const proc = this.processes.get(streamId);
    if (proc) {
      this.stoppedIds.add(streamId);
      proc.kill('SIGTERM');
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

  isRunning(streamId: string): boolean {
    return this.processes.has(streamId);
  }

  getHlsOutputDir(streamId: string): string {
    return path.join(this.hlsOutputDir, streamId);
  }

  async probeSourceStream(sourceUrl: string, protocol: LiveStreamProtocol): Promise<ProbeResult> {
    const args: string[] = [];

    if (protocol === LiveStreamProtocol.Rtp) {
      args.push('-protocol_whitelist', 'file,rtp,udp');
    }

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
    const args: string[] = [];

    if (stream.protocol === LiveStreamProtocol.Rtp) {
      args.push('-protocol_whitelist', 'file,rtp,udp');
    }

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
