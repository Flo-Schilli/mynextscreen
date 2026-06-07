import { NotificationEventListener } from './notification-event-listener.service';
import { NotificationHub } from './notification-hub.service';
import { NotificationEventType } from './notification-event-type.enum';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import { TranscodingCompletedEvent, TranscodingFailedEvent } from '../content/transcoding.event';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';

describe('NotificationEventListener', () => {
  let listener: NotificationEventListener;
  let notificationHub: { dispatch: jest.Mock };
  let screenRepo: { findOne: jest.Mock };
  let contentRepo: { findOne: jest.Mock };

  const orgId = 'org-1';
  const screenId = 'screen-1';
  const contentId = 'content-1';

  const mockScreen: Partial<Screen> = {
    id: screenId,
    name: 'Main Hall Left',
    location: 'Building A',
    organisationId: orgId,
  };

  const mockContent: Partial<Content> = {
    id: contentId,
    title: 'Welcome Video',
    organisationId: orgId,
  };

  beforeEach(() => {
    notificationHub = { dispatch: jest.fn().mockResolvedValue(undefined) };
    screenRepo = { findOne: jest.fn() };
    contentRepo = { findOne: jest.fn() };

    listener = new NotificationEventListener(
      notificationHub as unknown as NotificationHub,
      screenRepo as unknown as import('typeorm').Repository<Screen>,
      contentRepo as unknown as import('typeorm').Repository<Content>,
    );
  });

  describe('handleScreenStatusChanged', () => {
    it('should dispatch screen.offline notification when screen goes offline', async () => {
      screenRepo.findOne.mockResolvedValue(mockScreen);
      const event = new ScreenStatusEvent(screenId, orgId, false);

      await listener.handleScreenStatusChanged(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Main Hall Left" (Building A) has gone offline.',
        resourceId: screenId,
      });
    });

    it('should dispatch screen.online notification when screen comes online', async () => {
      screenRepo.findOne.mockResolvedValue(mockScreen);
      const event = new ScreenStatusEvent(screenId, orgId, true);

      await listener.handleScreenStatusChanged(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.SCREEN_ONLINE,
        title: 'Screen online',
        message: 'Screen "Main Hall Left" (Building A) is back online.',
        resourceId: screenId,
      });
    });

    it('should use fallback names when screen is not found', async () => {
      screenRepo.findOne.mockResolvedValue(null);
      const event = new ScreenStatusEvent(screenId, orgId, false);

      await listener.handleScreenStatusChanged(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Unknown" (Unknown) has gone offline.',
        resourceId: screenId,
      });
    });

    it('should catch and log errors without throwing', async () => {
      notificationHub.dispatch.mockRejectedValue(new Error('hub error'));
      screenRepo.findOne.mockResolvedValue(mockScreen);
      const event = new ScreenStatusEvent(screenId, orgId, false);

      await expect(listener.handleScreenStatusChanged(event)).resolves.toBeUndefined();
    });
  });

  describe('handleTranscodingCompleted', () => {
    it('should dispatch transcoding.complete notification', async () => {
      contentRepo.findOne.mockResolvedValue(mockContent);
      const event = new TranscodingCompletedEvent(contentId, orgId, 1024);

      await listener.handleTranscodingCompleted(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.TRANSCODING_COMPLETE,
        title: 'Transcoding complete',
        message: 'Content "Welcome Video" has finished transcoding and is ready to use.',
        resourceId: contentId,
      });
    });

    it('should use fallback title when content is not found', async () => {
      contentRepo.findOne.mockResolvedValue(null);
      const event = new TranscodingCompletedEvent(contentId, orgId, 1024);

      await listener.handleTranscodingCompleted(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Content "Unknown" has finished transcoding and is ready to use.',
        }),
      );
    });

    it('should catch and log errors without throwing', async () => {
      notificationHub.dispatch.mockRejectedValue(new Error('hub error'));
      contentRepo.findOne.mockResolvedValue(mockContent);
      const event = new TranscodingCompletedEvent(contentId, orgId, 1024);

      await expect(listener.handleTranscodingCompleted(event)).resolves.toBeUndefined();
    });
  });

  describe('handleTranscodingFailed', () => {
    it('should dispatch transcoding.failed notification', async () => {
      contentRepo.findOne.mockResolvedValue(mockContent);
      const event = new TranscodingFailedEvent(contentId, orgId, 'codec not supported');

      await listener.handleTranscodingFailed(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.TRANSCODING_FAILED,
        title: 'Transcoding failed',
        message: 'Content "Welcome Video" failed to transcode. Please re-upload the file.',
        resourceId: contentId,
      });
    });

    it('should use fallback title when content is not found', async () => {
      contentRepo.findOne.mockResolvedValue(null);
      const event = new TranscodingFailedEvent(contentId, orgId, 'codec not supported');

      await listener.handleTranscodingFailed(event);

      expect(notificationHub.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Content "Unknown" failed to transcode. Please re-upload the file.',
        }),
      );
    });

    it('should catch and log errors without throwing', async () => {
      notificationHub.dispatch.mockRejectedValue(new Error('hub error'));
      contentRepo.findOne.mockResolvedValue(mockContent);
      const event = new TranscodingFailedEvent(contentId, orgId, 'codec not supported');

      await expect(listener.handleTranscodingFailed(event)).resolves.toBeUndefined();
    });
  });
});
