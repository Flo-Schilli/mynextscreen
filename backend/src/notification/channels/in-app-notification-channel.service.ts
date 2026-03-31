import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../notification.entity';
import { DashboardSseService } from '../../dashboard/dashboard-sse.service';
import {
  InAppChannel,
  NotificationPayload,
} from './notification-channel.interfaces';

@Injectable()
export class InAppNotificationChannel implements InAppChannel {
  private readonly logger = new Logger(InAppNotificationChannel.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly dashboardSseService: DashboardSseService,
  ) {}

  async send(
    userId: string,
    orgId: string,
    notification: NotificationPayload,
  ): Promise<void> {
    const entity = this.notificationRepo.create({
      userId,
      organisationId: orgId,
      eventType: notification.eventType,
      title: notification.title,
      message: notification.message,
      read: false,
    });

    const saved = await this.notificationRepo.save(entity);

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
