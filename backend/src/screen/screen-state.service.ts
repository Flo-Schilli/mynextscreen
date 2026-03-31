import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Observable,
  Subject,
  finalize,
  map,
  merge,
  interval,
  takeUntil,
} from 'rxjs';
import { ScreenService } from './screen.service';
import {
  SCREEN_PROTOCOL_ADAPTER,
  ScreenProtocolAdapter,
  ScreenState,
  ScreenInfo,
  GroupInfo,
  ScreenEvent,
  ScreenEventType,
  Playlist as ProtocolPlaylist,
  LiveStream as ProtocolLiveStream,
} from '../screen-protocol';
import { Playlist } from '../playlist/playlist.entity';
import {
  SCHEDULE_CHANGED,
  PLAYLIST_CHANGED,
  CONTENT_CHANGED,
  LIVE_STREAM_STARTED,
  LIVE_STREAM_STOPPED,
  ScreenStateChangeEvent,
} from './screen-state.event';
import {
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntryChangedEvent,
  ScheduleService,
} from '../schedule';
import { LiveStreamActivation } from '../live-stream/live-stream-activation.entity';
import { LiveStreamStatus } from '../live-stream/live-stream-status.enum';
import { ScreenGroup } from '../screen-group/screen-group.entity';

interface MessageEvent {
  data: unknown;
  type?: string;
  id?: string;
  retry?: number;
}

@Injectable()
export class ScreenStateService implements OnModuleDestroy {
  private readonly logger = new Logger(ScreenStateService.name);
  private readonly connections = new Map<
    string,
    { events: Subject<ScreenEvent>; close: Subject<void> }
  >();

  constructor(
    private readonly screenService: ScreenService,
    @Inject(SCREEN_PROTOCOL_ADAPTER)
    private readonly protocolAdapter: ScreenProtocolAdapter,
    private readonly scheduleService: ScheduleService,
    @InjectRepository(ScreenGroup)
    private readonly screenGroupRepository: Repository<ScreenGroup>,
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(LiveStreamActivation)
    private readonly activationRepository: Repository<LiveStreamActivation>,
  ) {}

  onModuleDestroy(): void {
    for (const [screenId, { events, close }] of this.connections) {
      close.next();
      close.complete();
      events.complete();
      this.connections.delete(screenId);
    }
  }

