import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { NotificationDropdown } from './notification-dropdown';
import { NotificationService } from './notification.service';
import { Notification, NotificationEventType } from './notification.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface NotificationServiceStub {
  notifications: WritableSignal<Notification[]>;
  loading: WritableSignal<boolean>;
  fetchNotifications: ReturnType<typeof vi.fn>;
  markAsRead: ReturnType<typeof vi.fn>;
  markAllAsRead: ReturnType<typeof vi.fn>;
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    userId: 'u1',
    organisationId: 'o1',
    eventType: 'screen.offline',
    title: 'Screen offline',
    message: 'Screen "Main" has gone offline',
    read: false,
    createdAt: '2026-06-09T12:00:00.000Z',
    ...overrides,
  };
}

describe('NotificationDropdown', () => {
  let fixture: ComponentFixture<NotificationDropdown>;
  let serviceStub: NotificationServiceStub;
  let router: Router;

  beforeEach(async () => {
    serviceStub = {
      notifications: signal<Notification[]>([]),
      loading: signal(false),
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        NotificationDropdown,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: NotificationService, useValue: serviceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationDropdown);
    router = TestBed.inject(Router);
  });

  it('fetches notifications on init', () => {
    // Act
    fixture.detectChanges();

    // Assert
    expect(serviceStub.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  describe('list rendering states', () => {
    it('shows the loading state while loading', () => {
      // Arrange / Act
      serviceStub.loading.set(true);
      fixture.detectChanges();

      // Assert
      const empty = fixture.debugElement.query(By.css('.empty-state'));
      expect(empty.nativeElement.textContent.trim()).toBe('Loading...');
      expect(fixture.debugElement.queryAll(By.css('.notification-row')).length).toBe(0);
    });

    it('shows the empty state when there are no notifications', () => {
      // Arrange / Act
      serviceStub.loading.set(false);
      serviceStub.notifications.set([]);
      fixture.detectChanges();

      // Assert
      const empty = fixture.debugElement.query(By.css('.empty-state'));
      expect(empty.nativeElement.textContent.trim()).toBe('No notifications yet');
    });

    it('renders one row per notification with title and message', () => {
      // Arrange / Act
      serviceStub.notifications.set([
        makeNotification({ id: 'a', title: 'Alpha', message: 'first message' }),
        makeNotification({ id: 'b', title: 'Beta', message: 'second message' }),
      ]);
      fixture.detectChanges();

      // Assert
      const rows = fixture.debugElement.queryAll(By.css('.notification-row'));
      expect(rows.length).toBe(2);
      expect(rows[0].nativeElement.textContent).toContain('Alpha');
      expect(rows[0].nativeElement.textContent).toContain('first message');
      expect(rows[1].nativeElement.textContent).toContain('Beta');
    });

    it('applies the unread class to unread rows only', () => {
      // Arrange / Act
      serviceStub.notifications.set([
        makeNotification({ id: 'a', read: false }),
        makeNotification({ id: 'b', read: true }),
      ]);
      fixture.detectChanges();

      // Assert
      const rows = fixture.debugElement.queryAll(By.css('.notification-row'));
      expect(rows[0].classes['unread']).toBe(true);
      expect(rows[1].classes['unread']).toBeFalsy();
    });
  });

  describe('mark all as read button', () => {
    it('is shown when at least one notification is unread', () => {
      // Arrange / Act
      serviceStub.notifications.set([makeNotification({ read: false })]);
      fixture.detectChanges();

      // Assert
      expect(fixture.debugElement.query(By.css('.mark-all-btn'))).not.toBeNull();
    });

    it('is hidden when all notifications are read', () => {
      // Arrange / Act
      serviceStub.notifications.set([
        makeNotification({ id: 'a', read: true }),
        makeNotification({ id: 'b', read: true }),
      ]);
      fixture.detectChanges();

      // Assert
      expect(fixture.debugElement.query(By.css('.mark-all-btn'))).toBeNull();
    });

    it('calls markAllAsRead on click', () => {
      // Arrange
      serviceStub.notifications.set([makeNotification({ read: false })]);
      fixture.detectChanges();

      // Act
      fixture.debugElement.query(By.css('.mark-all-btn')).nativeElement.click();

      // Assert
      expect(serviceStub.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('clicking a notification', () => {
    it('marks an unread notification as read', () => {
      // Arrange
      const notification = makeNotification({ id: 'a', read: false, resourceId: undefined });

      // Act
      fixture.componentInstance.onClickNotification(notification);

      // Assert
      expect(serviceStub.markAsRead).toHaveBeenCalledWith('a');
    });

    it('does not re-mark an already read notification', () => {
      // Arrange
      const notification = makeNotification({ id: 'a', read: true });

      // Act
      fixture.componentInstance.onClickNotification(notification);

      // Assert
      expect(serviceStub.markAsRead).not.toHaveBeenCalled();
    });

    it('navigates to /screens and emits closed for a screen notification with a resource', () => {
      // Arrange
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const closedSpy = vi.fn();
      fixture.componentInstance.closed.subscribe(closedSpy);
      const notification = makeNotification({
        eventType: 'screen.online',
        read: true,
        resourceId: 'screen-1',
      });

      // Act
      fixture.componentInstance.onClickNotification(notification);

      // Assert
      expect(navSpy).toHaveBeenCalledWith(['/screens']);
      expect(closedSpy).toHaveBeenCalledTimes(1);
    });

    it('navigates to /content for a transcoding notification with a resource', () => {
      // Arrange
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const notification = makeNotification({
        eventType: 'transcoding.complete',
        read: true,
        resourceId: 'content-1',
      });

      // Act
      fixture.componentInstance.onClickNotification(notification);

      // Assert
      expect(navSpy).toHaveBeenCalledWith(['/content']);
    });

    it('does not navigate or emit when there is no resourceId', () => {
      // Arrange
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const closedSpy = vi.fn();
      fixture.componentInstance.closed.subscribe(closedSpy);
      const notification = makeNotification({
        eventType: 'screen.offline',
        read: true,
        resourceId: undefined,
      });

      // Act
      fixture.componentInstance.onClickNotification(notification);

      // Assert
      expect(navSpy).not.toHaveBeenCalled();
      expect(closedSpy).not.toHaveBeenCalled();
    });

    it('triggers navigation when an unread row is clicked in the DOM', () => {
      // Arrange
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      serviceStub.notifications.set([
        makeNotification({ id: 'a', read: false, eventType: 'screen.offline', resourceId: 's1' }),
      ]);
      fixture.detectChanges();

      // Act
      fixture.debugElement.query(By.css('.notification-row')).nativeElement.click();

      // Assert
      expect(serviceStub.markAsRead).toHaveBeenCalledWith('a');
      expect(navSpy).toHaveBeenCalledWith(['/screens']);
    });
  });

  describe('truncate', () => {
    it('returns the text unchanged when within the limit', () => {
      expect(fixture.componentInstance.truncate('short', 80)).toBe('short');
    });

    it('truncates and appends an ellipsis when over the limit', () => {
      // Arrange
      const text = 'a'.repeat(90);

      // Act
      const result = fixture.componentInstance.truncate(text, 80);

      // Assert
      expect(result.endsWith('...')).toBe(true);
      expect(result.length).toBe(83);
    });
  });

  describe('relativeTime', () => {
    const fixedNow = new Date('2026-06-09T12:00:00.000Z').getTime();

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    });

    it('returns "just now" for under a minute', () => {
      expect(fixture.componentInstance.relativeTime('2026-06-09T11:59:30.000Z')).toBe('just now');
    });

    it('returns minutes ago for under an hour', () => {
      expect(fixture.componentInstance.relativeTime('2026-06-09T11:30:00.000Z')).toBe('30m ago');
    });

    it('returns hours ago for under a day', () => {
      expect(fixture.componentInstance.relativeTime('2026-06-09T07:00:00.000Z')).toBe('5h ago');
    });

    it('returns days ago for over a day', () => {
      expect(fixture.componentInstance.relativeTime('2026-06-06T12:00:00.000Z')).toBe('3d ago');
    });
  });

  describe('getEventColor', () => {
    it('returns the offline token for screen.offline', () => {
      expect(fixture.componentInstance.getEventColor('screen.offline')).toBe(
        'var(--color-offline)',
      );
    });

    it('returns the online token for screen.online', () => {
      expect(fixture.componentInstance.getEventColor('screen.online')).toBe('var(--color-online)');
    });

    it('returns the accent token for transcoding.complete', () => {
      expect(fixture.componentInstance.getEventColor('transcoding.complete')).toBe('var(--accent)');
    });

    it('returns the warn token for transcoding.failed', () => {
      expect(fixture.componentInstance.getEventColor('transcoding.failed')).toBe(
        'var(--color-warn)',
      );
    });

    it('returns currentColor for an unknown event type', () => {
      const color = fixture.componentInstance.getEventColor(
        'unknown.event' as NotificationEventType,
      );
      expect(color).toBe('currentColor');
    });
  });

  describe('getEventIcon', () => {
    it('returns a color-agnostic cross icon for screen.offline', () => {
      const icon = fixture.componentInstance.getEventIcon('screen.offline');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('M6 6l4 4M10 6l-4 4');
    });

    it('returns a color-agnostic check icon for screen.online', () => {
      const icon = fixture.componentInstance.getEventIcon('screen.online');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('M5.5 8l2 2 3-4');
    });

    it('returns a color-agnostic check icon for transcoding.complete', () => {
      const icon = fixture.componentInstance.getEventIcon('transcoding.complete');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('M5.5 8l2 2 3-4');
    });

    it('returns a color-agnostic warning icon for transcoding.failed', () => {
      const icon = fixture.componentInstance.getEventIcon('transcoding.failed');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('M8 5v3M8 10v1');
    });

    it('returns a fallback currentColor icon for an unknown event type', () => {
      const icon = fixture.componentInstance.getEventIcon('unknown.event' as NotificationEventType);
      expect(icon).toContain('currentColor');
    });
  });
});
