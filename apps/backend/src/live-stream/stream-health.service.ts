import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { liveStreams } from '../db/schema';
import { LiveStreamStatus } from './live-stream-status.enum';
import { FfmpegLiveService } from './ffmpeg-live.service';
import {
  LIVE_STREAM_HEALTH_CHANGED,
  LiveStreamHealthChangedEvent,
  StreamHealthStatus,
} from './stream-health.event';
import { LiveStreamProcessExitedEvent } from './ffmpeg-live.service';

export interface StreamHealthState {
  streamId: string;
  status: LiveStreamStatus;
  health: StreamHealthStatus;
  checkedAt: string;
}

@Injectable()
export class StreamHealthService implements OnModuleDestroy {
  private readonly logger = new Logger(StreamHealthService.name);
  private readonly healthStates = new Map<string, StreamHealthState>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  private static readonly CHECK_INTERVAL_MS = 10_000;
  private static readonly STALE_SEGMENT_THRESHOLD_MS = 15_000;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ffmpegLiveService: FfmpegLiveService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.intervalHandle = setInterval(
      () => void this.runHealthChecks(),
      StreamHealthService.CHECK_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  getHealth(streamId: string): StreamHealthState | undefined {
    return this.healthStates.get(streamId);
  }

  getAllHealthStates(): Map<string, StreamHealthState> {
    return this.healthStates;
  }

  async runHealthChecks(): Promise<void> {
    const activeStreams = await this.db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.status, LiveStreamStatus.Active));

    for (const stream of activeStreams) {
      const health = this.checkStreamHealth(stream.id);
      const checkedAt = new Date().toISOString();

      const state: StreamHealthState = {
        streamId: stream.id,
        status: stream.status,
        health,
        checkedAt,
      };

      const previous = this.healthStates.get(stream.id);
      this.healthStates.set(stream.id, state);

      if (health === 'degraded' || health === 'stopped') {
        this.eventEmitter.emit(
          LIVE_STREAM_HEALTH_CHANGED,
          new LiveStreamHealthChangedEvent(
            stream.id,
            stream.name,
            stream.organisationId,
            health,
            checkedAt,
          ),
        );
      }

      // If stopped and wasn't already handled, trigger unplanned exit flow
      if (health === 'stopped' && previous?.health !== 'stopped') {
        this.logger.warn(
          `Stream ${stream.id} detected as stopped by health check — triggering fallback`,
        );
        this.eventEmitter.emit(
          'live-stream.process-exited',
          new LiveStreamProcessExitedEvent(stream.id, null),
        );
      }
    }

    // Clean up health states for streams that are no longer active
    for (const streamId of this.healthStates.keys()) {
      if (!activeStreams.some((s) => s.id === streamId)) {
        this.healthStates.delete(streamId);
      }
    }
  }

  private checkStreamHealth(streamId: string): StreamHealthStatus {
    const isRunning = this.ffmpegLiveService.isRunning(streamId);

    if (!isRunning) {
      return 'stopped';
    }

    const hlsDir = this.ffmpegLiveService.getHlsOutputDir(streamId);
    const hasRecentSegments = this.hasRecentSegments(hlsDir);

    if (!hasRecentSegments) {
      return 'degraded';
    }

    return 'healthy';
  }

  private hasRecentSegments(hlsDir: string): boolean {
    try {
      if (!fs.existsSync(hlsDir)) {
        return false;
      }

      const files = fs.readdirSync(hlsDir);
      const now = Date.now();

      for (const file of files) {
        if (file.endsWith('.ts')) {
          const filePath = path.join(hlsDir, file);
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs < StreamHealthService.STALE_SEGMENT_THRESHOLD_MS) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
