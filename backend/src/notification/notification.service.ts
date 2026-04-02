import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findUnreadByUser(
    userId: string,
    organisationId: string,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId, organisationId, read: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findRecent(
    userId: string,
    organisationId: string,
    unreadOnly: boolean,
  ): Promise<Notification[]> {
    const where: Record<string, unknown> = { userId, organisationId };
    if (unreadOnly) {
      where.read = false;
    }
    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async countUnread(userId: string, organisationId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, organisationId, read: false },
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notificationRepository.update({ id, userId }, { read: true });
  }

  async markAllAsRead(userId: string, organisationId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, organisationId, read: false },
      { read: true },
    );
  }
}
