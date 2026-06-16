import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject, finalize, map, merge, interval, takeUntil } from 'rxjs';
import { randomUUID } from 'crypto';
import {
  TRANSCODING_COMPLETED,
  TRANSCODING_FAILED,
  TRANSCODING_PROGRESS,
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
  TranscodingProgressEvent,
} from '../content/transcoding.event';
import { SCREEN_STATUS_CHANGED, ScreenStatusEvent } from '../screen/screen-status.event';
import { SCHEDULE_ENTRY_CHANGED, ScheduleEntryChangedEvent } from '../schedule/schedule.event';
import {
  LIVE_STREAM_HEALTH_CHANGED,
  LiveStreamHealthChangedEvent,
} from '../live-stream/stream-health.event';
import {
  SLICE_PROGRESS,
  SLICE_COMPLETED,
  SLICE_FAILED,
  SliceProgressEvent,
  SliceCompletedEvent,
  SliceFailedEvent,
} from '../slice-content/slice-content.event';

export interface DashboardEventPayload {
  type: string;
  data: unknown;
  timestamp: string;
}

interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

interface DashboardConnection {
  organisationId: string;
  userId: string;
  events: Subject<DashboardEventPayload>;
  close: Subject<void>;
}

@Injectable()
export class DashboardSseService implements OnModuleDestroy {
  private readonly logger = new Logger(DashboardSseService.name);
  private readonly connections = new Map<string, DashboardConnection>();

  onModuleDestroy(): void {
    for (const [id, conn] of this.connections) {
      conn.close.next();
      conn.close.complete();
      conn.events.complete();
      this.connections.delete(id);
    }
  }

  subscribe(organisationId: string, userId: string): Observable<MessageEvent> {
    const connectionId = randomUUID();
    const events = new Subject<DashboardEventPayload>();
    const close = new Subject<void>();

    this.connections.set(connectionId, {
      organisationId,
      userId,
      events,
      close,
    });

    this.logger.log(
      `SSE connection ${connectionId} opened for org ${organisationId}, user ${userId}`,
    );

    const keepalive$ = interval(30_000).pipe(
      takeUntil(close),
      map(
        (): MessageEvent => ({
          data: '',
          type: 'keepalive',
        }),
      ),
    );

    const events$ = events.pipe(
      map(
        (payload): MessageEvent => ({
          data: payload,
          type: 'state-change',
        }),
      ),
    );

    return merge(events$, keepalive$).pipe(
      finalize(() => {
        const current = this.connections.get(connectionId);
        if (current && current.events === events) {
          this.connections.delete(connectionId);
          this.logger.log(`SSE connection ${connectionId} closed`);
        }
      }),
    );
  }

  pushToOrg(organisationId: string, event: DashboardEventPayload): void {
    for (const conn of this.connections.values()) {
      if (conn.organisationId === organisationId) {
        conn.events.next(event);
      }
    }
  }

  pushToUser(userId: string, event: DashboardEventPayload): void {
    for (const conn of this.connections.values()) {
      if (conn.userId === userId) {
        conn.events.next(event);
      }
    }
  }

  emitToUser(userId: string, type: string, data: unknown): void {
    const payload: DashboardEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.pushToUser(userId, payload);
  }

  private emitToOrg(organisationId: string, type: string, data: unknown): void {
    const payload: DashboardEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.pushToOrg(organisationId, payload);
  }

  @OnEvent(SCREEN_STATUS_CHANGED)
  handleScreenStatusChanged(event: ScreenStatusEvent): void {
    const type = event.isOnline ? 'screen.online' : 'screen.offline';
    this.emitToOrg(event.organisationId, type, {
      screenId: event.screenId,
    });
  }

  @OnEvent(TRANSCODING_PROGRESS)
  handleTranscodingProgress(event: TranscodingProgressEvent): void {
    this.emitToOrg(event.organisationId, 'transcoding.progress', {
      contentId: event.contentId,
      progress: event.progress,
    });
  }

  @OnEvent(TRANSCODING_COMPLETED)
  handleTranscodingCompleted(event: TranscodingCompletedEvent): void {
    this.emitToOrg(event.organisationId, 'transcoding.complete', {
      contentId: event.contentId,
      transcodedSizeBytes: event.transcodedSizeBytes,
    });
  }

  @OnEvent(TRANSCODING_FAILED)
  handleTranscodingFailed(event: TranscodingFailedEvent): void {
    this.emitToOrg(event.organisationId, 'transcoding.failed', {
      contentId: event.contentId,
      error: event.error,
    });
  }

  @OnEvent(SLICE_PROGRESS)
  handleSliceProgress(event: SliceProgressEvent): void {
    this.emitToOrg(event.organisationId, 'slice.progress', {
      groupId: event.groupId,
      playlistId: event.playlistId,
      totalItems: event.totalItems,
      completedItems: event.completedItems,
    });
  }

  @OnEvent(SLICE_COMPLETED)
  handleSliceCompleted(event: SliceCompletedEvent): void {
    this.emitToOrg(event.organisationId, 'slice.complete', {
      groupId: event.groupId,
      playlistId: event.playlistId,
      totalItems: event.totalItems,
    });
  }

  @OnEvent(SLICE_FAILED)
  handleSliceFailed(event: SliceFailedEvent): void {
    this.emitToOrg(event.organisationId, 'slice.failed', {
      groupId: event.groupId,
      playlistId: event.playlistId,
      error: event.error,
    });
  }

  @OnEvent(SCHEDULE_ENTRY_CHANGED)
  handleScheduleChanged(event: ScheduleEntryChangedEvent): void {
    this.emitToOrg(event.organisationId, 'schedule.updated', {
      screenId: event.screenId,
    });
  }

  @OnEvent(LIVE_STREAM_HEALTH_CHANGED)
  handleLiveStreamHealthChanged(event: LiveStreamHealthChangedEvent): void {
    this.emitToOrg(event.organisationId, 'live-stream-health', {
      streamId: event.streamId,
      streamName: event.streamName,
      health: event.health,
      checkedAt: event.checkedAt,
    });
  }
}
