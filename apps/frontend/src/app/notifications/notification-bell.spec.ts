import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NotificationBell } from './notification-bell';
import { NotificationService } from './notification.service';
import { Notification } from './notification.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface NotificationServiceStub {
  unreadCount: WritableSignal<number>;
  notifications: WritableSignal<Notification[]>;
  loading: WritableSignal<boolean>;
  init: ReturnType<typeof vi.fn>;
  ngOnDestroy: ReturnType<typeof vi.fn>;
  fetchNotifications: ReturnType<typeof vi.fn>;
  markAllAsRead: ReturnType<typeof vi.fn>;
  markAsRead: ReturnType<typeof vi.fn>;
}

describe('NotificationBell', () => {
  let fixture: ComponentFixture<NotificationBell>;
  let serviceStub: NotificationServiceStub;

  beforeEach(async () => {
    serviceStub = {
      unreadCount: signal(0),
      notifications: signal<Notification[]>([]),
      loading: signal(false),
      init: vi.fn(),
      ngOnDestroy: vi.fn(),
      fetchNotifications: vi.fn(),
      markAllAsRead: vi.fn(),
      markAsRead: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: NotificationService, useValue: serviceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
  });

  function render(): void {
    fixture.componentRef.changeDetectorRef.detectChanges();
  }

  it('calls service init on ngOnInit', () => {
    // Assert (fixture creation + detectChanges already ran ngOnInit)
    expect(serviceStub.init).toHaveBeenCalledTimes(1);
  });

  it('delegates ngOnDestroy to the service', () => {
    // Act
    fixture.destroy();

    // Assert
    expect(serviceStub.ngOnDestroy).toHaveBeenCalledTimes(1);
  });

  describe('unread dot', () => {
    it('hides the dot when unread count is zero', () => {
      // Arrange / Act
      serviceStub.unreadCount.set(0);
      render();

      // Assert
      expect(fixture.debugElement.query(By.css('.unread-dot'))).toBeNull();
    });

    it('shows the dot when unread count is positive', () => {
      // Arrange / Act
      serviceStub.unreadCount.set(7);
      render();

      // Assert
      expect(fixture.debugElement.query(By.css('.unread-dot'))).not.toBeNull();
    });

    it('shows the dot regardless of how high the unread count is', () => {
      // Arrange / Act
      serviceStub.unreadCount.set(150);
      render();

      // Assert
      expect(fixture.debugElement.query(By.css('.unread-dot'))).not.toBeNull();
    });
  });

  describe('dropdown open/close state', () => {
    it('is closed initially', () => {
      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(false);
      expect(fixture.debugElement.query(By.css('app-notification-dropdown'))).toBeNull();
    });

    it('opens the dropdown when the bell button is clicked', () => {
      // Act
      fixture.debugElement.query(By.css('.notification-btn')).nativeElement.click();
      render();

      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(true);
      expect(fixture.debugElement.query(By.css('app-notification-dropdown'))).not.toBeNull();
    });

    it('toggles the dropdown closed on a second click', () => {
      // Arrange
      const button = fixture.debugElement.query(By.css('.notification-btn')).nativeElement;
      button.click();
      render();

      // Act
      button.click();
      render();

      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(false);
      expect(fixture.debugElement.query(By.css('app-notification-dropdown'))).toBeNull();
    });

    it('closes when the child dropdown emits closed', () => {
      // Arrange
      fixture.componentInstance.toggleDropdown();
      render();

      // Act
      const child = fixture.debugElement.query(By.css('app-notification-dropdown'));
      child.componentInstance.closed.emit();
      render();

      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(false);
    });
  });

  describe('document click outside handling', () => {
    it('closes the dropdown when clicking outside the bell wrapper', () => {
      // Arrange
      fixture.componentInstance.toggleDropdown();
      render();
      const outside = document.createElement('div');
      document.body.appendChild(outside);

      // Act
      fixture.componentInstance.onDocumentClick({ target: outside } as unknown as MouseEvent);

      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(false);
      outside.remove();
    });

    it('keeps the dropdown open when clicking inside the bell wrapper', () => {
      // Arrange
      fixture.componentInstance.toggleDropdown();
      render();
      const inside = fixture.debugElement.query(By.css('.notification-btn')).nativeElement;

      // Act
      fixture.componentInstance.onDocumentClick({ target: inside } as unknown as MouseEvent);

      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(true);
    });

    it('does nothing when the dropdown is already closed', () => {
      // Arrange
      const outside = document.createElement('div');
      document.body.appendChild(outside);

      // Act
      fixture.componentInstance.onDocumentClick({ target: outside } as unknown as MouseEvent);

      // Assert
      expect(fixture.componentInstance.dropdownOpen()).toBe(false);
      outside.remove();
    });
  });
});
