import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { NotificationService } from './notification.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, users, notifications, type Organisation, type User } from '../db/schema';
import { NotificationEventType } from './notification-event-type.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('NotificationService', () => {
  let service: NotificationService;
  let db: DrizzleDB;
  let org: Organisation;
  let user: User;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<NotificationService>(NotificationService);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
    [user] = await db.insert(users).values({ email: 'user@example.com' }).returning();
  });

  async function seedNotification(overrides: Partial<typeof notifications.$inferInsert> = {}) {
    const [row] = await db
      .insert(notifications)
      .values({
        userId: user.id,
        organisationId: org.id,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Main Hall" has gone offline',
        read: false,
        ...overrides,
      })
      .returning();
    return row;
  }

  describe('findUnreadByUser', () => {
    it('should return unread notifications for a user in an organisation', async () => {
      const unread = await seedNotification();
      await seedNotification({ read: true });

      const result = await service.findUnreadByUser(user.id, org.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(unread.id);
      expect(result[0].read).toBe(false);
    });

    it('should return an empty array when no unread notifications exist', async () => {
      await seedNotification({ read: true });

      const result = await service.findUnreadByUser(user.id, org.id);

      expect(result).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('should update the notification read status to true', async () => {
      const notif = await seedNotification();

      await service.markAsRead(notif.id, user.id);

      const [row] = await db.select().from(notifications).where(eq(notifications.id, notif.id));
      expect(row.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user in an organisation', async () => {
      await seedNotification();
      await seedNotification();
      await seedNotification();

      await service.markAllAsRead(user.id, org.id);

      const remaining = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.organisationId, org.id),
            eq(notifications.read, false),
          ),
        );
      expect(remaining).toHaveLength(0);
    });
  });
});
