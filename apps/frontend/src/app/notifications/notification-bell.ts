import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  HostListener,
} from '@angular/core';
import { NotificationService } from './notification.service';
import { NotificationDropdown } from './notification-dropdown';

@Component({
  selector: 'app-notification-bell',
  imports: [NotificationDropdown],
  template: `
    <div class="bell-wrapper">
      <button
        class="topbar-btn notification-btn"
        aria-label="Notifications"
        (click)="toggleDropdown()"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2a5 5 0 00-5 5v3l-1.5 2h13L15 10V7a5 5 0 00-5-5zM8.5 17a1.5 1.5 0 003 0"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        @if (notificationService.unreadCount() > 0) {
          <span class="unread-dot"></span>
        }
      </button>

      @if (dropdownOpen()) {
        <app-notification-dropdown (closed)="dropdownOpen.set(false)" />
      }
    </div>
  `,
  styles: `
    .bell-wrapper {
      position: relative;
    }

    .topbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 11px;
    }
    .topbar-btn:hover {
      background: var(--hover);
      color: var(--text);
    }

    .notification-btn {
      position: relative;
    }

    .unread-dot {
      position: absolute;
      top: 8px;
      right: 9px;
      width: 8px;
      height: 8px;
      border-radius: 99px;
      background: var(--offline);
      box-shadow: 0 0 0 2px var(--surface);
    }
  `,
})
export class NotificationBell implements OnInit, OnDestroy {
  readonly notificationService = inject(NotificationService);
  private elementRef = inject(ElementRef);

  readonly dropdownOpen = signal(false);

  ngOnInit(): void {
    this.notificationService.init();
  }

  ngOnDestroy(): void {
    this.notificationService.ngOnDestroy();
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.dropdownOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }
}
