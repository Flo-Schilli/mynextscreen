import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE } from '../../db/database.constants';
import type { DrizzleDB } from '../../db/drizzle.types';
import { notifications } from '../../db/schema';
import { DashboardSseService } from '../../dashboard/dashboard-sse.service';
import { InAppChannel, NotificationPayload } from './notification-channel.interfaces';

@Injectable()
export class InAppNotificationChannel implements InAppChannel {
  private readonly logger = new Logger(InAppNotificationChannel.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly dashboardSseService: DashboardSseService,
  ) {}

  async send(userId: string, orgId: string, notification: NotificationPayload): Promise<void> {
    const [saved] = await this.db
      .insert(notifications)
      .values({
        userId,
        organisationId: orgId,
        eventType: notification.eventType,
        title: notification.title,
        message: notification.message,
        read: false,
      })
      .returning();

    this.dashboardSseService.emitToUser(userId, 'notification.new', {
      id: saved.id,
      eventType: saved.eventType,
      title: saved.title,
      message: saved.message,
      read: false,
      createdAt: saved.createdAt,
    });

    this.logger.debug(`In-app notification sent to user ${userId}`);
  }
}
