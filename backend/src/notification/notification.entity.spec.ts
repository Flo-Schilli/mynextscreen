import { validate } from 'class-validator';
import { Notification } from './notification.entity';
import { NotificationEventType } from './notification-event-type.enum';

function createNotification(
  overrides: Partial<Notification> = {},
): Notification {
  const notification = new Notification();
  notification.userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  notification.organisationId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  notification.eventType = NotificationEventType.SCREEN_OFFLINE;
  notification.title = 'Screen offline';
  notification.message = 'Screen "Main Hall Left" has gone offline';
  notification.read = false;
  Object.assign(notification, overrides);
  return notification;
}

describe('Notification entity validation', () => {
  it('should pass validation with valid data', async () => {
    const notification = createNotification();
    const errors = await validate(notification);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when userId is empty', async () => {
    const notification = createNotification({ userId: '' });
    const errors = await validate(notification);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'userId')).toBe(true);
  });

  it('should fail validation when organisationId is empty', async () => {
    const notification = createNotification({ organisationId: '' });
    const errors = await validate(notification);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should fail validation when title is empty', async () => {
    const notification = createNotification({ title: '' });
    const errors = await validate(notification);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should fail validation when message is empty', async () => {
    const notification = createNotification({ message: '' });
    const errors = await validate(notification);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'message')).toBe(true);
  });

  it('should fail validation when eventType is invalid', async () => {
    const notification = createNotification({
      eventType: 'invalid.event' as NotificationEventType,
    });
    const errors = await validate(notification);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'eventType')).toBe(true);
  });

  it('should pass validation with all valid event types', async () => {
    for (const eventType of Object.values(NotificationEventType)) {
      const notification = createNotification({ eventType });
      const errors = await validate(notification);
      expect(errors).toHaveLength(0);
    }
  });

  it('should pass validation with read set to true', async () => {
    const notification = createNotification({ read: true });
    const errors = await validate(notification);
    expect(errors).toHaveLength(0);
  });
});
