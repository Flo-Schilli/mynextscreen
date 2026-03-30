import { TestBed, getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificationService } from './notification.service';
import { DashboardSocketService, DashboardEvent } from '../dashboard/dashboard-socket.service';
import { Notification } from './notification.model';

try {
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
} catch {
  // already initialized
}

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let notificationNew$: Subject<DashboardEvent>;

  beforeEach(() => {
    notificationNew$ = new Subject<DashboardEvent>();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationService,
        {
          provide: DashboardSocketService,
          useValue: { notificationNew$ },
        },
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchUnreadCount', () => {
    it('should update unreadCount signal from API', () => {
      service.fetchUnreadCount();

      const req = httpMock.expectOne('/api/notifications/unread-count');
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });

      expect(service.unreadCount()).toBe(5);
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch and set notifications list', () => {
      service.fetchNotifications();
      expect(service.loading()).toBe(true);

      const mockNotifications: Notification[] = [
        {
          id: '1',
          userId: 'u1',
          organisationId: 'o1',
          eventType: 'screen.offline',
          title: 'Screen offline',
          message: 'Screen "Main" has gone offline',
          read: false,
          createdAt: '2026-03-30T10:00:00Z',
        },
      ];

      const req = httpMock.expectOne('/api/notifications');
      expect(req.request.method).toBe('GET');
      req.flush(mockNotifications);

      expect(service.loading()).toBe(false);
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].title).toBe('Screen offline');
    });

    it('should set loading to false on error', () => {
      service.fetchNotifications();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne('/api/notifications');
      req.error(new ProgressEvent('error'));

      expect(service.loading()).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read and decrement unread count', () => {
      service.notifications.set([
        {
          id: '1',
          userId: 'u1',
          organisationId: 'o1',
          eventType: 'screen.offline',
          title: 'Test',
          message: 'Test message',
          read: false,
          createdAt: '2026-03-30T10:00:00Z',
        },
      ]);
      service.unreadCount.set(3);

      service.markAsRead('1');

      const req = httpMock.expectOne('/api/notifications/1/read');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);

      expect(service.notifications()[0].read).toBe(true);
      expect(service.unreadCount()).toBe(2);
    });

    it('should not go below 0 unread count', () => {
      service.unreadCount.set(0);
      service.notifications.set([
        {
          id: '1',
          userId: 'u1',
          organisationId: 'o1',
          eventType: 'screen.offline',
          title: 'Test',
          message: 'msg',
          read: false,
          createdAt: '2026-03-30T10:00:00Z',
        },
      ]);

      service.markAsRead('1');
      const req = httpMock.expectOne('/api/notifications/1/read');
      req.flush(null);

      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and reset unread count', () => {
      service.notifications.set([
        {
          id: '1',
          userId: 'u1',
          organisationId: 'o1',
          eventType: 'screen.offline',
          title: 'Test 1',
          message: 'msg',
          read: false,
          createdAt: '2026-03-30T10:00:00Z',
        },
        {
          id: '2',
          userId: 'u1',
          organisationId: 'o1',
          eventType: 'screen.online',
          title: 'Test 2',
          message: 'msg',
          read: false,
          createdAt: '2026-03-30T09:00:00Z',
        },
      ]);
      service.unreadCount.set(2);

      service.markAllAsRead();

      const req = httpMock.expectOne('/api/notifications/read-all');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);

      expect(service.notifications().every((n) => n.read)).toBe(true);
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('Socket.IO notification.new', () => {
    it('should prepend new notification and increment unread count on init', () => {
      service.init();
      const initReq = httpMock.expectOne('/api/notifications/unread-count');
      initReq.flush({ count: 1 });

      const newNotification: Notification = {
        id: '99',
        userId: 'u1',
        organisationId: 'o1',
        eventType: 'transcoding.complete',
        title: 'Transcoding complete',
        message: 'Content "video.mp4" has finished transcoding.',
        read: false,
        createdAt: '2026-03-30T12:00:00Z',
      };

      notificationNew$.next({
        type: 'notification.new',
        data: newNotification as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });

      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].id).toBe('99');
      expect(service.unreadCount()).toBe(2);
    });

    it('should cap notifications list at 50 items', () => {
      service.init();
      const initReq = httpMock.expectOne('/api/notifications/unread-count');
      initReq.flush({ count: 0 });

      const existing = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        userId: 'u1',
        organisationId: 'o1',
        eventType: 'screen.online' as const,
        title: `Notification ${i}`,
        message: 'msg',
        read: true,
        createdAt: '2026-03-30T10:00:00Z',
      }));
      service.notifications.set(existing);

      notificationNew$.next({
        type: 'notification.new',
        data: {
          id: 'new',
          userId: 'u1',
          organisationId: 'o1',
          eventType: 'screen.offline',
          title: 'New',
          message: 'msg',
          read: false,
          createdAt: '2026-03-30T12:00:00Z',
        } as unknown as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });

      expect(service.notifications().length).toBe(50);
      expect(service.notifications()[0].id).toBe('new');
    });
  });
});
