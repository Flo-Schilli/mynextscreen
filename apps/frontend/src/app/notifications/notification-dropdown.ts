import { Component, inject, output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { Notification, NotificationEventType } from './notification.model';

@Component({
  selector: 'app-notification-dropdown',
  template: `
    <div class="dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Notifications</span>
        @if (notificationService.notifications().some((n) => !n.read)) {
          <button class="mark-all-btn" (click)="onMarkAllRead()">Mark all as read</button>
        }
      </div>

      <div class="dropdown-list">
        @if (notificationService.loading()) {
          <div class="empty-state">Loading...</div>
        } @else if (notificationService.notifications().length === 0) {
          <div class="empty-state">No notifications yet</div>
        } @else {
          @for (notification of notificationService.notifications(); track notification.id) {
            <button
              class="notification-row"
              [class.unread]="!notification.read"
              (click)="onClickNotification(notification)"
            >
              <span
                class="event-icon"
                [style.color]="getEventColor(notification.eventType)"
                [innerHTML]="getEventIcon(notification.eventType)"
              ></span>
              <div class="notification-body">
                <span class="notification-title">{{ notification.title }}</span>
                <span class="notification-message">{{ truncate(notification.message, 80) }}</span>
              </div>
              <span class="notification-time">{{ relativeTime(notification.createdAt) }}</span>
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      width: 380px;
      max-height: 480px;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      z-index: 100;
      overflow: hidden;
      animation: fadeUp 0.14s ease both;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    .dropdown-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .mark-all-btn {
      font-size: 0.75rem;
      color: var(--accent);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    .mark-all-btn:hover {
      background: var(--hover);
    }

    .dropdown-list {
      overflow-y: auto;
      flex: 1;
    }

    .notification-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      width: 100%;
      text-align: left;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.15s;
      color: var(--text-muted);
    }
    .notification-row:last-child {
      border-bottom: none;
    }
    .notification-row:hover {
      background: var(--hover);
    }
    .notification-row.unread {
      background: var(--accent-soft);
      color: var(--text);
    }
    .notification-row.unread:hover {
      background: color-mix(in srgb, var(--accent-soft) 160%, transparent);
    }

    .event-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .notification-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notification-title {
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notification-message {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notification-time {
      font-size: 0.6875rem;
      color: var(--text-faint);
      white-space: nowrap;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    @media (max-width: 480px) {
      .dropdown {
        width: calc(100vw - 1rem);
        right: -0.5rem;
      }
    }
  `,
})
export class NotificationDropdown implements OnInit {
  readonly notificationService = inject(NotificationService);
  private router = inject(Router);
  readonly closed = output<void>();

  ngOnInit(): void {
    this.notificationService.fetchNotifications();
  }

  onMarkAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  onClickNotification(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
    const route = this.getNavigationRoute(notification);
    if (route) {
      this.router.navigate(route);
      this.closed.emit();
    }
  }

  truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }

  relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }

  getEventColor(eventType: NotificationEventType): string {
    switch (eventType) {
      case 'screen.offline':
        return 'var(--color-offline)';
      case 'screen.online':
        return 'var(--color-online)';
      case 'transcoding.complete':
        return 'var(--accent)';
      case 'transcoding.failed':
        return 'var(--color-warn)';
      default:
        return 'currentColor';
    }
  }

  getEventIcon(eventType: NotificationEventType): string {
    switch (eventType) {
      case 'screen.offline':
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      case 'screen.online':
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2 2 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      case 'transcoding.complete':
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 8l2 2 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      case 'transcoding.failed':
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 10v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      default:
        return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/></svg>';
    }
  }

  private getNavigationRoute(notification: Notification): string[] | null {
    if (!notification.resourceId) return null;
    switch (notification.eventType) {
      case 'screen.offline':
      case 'screen.online':
        return ['/screens'];
      case 'transcoding.complete':
      case 'transcoding.failed':
        return ['/content'];
      default:
        return null;
    }
  }
}
