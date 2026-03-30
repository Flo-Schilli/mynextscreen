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
