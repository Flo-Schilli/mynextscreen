import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { InAppNotificationChannel } from './in-app-notification-channel.service';
import { NotificationEventType } from '../notification-event-type.enum';
import { NotificationPayload } from './notification-channel.interfaces';
import { DRIZZLE } from '../../db/database.constants';
import { DashboardSseService } from '../../dashboard/dashboard-sse.service';
import { organisations, users, notifications, type Organisation, type User } from '../../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../../test/db-harness';
import type { DrizzleDB } from '../../db/drizzle.types';

describe('InAppNotificationChannel', () => {
  let channel: InAppNotificationChannel;
  let db: DrizzleDB;
  let emitToUser: jest.Mock;
  let org: Organisation;
  let user: User;

  const payload: NotificationPayload = {
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emitToUser = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationChannel,
        { provide: DRIZZLE, useValue: db },
        { provide: DashboardSseService, useValue: { emitToUser } },
      ],
    }).compile();
    channel = module.get<InAppNotificationChannel>(InAppNotificationChannel);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
    [user] = await db.insert(users).values({ email: 'user@example.com' }).returning();
  });

  it('should save a notification record and emit via SSE', async () => {
    await channel.send(user.id, org.id, payload);

    const [saved] = await db.select().from(notifications).where(eq(notifications.userId, user.id));

    expect(saved).toBeDefined();
    expect(saved.organisationId).toBe(org.id);
    expect(saved.eventType).toBe(payload.eventType);
    expect(saved.title).toBe(payload.title);
    expect(saved.message).toBe(payload.message);
    expect(saved.read).toBe(false);

    expect(emitToUser).toHaveBeenCalledWith(user.id, 'notification.new', {
      id: saved.id,
      eventType: payload.eventType,
      title: payload.title,
      message: payload.message,
      read: false,
      createdAt: saved.createdAt,
    });
  });

  it('should propagate errors when the insert fails', async () => {
    // A non-existent user violates the FK constraint, surfacing a DB error.
    await expect(
      channel.send('00000000-0000-0000-0000-000000000000', org.id, payload),
    ).rejects.toThrow();
    expect(emitToUser).not.toHaveBeenCalled();
  });
});
