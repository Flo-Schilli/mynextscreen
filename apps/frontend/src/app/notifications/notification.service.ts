import { Injectable, effect, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { Notification, UnreadCountResponse } from './notification.model';
import { OrganisationStateService } from '../shell/organisation-state.service';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private socketService = inject(DashboardSseService);
  private orgState = inject(OrganisationStateService);
  private socketSub: Subscription | null = null;

  readonly unreadCount = signal(0);
  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);

  constructor() {
    // Notifications are per user *and* organisation, so the request needs the
    // X-Organisation-Id header the auth interceptor only attaches once an
    // organisation is selected. The bell mounts before the memberships have
    // loaded, so fetching on init sent a header-less request that the backend
    // rightly answered with 400. Following the signal also means the badge
    // refreshes when someone switches organisation, which it did not before.
    effect(() => {
      const orgId = this.orgState.selectedOrgId();
      if (!orgId) {
        this.unreadCount.set(0);
        this.notifications.set([]);
        return;
      }
      this.fetchUnreadCount();
    });
  }

  /** Subscribe to real-time updates; the count follows the selected org. */
  init(): void {
    this.subscribeToSocket();
  }

  fetchUnreadCount(): void {
    this.http.get<UnreadCountResponse>('/api/notifications/unread-count').subscribe({
      next: (res) => this.unreadCount.set(res.count),
    });
  }

  fetchNotifications(): void {
    this.loading.set(true);
    this.http.get<Notification[]>('/api/notifications').subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markAsRead(id: string): void {
    this.http.patch<void>(`/api/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        this.unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  markAllAsRead(): void {
    this.http.patch<void>('/api/notifications/read-all', {}).subscribe({
      next: () => {
        this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
        this.unreadCount.set(0);
      },
    });
  }

  private subscribeToSocket(): void {
    this.socketSub?.unsubscribe();
    this.socketSub = this.socketService.notificationNew$.subscribe((event) => {
      const notification = event.data as unknown as Notification;
      this.notifications.update((list) => [notification, ...list].slice(0, 50));
      this.unreadCount.update((c) => c + 1);
    });
  }

  ngOnDestroy(): void {
    this.socketSub?.unsubscribe();
  }
}
