import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
  ScreenEvent,
  ScreenEventType,
} from '../screen-protocol';
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
    };

    // Playlists, schedules, and live streams are not yet implemented.
    // Return empty/null placeholders — future modules will populate these.
    return new ScreenState(screenInfo, null, [], null, null);
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
