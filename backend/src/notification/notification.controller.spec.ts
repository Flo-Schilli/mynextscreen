import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { Notification } from './notification.entity';
import { NotificationEventType } from './notification-event-type.enum';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: Record<string, jest.Mock>;

  const userId = 'user-1';
  const orgId = 'org-1';

  const mockReq = {
    user: { userId, email: 'test@example.com' },
  } as AuthenticatedRequest;

  const mockNotification: Partial<Notification> = {
    id: 'notif-1',
    userId,
    organisationId: orgId,
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    read: false,
    createdAt: new Date('2026-03-30T12:00:00Z'),
  };

  beforeEach(() => {
    notificationService = {
      findRecent: jest.fn(),
      countUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    controller = new NotificationController(notificationService as unknown as NotificationService);
  });

  describe('getNotifications', () => {
    it('should return recent notifications', async () => {
      notificationService.findRecent.mockResolvedValue([mockNotification]);

      const result = await controller.getNotifications(mockReq, orgId);

      expect(notificationService.findRecent).toHaveBeenCalledWith(userId, orgId, false);
      expect(result).toEqual([mockNotification]);
    });

    it('should filter unread only when query param is true', async () => {
      notificationService.findRecent.mockResolvedValue([mockNotification]);

      await controller.getNotifications(mockReq, orgId, 'true');

      expect(notificationService.findRecent).toHaveBeenCalledWith(userId, orgId, true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      notificationService.countUnread.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockReq, orgId);

      expect(notificationService.countUnread).toHaveBeenCalledWith(userId, orgId);
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      notificationService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(mockReq, 'notif-1');

      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1', userId);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      notificationService.markAllAsRead.mockResolvedValue(undefined);

      await controller.markAllAsRead(mockReq, orgId);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith(userId, orgId);
    });
  });
});
