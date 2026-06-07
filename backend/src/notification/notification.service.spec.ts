import { NotificationService } from './notification.service';
import { Notification } from './notification.entity';
import { NotificationEventType } from './notification-event-type.enum';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: Record<string, jest.Mock>;

  const userId = 'user-1';
  const orgId = 'org-1';

  const mockNotification: Notification = {
    id: 'notif-1',
    userId,
    organisationId: orgId,
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    read: false,
    createdAt: new Date(),
    user: {} as Notification['user'],
    organisation: {} as Notification['organisation'],
  };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    service = new NotificationService(
      repository as unknown as import('typeorm').Repository<Notification>,
    );
  });

  describe('findUnreadByUser', () => {
    it('should return unread notifications for a user in an organisation', async () => {
      const notifications = [mockNotification];
      repository.find.mockResolvedValue(notifications);

      const result = await service.findUnreadByUser(userId, orgId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId, organisationId: orgId, read: false },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(notifications);
    });

    it('should return an empty array when no unread notifications exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findUnreadByUser(userId, orgId);

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should update the notification read status to true', async () => {
      repository.update.mockResolvedValue({ affected: 1 });

      await service.markAsRead('notif-1', userId);

      expect(repository.update).toHaveBeenCalledWith({ id: 'notif-1', userId }, { read: true });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user in an organisation', async () => {
      repository.update.mockResolvedValue({ affected: 3 });

      await service.markAllAsRead(userId, orgId);

      expect(repository.update).toHaveBeenCalledWith(
        { userId, organisationId: orgId, read: false },
        { read: true },
      );
    });
  });
});
