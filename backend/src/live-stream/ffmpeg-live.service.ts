import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';

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
  private readonly hlsOutputDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.hlsOutputDir = this.configService.get<string>(
      'HLS_OUTPUT_DIR',
      '/tmp/signage-hls',
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
        if (process.env.NODE_ENV === 'production') {
          // In production, only log error-level lines
          if (
            message.toLowerCase().includes('error') ||
            message.toLowerCase().includes('fatal')
          ) {
            this.logger.error(`[stream:${stream.id}] ${message}`);
          }
        } else {
          this.logger.verbose(`[stream:${stream.id}] ${message}`);
        }
      }
    });

    proc.on('error', (err) => {
      this.logger.error(
        `[stream:${stream.id}] Failed to spawn FFmpeg: ${err.message}`,
      );
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
      this.logger.warn(
        `[stream:${stream.id}] FFmpeg exited unexpectedly with code ${code}`,
      );
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

  buildArgs(stream: LiveStream, outputPath: string): string[] {
    const args: string[] = [];

    if (stream.protocol === LiveStreamProtocol.Rtp) {
      args.push('-protocol_whitelist', 'file,rtp,udp');
    }

    args.push(
      '-i',
      stream.sourceUrl,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-c:a',
      'aac',
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
