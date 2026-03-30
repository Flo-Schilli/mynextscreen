import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { DashboardSocketService } from '../dashboard/dashboard-socket.service';
import {
  Notification,
  UnreadCountResponse,
} from './notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private socketService = inject(DashboardSocketService);
  private socketSub: Subscription | null = null;

  readonly unreadCount = signal(0);
  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);

  /** Fetch unread count from the API and subscribe to real-time updates. */
  init(): void {
    this.fetchUnreadCount();
    this.subscribeToSocket();
  }

  fetchUnreadCount(): void {
    this.http
      .get<UnreadCountResponse>('/api/notifications/unread-count')
      .subscribe({
        next: (res) => this.unreadCount.set(res.count),
      });
  }

  fetchNotifications(): void {
    this.loading.set(true);
    this.http
      .get<Notification[]>('/api/notifications')
      .subscribe({
        next: (list) => {
          this.notifications.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  markAsRead(id: string): void {
    this.http
      .patch<void>(`/api/notifications/${id}/read`, {})
      .subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === id ? { ...n, read: true } : n)),
          );
          this.unreadCount.update((c) => Math.max(0, c - 1));
        },
      });
  }

  markAllAsRead(): void {
    this.http
      .patch<void>('/api/notifications/read-all', {})
      .subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => ({ ...n, read: true })),
          );
          this.unreadCount.set(0);
        },
      });
  }

  private subscribeToSocket(): void {
    this.socketSub?.unsubscribe();
    this.socketSub = this.socketService.notificationNew$.subscribe(
      (event) => {
        const notification = event.data as unknown as Notification;
        this.notifications.update((list) => [notification, ...list].slice(0, 50));
        this.unreadCount.update((c) => c + 1);
      },
    );
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
  }
}
