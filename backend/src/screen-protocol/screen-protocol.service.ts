import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScreenEvent } from './screen-event.model';
import { ScreenEventType } from './screen-event-type.enum';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { Screen } from '../screen/screen.entity';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';
import { ScreenStateService } from '../screen/screen-state.service';
import { GROUP_SCHEDULE_CHANGED, GroupScheduleChangedEvent } from '../schedule/schedule.event';
import {
  LIVE_STREAM_STARTED,
  LIVE_STREAM_STOPPED,
  ScreenStateChangeEvent,
} from '../screen/screen-state.event';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class ScreenProtocolService {
  private readonly logger = new Logger(ScreenProtocolService.name);

  constructor(
    @InjectRepository(ScreenGroup)
    private readonly screenGroupRepository: Repository<ScreenGroup>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    @InjectRepository(SlicedRendition)
    private readonly slicedRenditionRepository: Repository<SlicedRendition>,
    private readonly screenStateService: ScreenStateService,
    private readonly scheduleService: ScheduleService,
  ) {}

  @OnEvent(GROUP_SCHEDULE_CHANGED)
  async handleGroupScheduleChanged(event: GroupScheduleChangedEvent): Promise<void> {
    const group = await this.screenGroupRepository.findOne({
      where: { id: event.groupId, organisationId: event.organisationId },
      relations: ['screens'],
    });

    if (!group || !group.screens || group.screens.length === 0) {
      return;
    }

    const syncToken = Date.now().toString();

    // Resolve the current playlist for the group via the first screen
    // (all screens in the group share the same group schedule)
    let currentPlaylist: { id: string; name: string } | null = null;
    try {
      const result = await this.scheduleService.getCurrentPlaylist(group.screens[0].id);
      currentPlaylist = result.playlist
        ? { id: result.playlist.id, name: result.playlist.name }
        : null;
    } catch {
      this.logger.warn(`Failed to resolve playlist for group ${event.groupId}`);
    }

    if (group.mode === ScreenGroupMode.Mirror) {
      await this.fanOutMirror(group, currentPlaylist, syncToken, event.organisationId);
    } else {
      await this.fanOutSplit(group, currentPlaylist, syncToken, event.organisationId);
    }
  }

  @OnEvent(LIVE_STREAM_STARTED)
  async handleGroupLiveStreamStarted(event: ScreenStateChangeEvent): Promise<void> {
    // Check if this screen belongs to a group
    const screen = await this.screenRepository.findOne({
      where: { id: event.screenId },
    });

    if (!screen?.groupId) return;

    const group = await this.screenGroupRepository.findOne({
      where: { id: screen.groupId },
      relations: ['screens'],
    });

    if (!group || !group.screens || group.screens.length === 0) return;

    const syncToken = Date.now().toString();

    // Live streams always use mirror-mode fan-out regardless of group mode
    const payload: Record<string, unknown> = {
      type: 'live_stream',
      screenId: event.screenId,
      organisationId: event.organisationId,
      groupId: group.id,
      syncToken,
    };

    const events = group.screens.map((s) =>
      this.screenStateService.pushEvent(
        s.id,
        new ScreenEvent(ScreenEventType.LiveStreamStart, {
          ...payload,
          screenId: s.id,
        }),
      ),
    );

    await Promise.all(events.map((e) => Promise.resolve(e)));
  }

  @OnEvent(LIVE_STREAM_STOPPED)
  async handleGroupLiveStreamStopped(event: ScreenStateChangeEvent): Promise<void> {
    // Check if this screen belongs to a group
    const screen = await this.screenRepository.findOne({
      where: { id: event.screenId },
    });

    if (!screen?.groupId) return;

    const group = await this.screenGroupRepository.findOne({
      where: { id: screen.groupId },
      relations: ['screens'],
    });

    if (!group || !group.screens || group.screens.length === 0) return;

    const syncToken = Date.now().toString();

    const payload: Record<string, unknown> = {
      type: 'live_stream_stop',
      screenId: event.screenId,
      organisationId: event.organisationId,
      groupId: group.id,
      syncToken,
    };

    const events = group.screens.map((s) =>
      this.screenStateService.pushEvent(
        s.id,
        new ScreenEvent(ScreenEventType.LiveStreamStop, {
          ...payload,
          screenId: s.id,
        }),
      ),
    );

    await Promise.all(events.map((e) => Promise.resolve(e)));
  }

  async triggerGroupPlay(
    groupId: string,
    organisationId: string,
    contentUrl: string,
    contentItemId: string,
    contentType: 'video' | 'image',
    isLiveStream: boolean,
  ): Promise<void> {
    const group = await this.screenGroupRepository.findOne({
      where: { id: groupId, organisationId },
      relations: ['screens'],
    });

    if (!group || !group.screens || group.screens.length === 0) return;

    const syncToken = Date.now().toString();

    if (isLiveStream || group.mode === ScreenGroupMode.Mirror) {
      // Mirror mode or live stream: same contentUrl for all screens
      const pushes = group.screens.map((screen) =>
        Promise.resolve(
          this.screenStateService.pushEvent(
            screen.id,
            new ScreenEvent(ScreenEventType.GroupPlay, {
              contentUrl,
              contentItemId,
              contentType,
              groupId: group.id,
              syncToken,
              screenId: screen.id,
              organisationId,
            }),
          ),
        ),
      );
      await Promise.all(pushes);
    } else {
      // Split mode: each screen gets its own slice URL
      await this.fanOutSplitPlay(
        group,
        contentUrl,
        contentItemId,
        contentType,
        syncToken,
        organisationId,
      );
    }
  }

  private async fanOutMirror(
    group: ScreenGroup,
    currentPlaylist: { id: string; name: string } | null,
    syncToken: string,
    organisationId: string,
  ): Promise<void> {
    const pushes = group.screens.map((screen) =>
      Promise.resolve(
        this.screenStateService.pushEvent(
          screen.id,
          new ScreenEvent(ScreenEventType.ScheduleUpdate, {
            screenId: screen.id,
            organisationId,
            currentPlaylist,
            isDefault: false,
            groupId: group.id,
            syncToken,
          }),
        ),
      ),
    );
    await Promise.all(pushes);
  }

  private async fanOutSplit(
    group: ScreenGroup,
    currentPlaylist: { id: string; name: string } | null,
    syncToken: string,
    organisationId: string,
  ): Promise<void> {
    const pushes = group.screens.map((screen) =>
      Promise.resolve(
        this.screenStateService.pushEvent(
          screen.id,
          new ScreenEvent(ScreenEventType.ScheduleUpdate, {
            screenId: screen.id,
            organisationId,
            currentPlaylist,
            isDefault: false,
            groupId: group.id,
            syncToken,
          }),
        ),
      ),
    );
    await Promise.all(pushes);
  }

  private async fanOutSplitPlay(
    group: ScreenGroup,
    contentUrl: string,
    contentItemId: string,
    contentType: 'video' | 'image',
    syncToken: string,
    organisationId: string,
  ): Promise<void> {
    const pushes = group.screens.map(async (screen) => {
      const rendition = await this.slicedRenditionRepository.findOne({
        where: {
          groupId: group.id,
          screenId: screen.id,
          contentItemId,
        },
      });

      if (rendition) {
        this.screenStateService.pushEvent(
          screen.id,
          new ScreenEvent(ScreenEventType.GroupPlay, {
            contentUrl: `/api/media/slices/${group.id}/${screen.id}/${contentItemId}`,
            contentItemId,
            contentType,
            groupId: group.id,
            syncToken,
            screenId: screen.id,
            organisationId,
          }),
        );
      } else {
        // Rendition not yet available — send pending state
        this.screenStateService.pushEvent(
          screen.id,
          new ScreenEvent(ScreenEventType.Pending, {
            contentItemId,
            groupId: group.id,
            syncToken,
            screenId: screen.id,
            organisationId,
            reason: 'Sliced rendition not yet available',
          }),
        );
      }
    });

    await Promise.all(pushes);
  }
}
