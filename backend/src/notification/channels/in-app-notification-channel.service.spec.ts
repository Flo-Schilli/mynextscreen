import { InAppNotificationChannel } from './in-app-notification-channel.service';
import { NotificationEventType } from '../notification-event-type.enum';
import { NotificationPayload } from './notification-channel.interfaces';
import { Notification } from '../notification.entity';

describe('InAppNotificationChannel', () => {
  let channel: InAppNotificationChannel;
  let notificationRepo: Record<string, jest.Mock>;
  let dashboardSseService: Record<string, jest.Mock>;

  const userId = 'user-1';
  const orgId = 'org-1';
  const payload: NotificationPayload = {
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  beforeEach(() => {
    notificationRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    dashboardSseService = {
      emitToUser: jest.fn(),
    };

    channel = new InAppNotificationChannel(
      notificationRepo as unknown as import('typeorm').Repository<Notification>,
      dashboardSseService as unknown as import('../../dashboard/dashboard-sse.service').DashboardSseService,
    );
  });

  it('should save a notification record and emit via SSE', async () => {
    const savedNotification = {
      id: 'notif-1',
      userId,
      organisationId: orgId,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      read: false,
      createdAt: new Date('2026-03-30T12:00:00Z'),
    };

    notificationRepo.create.mockReturnValue(savedNotification);
    notificationRepo.save.mockResolvedValue(savedNotification);

    await channel.send(userId, orgId, payload);

    expect(notificationRepo.create).toHaveBeenCalledWith({
      userId,
      organisationId: orgId,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      read: false,
    });
    expect(notificationRepo.save).toHaveBeenCalledWith(savedNotification);
    expect(dashboardSseService.emitToUser).toHaveBeenCalledWith(userId, 'notification.new', {
      id: 'notif-1',
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      read: false,
      createdAt: savedNotification.createdAt,
    });
  });

  it('should propagate errors from repository save', async () => {
    notificationRepo.create.mockReturnValue({});
    notificationRepo.save.mockRejectedValue(new Error('DB error'));

    await expect(channel.send(userId, orgId, payload)).rejects.toThrow('DB error');
  });
});
