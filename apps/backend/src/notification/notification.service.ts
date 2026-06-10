import { Injectable, Inject } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { notifications, type Notification } from '../db/schema';

@Injectable()
export class NotificationService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findUnreadByUser(userId: string, organisationId: string): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organisationId, organisationId),
          eq(notifications.read, false),
        ),
      )
      .orderBy(desc(notifications.createdAt));
  }

  async findRecent(
    userId: string,
    organisationId: string,
    unreadOnly: boolean,
  ): Promise<Notification[]> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.organisationId, organisationId),
    ];
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }
    return this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async countUnread(userId: string, organisationId: string): Promise<number> {
    return this.db.$count(
      notifications,
      and(
        eq(notifications.userId, userId),
        eq(notifications.organisationId, organisationId),
        eq(notifications.read, false),
      ),
    );
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllAsRead(userId: string, organisationId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organisationId, organisationId),
          eq(notifications.read, false),
        ),
      );
  }
}
