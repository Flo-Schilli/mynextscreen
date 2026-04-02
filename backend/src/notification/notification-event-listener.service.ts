import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationHub } from './notification-hub.service';
import { NotificationEventType } from './notification-event-type.enum';
import {
  ScreenStatusEvent,
  SCREEN_STATUS_CHANGED,
} from '../screen/screen-status.event';
import {
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
  TRANSCODING_COMPLETED,
  TRANSCODING_FAILED,
} from '../content/transcoding.event';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly notificationHub: NotificationHub,
    @InjectRepository(Screen)
    private readonly screenRepo: Repository<Screen>,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  @OnEvent(SCREEN_STATUS_CHANGED, { async: true })
  async handleScreenStatusChanged(event: ScreenStatusEvent): Promise<void> {
    try {
      const screen = await this.screenRepo.findOne({
        where: { id: event.screenId },
      });

      const screenName = screen?.name ?? 'Unknown';
      const location = screen?.location ?? 'Unknown';

      if (event.isOnline) {
        await this.notificationHub.dispatch({
          orgId: event.organisationId,
          eventType: NotificationEventType.SCREEN_ONLINE,
          title: 'Screen online',
          message: `Screen "${screenName}" (${location}) is back online.`,
          resourceId: event.screenId,
        });
      } else {
        await this.notificationHub.dispatch({
          orgId: event.organisationId,
          eventType: NotificationEventType.SCREEN_OFFLINE,
          title: 'Screen offline',
          message: `Screen "${screenName}" (${location}) has gone offline.`,
          resourceId: event.screenId,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to dispatch screen status notification: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent(TRANSCODING_COMPLETED, { async: true })
  async handleTranscodingCompleted(
    event: TranscodingCompletedEvent,
  ): Promise<void> {
    try {
      const content = await this.contentRepo.findOne({
        where: { id: event.contentId },
      });

      const contentTitle = content?.title ?? 'Unknown';

      await this.notificationHub.dispatch({
        orgId: event.organisationId,
        eventType: NotificationEventType.TRANSCODING_COMPLETE,
        title: 'Transcoding complete',
        message: `Content "${contentTitle}" has finished transcoding and is ready to use.`,
        resourceId: event.contentId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to dispatch transcoding complete notification: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent(TRANSCODING_FAILED, { async: true })
  async handleTranscodingFailed(event: TranscodingFailedEvent): Promise<void> {
    try {
      const content = await this.contentRepo.findOne({
        where: { id: event.contentId },
      });

      const contentTitle = content?.title ?? 'Unknown';

      await this.notificationHub.dispatch({
        orgId: event.organisationId,
        eventType: NotificationEventType.TRANSCODING_FAILED,
        title: 'Transcoding failed',
        message: `Content "${contentTitle}" failed to transcode. Please re-upload the file.`,
        resourceId: event.contentId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to dispatch transcoding failed notification: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
