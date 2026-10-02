import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { ScreenEvent } from './screen-event.model';
import { ScreenEventType } from './screen-event-type.enum';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  screenGroups,
  screens,
  slicedRenditions,
  type ScreenGroup,
  type Screen,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { ScreenStateService } from '../screen/screen-state.service';
import { GROUP_SCHEDULE_CHANGED, GroupScheduleChangedEvent } from '../schedule/schedule.event';
import {
  LIVE_STREAM_STARTED,
  LIVE_STREAM_STOPPED,
  ScreenStateChangeEvent,
} from '../screen/screen-state.event';
import { ScheduleService } from '../schedule/schedule.service';
import { MediaUrlSigner } from '../common/media-url-signer.service';

type GroupWithScreens = ScreenGroup & { screens: Screen[] };

@Injectable()
export class ScreenProtocolService {
  private readonly logger = new Logger(ScreenProtocolService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly screenStateService: ScreenStateService,
    private readonly scheduleService: ScheduleService,
    private readonly mediaUrlSigner: MediaUrlSigner,
  ) {}

  @OnEvent(GROUP_SCHEDULE_CHANGED)
  async handleGroupScheduleChanged(event: GroupScheduleChangedEvent): Promise<void> {
    const group = await this.db.query.screenGroups.findFirst({
      where: and(
        eq(screenGroups.id, event.groupId),
        eq(screenGroups.organisationId, event.organisationId),
      ),
      with: { screens: true },
    });

    if (!group || !group.screens || group.screens.length === 0) {
      return;
    }

    // Resolved from the group's own schedule, not by asking one of its members:
    // getCurrentPlaylist prefers a screen's *direct* entries, so a member that
    // happens to carry a schedule of its own used to push its private epoch to
    // the whole group. `group.screens[0]` was not even a stable member — the
    // relation comes back unordered.
    let currentPlaylist: { id: string; name: string } | null = null;
    let epoch = 0;
    try {
      const result = await this.scheduleService.getCurrentGroupPlaylist(event.groupId);
      epoch = result.epoch;
      currentPlaylist = result.playlist
        ? { id: result.playlist.id, name: result.playlist.name }
        : null;
    } catch {
      this.logger.warn(`Failed to resolve playlist for group ${event.groupId}`);
    }

    if (group.mode === ScreenGroupMode.Mirror) {
      await this.fanOutMirror(group, currentPlaylist, epoch, event.organisationId);
    } else {
      await this.fanOutSplit(group, currentPlaylist, epoch, event.organisationId);
    }
  }

  @OnEvent(LIVE_STREAM_STARTED)
  async handleGroupLiveStreamStarted(event: ScreenStateChangeEvent): Promise<void> {
    const group = await this.resolveGroupForScreen(event.screenId);
    if (!group) return;

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
    const group = await this.resolveGroupForScreen(event.screenId);
    if (!group) return;

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

  /**
   * @deprecated Legacy backend-driven group playback. Split/mirror groups now
   * advance through the playlist locally via a shared epoch + synchronized clock
   * (see schedule fan-out + player playlist-clock). Not wired into any production
   * flow; kept only for the live-stream coordination experiment.
   */
  async triggerGroupPlay(
    groupId: string,
    organisationId: string,
    contentUrl: string,
    contentItemId: string,
    contentType: 'video' | 'image',
    isLiveStream: boolean,
  ): Promise<void> {
    const group = await this.db.query.screenGroups.findFirst({
      where: and(eq(screenGroups.id, groupId), eq(screenGroups.organisationId, organisationId)),
      with: { screens: true },
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

  private async resolveGroupForScreen(screenId: string): Promise<GroupWithScreens | null> {
    const [screen] = await this.db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
    if (!screen?.groupId) return null;

    const group = await this.db.query.screenGroups.findFirst({
      where: eq(screenGroups.id, screen.groupId),
      with: { screens: true },
    });

    if (!group || !group.screens || group.screens.length === 0) return null;
    return group;
  }

  private async fanOutMirror(
    group: GroupWithScreens,
    currentPlaylist: { id: string; name: string } | null,
    epoch: number,
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
            epoch,
          }),
        ),
      ),
    );
    await Promise.all(pushes);
  }

  private async fanOutSplit(
    group: GroupWithScreens,
    currentPlaylist: { id: string; name: string } | null,
    epoch: number,
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
            epoch,
          }),
        ),
      ),
    );
    await Promise.all(pushes);
  }

  private async fanOutSplitPlay(
    group: GroupWithScreens,
    contentUrl: string,
    contentItemId: string,
    contentType: 'video' | 'image',
    syncToken: string,
    organisationId: string,
  ): Promise<void> {
    const pushes = group.screens.map(async (screen) => {
      const [rendition] = await this.db
        .select()
        .from(slicedRenditions)
        .where(
          and(
            eq(slicedRenditions.groupId, group.id),
            eq(slicedRenditions.screenId, screen.id),
            eq(slicedRenditions.contentItemId, contentItemId),
          ),
        )
        .limit(1);

      if (rendition) {
        this.screenStateService.pushEvent(
          screen.id,
          new ScreenEvent(ScreenEventType.GroupPlay, {
            contentUrl: this.mediaUrlSigner.sign(
              screen.id,
              `/api/media/slices/${group.id}/${screen.id}/${contentItemId}`,
            ),
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
