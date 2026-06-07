import {
  Component,
  inject,
  signal,
  computed,
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
          <span class="badge">{{ badgeText() }}</span>
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
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      border-radius: 6px;
    }
    .topbar-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .notification-btn {
      position: relative;
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      background: var(--color-accent);
      color: #fff;
      font-size: 0.625rem;
      font-weight: 600;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }
  `,
})
export class NotificationBell implements OnInit, OnDestroy {
  readonly notificationService = inject(NotificationService);
  private elementRef = inject(ElementRef);

  readonly dropdownOpen = signal(false);
  readonly badgeText = computed(() => {
    const count = this.notificationService.unreadCount();
    return count > 99 ? '99+' : String(count);
  });

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