  async assembleState(
    organisationId: string,
    screenId: string,
  ): Promise<ScreenState> {
    const screen = await this.screenService.findOne(organisationId, screenId);

    const screenInfo: ScreenInfo = {
      id: screen.id,
      name: screen.name,
      organisationId: screen.organisationId,
      resolution: screen.resolution,
      location: screen.location,
      groupId: screen.groupId,
      gridRow: screen.gridRow,
      gridColumn: screen.gridColumn,
    };

    let groupInfo: GroupInfo | null = null;
    if (screen.groupId) {
      const group = await this.screenGroupRepository.findOne({
        where: { id: screen.groupId },
      });
      if (group) {
        groupInfo = {
          id: group.id,
          name: group.name,
          mode: group.mode,
          gridRows: group.gridRows,
          gridColumns: group.gridColumns,
        };
      }
    }

    let currentPlaylist: ProtocolPlaylist | null = null;
    let fallbackPlaylist: ProtocolPlaylist | null = null;

    try {
      const result = await this.scheduleService.getCurrentPlaylist(screenId);
      if (result.playlist) {
        const full = await this.loadPlaylistWithItems(result.playlist.id);
        const mapped = full ? this.mapPlaylist(full) : null;
        if (result.isDefault) {
          fallbackPlaylist = mapped;
        } else {
          currentPlaylist = mapped;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve playlist for screen ${screenId}: ${error}`,
      );
    }

    let activeLiveStream: ProtocolLiveStream | null = null;
    try {
      const activation = await this.activationRepository.findOne({
        where: { screenId },
        relations: ['stream'],
      });
      if (activation?.stream?.status === LiveStreamStatus.Active) {
        activeLiveStream = {
          id: activation.stream.id,
          streamUrl: `/api/live-streams/${activation.stream.id}/hls/index.m3u8`,
          startedAt: activation.activatedAt.toISOString(),
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve live stream for screen ${screenId}: ${error}`,
      );
    }

    return new ScreenState(
      screenInfo,
      currentPlaylist,
      [],
      activeLiveStream,
      fallbackPlaylist,
      groupInfo,
    );
  }

  private async loadPlaylistWithItems(
    playlistId: string,
  ): Promise<Playlist | null> {
    return this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['items', 'items.content'],
      order: { items: { position: 'ASC' } },
    });
  }

  private mapPlaylist(entity: Playlist): ProtocolPlaylist {
    return {
      id: entity.id,
      name: entity.name,
      items: (entity.items ?? []).map((item) => {
        const isVideo = item.content?.type === 'video';
        const duration =
          isVideo && item.content?.durationSeconds != null
            ? item.content.durationSeconds
            : item.durationSeconds;
        return {
          contentId: item.contentId,
          contentUrl: '',
          duration,
          type: item.content?.type ?? 'unknown',
          order: item.position,
          transition: item.transition,
          transitionDurationMs: item.transitionDurationMs,
        };
      }),
    };
  }

  async getRenderedState(
    organisationId: string,
    screenId: string,
  ): Promise<unknown> {
    const state = await this.assembleState(organisationId, screenId);
    return this.protocolAdapter.renderState(state);
  }

  subscribe(screenId: string): Observable<MessageEvent> {
    let conn = this.connections.get(screenId);
    if (!conn) {
      conn = { events: new Subject<ScreenEvent>(), close: new Subject<void>() };
      this.connections.set(screenId, conn);
    }

    const { events, close } = conn;

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
        (event): MessageEvent => ({
          data: this.protocolAdapter.renderEvent(event),
          type: 'state-change',
        }),
      ),
    );

    return merge(events$, keepalive$).pipe(
      finalize(() => {
        const current = this.connections.get(screenId);
        if (current && current.events === events && !events.observed) {
          this.connections.delete(screenId);
          this.logger.log(`SSE connection closed for screen ${screenId}`);
        }
      }),
    );
  }

  pushEvent(screenId: string, event: ScreenEvent): void {
    const conn = this.connections.get(screenId);
    if (conn) {
      conn.events.next(event);
    }
  }

  @OnEvent(SCHEDULE_ENTRY_CHANGED)
  async handleScheduleEntryChanged(
    event: ScheduleEntryChangedEvent,
  ): Promise<void> {
    const conn = this.connections.get(event.screenId);
    if (!conn) return;

    let currentPlaylist: { id: string; name: string } | null = null;
    let isDefault = true;

    try {
      const result = await this.scheduleService.getCurrentPlaylist(
        event.screenId,
      );
      isDefault = result.isDefault;
      currentPlaylist = result.playlist
        ? { id: result.playlist.id, name: result.playlist.name }
        : null;
    } catch (error) {
      this.logger.warn(
        `Failed to resolve current playlist for screen ${event.screenId}: ${error}`,
      );
    }

    this.pushEvent(
      event.screenId,
      new ScreenEvent(ScreenEventType.ScheduleUpdate, {
        screenId: event.screenId,
        organisationId: event.organisationId,
        currentPlaylist,
        isDefault,
      }),
    );
  }

  @OnEvent(SCHEDULE_CHANGED)
  handleScheduleChanged(event: ScreenStateChangeEvent): void {
    this.pushEvent(
      event.screenId,
      new ScreenEvent(ScreenEventType.ScheduleUpdate, {
        screenId: event.screenId,
        organisationId: event.organisationId,
      }),
    );
  }

  @OnEvent(PLAYLIST_CHANGED)
  handlePlaylistChanged(event: ScreenStateChangeEvent): void {
    this.pushEvent(
      event.screenId,
      new ScreenEvent(ScreenEventType.PlaylistUpdate, {
        screenId: event.screenId,
        organisationId: event.organisationId,
      }),
    );
  }

  @OnEvent(CONTENT_CHANGED)
  handleContentChanged(event: ScreenStateChangeEvent): void {
    this.pushEvent(
      event.screenId,
      new ScreenEvent(ScreenEventType.ContentUpdate, {
        screenId: event.screenId,
        organisationId: event.organisationId,
      }),
    );
  }

  @OnEvent(LIVE_STREAM_STARTED)
  handleLiveStreamStarted(event: ScreenStateChangeEvent): void {
    this.pushEvent(
      event.screenId,
      new ScreenEvent(ScreenEventType.LiveStreamStart, {
        screenId: event.screenId,
        organisationId: event.organisationId,
      }),
    );
  }

  @OnEvent(LIVE_STREAM_STOPPED)
  handleLiveStreamStopped(event: ScreenStateChangeEvent): void {
    this.pushEvent(
      event.screenId,
      new ScreenEvent(ScreenEventType.LiveStreamStop, {
        screenId: event.screenId,
        organisationId: event.organisationId,
      }),
    );
  }
}
