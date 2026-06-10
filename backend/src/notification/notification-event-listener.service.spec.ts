import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventListener } from './notification-event-listener.service';
import { NotificationHub } from './notification-hub.service';
import { NotificationEventType } from './notification-event-type.enum';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import { TranscodingCompletedEvent, TranscodingFailedEvent } from '../content/transcoding.event';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, contents, type Organisation } from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('NotificationEventListener', () => {
  let listener: NotificationEventListener;
  let db: DrizzleDB;
  let dispatch: jest.Mock;
  let org: Organisation;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    dispatch = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventListener,
        { provide: NotificationHub, useValue: { dispatch } },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();
    listener = module.get<NotificationEventListener>(NotificationEventListener);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
  });

  async function seedScreen() {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: org.id,
        name: 'Main Hall Left',
        resolution: '1920x1080',
        location: 'Building A',
        apiKeyHash: 'hash',
      })
      .returning();
    return screen;
  }

  async function seedContent(title: string) {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId: org.id,
        title,
        type: ContentType.Video,
        originalFilename: 'file.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 1024,
      })
      .returning();
    return content;
  }

  describe('handleScreenStatusChanged', () => {
    it('should dispatch screen.offline notification when screen goes offline', async () => {
      const screen = await seedScreen();
      const event = new ScreenStatusEvent(screen.id, org.id, false);

      await listener.handleScreenStatusChanged(event);

      expect(dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Main Hall Left" (Building A) has gone offline.',
        resourceId: screen.id,
      });
    });

    it('should dispatch screen.online notification when screen comes online', async () => {
      const screen = await seedScreen();
      const event = new ScreenStatusEvent(screen.id, org.id, true);

      await listener.handleScreenStatusChanged(event);

      expect(dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.SCREEN_ONLINE,
        title: 'Screen online',
        message: 'Screen "Main Hall Left" (Building A) is back online.',
        resourceId: screen.id,
      });
    });

    it('should use fallback names when screen is not found', async () => {
      const missingId = '00000000-0000-0000-0000-000000000000';
      const event = new ScreenStatusEvent(missingId, org.id, false);

      await listener.handleScreenStatusChanged(event);

      expect(dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Unknown" (Unknown) has gone offline.',
        resourceId: missingId,
      });
    });

    it('should catch and log errors without throwing', async () => {
      dispatch.mockRejectedValue(new Error('hub error'));
      const screen = await seedScreen();
      const event = new ScreenStatusEvent(screen.id, org.id, false);

      await expect(listener.handleScreenStatusChanged(event)).resolves.toBeUndefined();
    });
  });

  describe('handleTranscodingCompleted', () => {
    it('should dispatch transcoding.complete notification', async () => {
      const content = await seedContent('Welcome Video');
      const event = new TranscodingCompletedEvent(content.id, org.id, 1024);

      await listener.handleTranscodingCompleted(event);

      expect(dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.TRANSCODING_COMPLETE,
        title: 'Transcoding complete',
        message: 'Content "Welcome Video" has finished transcoding and is ready to use.',
        resourceId: content.id,
      });
    });

    it('should use fallback title when content is not found', async () => {
      const event = new TranscodingCompletedEvent(
        '00000000-0000-0000-0000-000000000000',
        org.id,
        1024,
      );

      await listener.handleTranscodingCompleted(event);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Content "Unknown" has finished transcoding and is ready to use.',
        }),
      );
    });

    it('should catch and log errors without throwing', async () => {
      dispatch.mockRejectedValue(new Error('hub error'));
      const content = await seedContent('Welcome Video');
      const event = new TranscodingCompletedEvent(content.id, org.id, 1024);

      await expect(listener.handleTranscodingCompleted(event)).resolves.toBeUndefined();
    });
  });

  describe('handleTranscodingFailed', () => {
    it('should dispatch transcoding.failed notification', async () => {
      const content = await seedContent('Welcome Video');
      const event = new TranscodingFailedEvent(content.id, org.id, 'codec not supported');

      await listener.handleTranscodingFailed(event);

      expect(dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.TRANSCODING_FAILED,
        title: 'Transcoding failed',
        message: 'Content "Welcome Video" failed to transcode. Please re-upload the file.',
        resourceId: content.id,
      });
    });

    it('should use fallback title when content is not found', async () => {
      const event = new TranscodingFailedEvent(
        '00000000-0000-0000-0000-000000000000',
        org.id,
        'codec not supported',
      );

      await listener.handleTranscodingFailed(event);

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Content "Unknown" failed to transcode. Please re-upload the file.',
        }),
      );
    });

    it('should catch and log errors without throwing', async () => {
      dispatch.mockRejectedValue(new Error('hub error'));
      const content = await seedContent('Welcome Video');
      const event = new TranscodingFailedEvent(content.id, org.id, 'codec not supported');

      await expect(listener.handleTranscodingFailed(event)).resolves.toBeUndefined();
    });
  });
});
