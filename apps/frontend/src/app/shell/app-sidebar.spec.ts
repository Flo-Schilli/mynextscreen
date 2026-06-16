import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AppSidebar, NavItem } from './app-sidebar';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

// Created fixtures are tracked so they can be destroyed before the TestBed
// injector is torn down — RouterLink otherwise runs its applicationErrorHandler
// against the already-destroyed injector on teardown (NG0205).
const createdFixtures: ComponentFixture<AppSidebar>[] = [];

// Nav items now use IconName strings instead of raw SVG HTML.
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'Dashboard' },
  { label: 'Screens', route: '/screens', icon: 'Screens' },
];

async function createFixture(
  overrides: {
    collapsed?: boolean;
    mobileOpen?: boolean;
    navItems?: NavItem[];
    isSuperAdmin?: boolean;
  } = {},
): Promise<ComponentFixture<AppSidebar>> {
  await TestBed.configureTestingModule({
    imports: [AppSidebar],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', children: [] }]),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AppSidebar);
  fixture.componentRef.setInput('collapsed', overrides.collapsed ?? false);
  fixture.componentRef.setInput('mobileOpen', overrides.mobileOpen ?? false);
  fixture.componentRef.setInput('navItems', overrides.navItems ?? NAV_ITEMS);
  fixture.componentRef.setInput('isSuperAdmin', overrides.isSuperAdmin ?? false);
  fixture.detectChanges();
  createdFixtures.push(fixture);
  return fixture;
}

describe('AppSidebar', () => {
  afterEach(() => {
    while (createdFixtures.length) {
      createdFixtures.pop()?.destroy();
    }
  });

  describe('navigation rendering', () => {
    it('renders one nav link per nav item', async () => {
      // Arrange + Act
      const fixture = await createFixture();

      // Assert — each nav item becomes an <a class="nav-item">
      const links = fixture.debugElement.queryAll(By.css('.sidebar-nav a.nav-item'));
      expect(links.length).toBe(NAV_ITEMS.length);
    });

    it('binds each nav link to its route via routerLink', async () => {
      // Arrange + Act
      const fixture = await createFixture();

      // Assert
      const anchors = fixture.debugElement
        .queryAll(By.css('.sidebar-nav a.nav-item'))
        .map((el) => (el.nativeElement as HTMLAnchorElement).getAttribute('href'));
      expect(anchors).toEqual(['/dashboard', '/screens']);
    });

    it('renders the icon and label when expanded', async () => {
      // Arrange + Act
      const fixture = await createFixture({ collapsed: false });

      // Assert — mns-icon is present and .nav-label shows the text
      const firstLink = fixture.debugElement.query(By.css('.sidebar-nav a.nav-item'));
      const icon = firstLink.query(By.css('mns-icon'));
      const label = firstLink.query(By.css('.nav-label')).nativeElement as HTMLElement;
      expect(icon).not.toBeNull();
      expect(label.textContent?.trim()).toBe('Dashboard');
    });
  });

  describe('collapsed state', () => {
    it('applies the collapsed class and hides the logo text when collapsed', async () => {
      // Arrange + Act
      const fixture = await createFixture({ collapsed: true });

      // Assert
      const aside = fixture.debugElement.query(By.css('aside.sidebar'))
        .nativeElement as HTMLElement;
      expect(aside.classList.contains('collapsed')).toBe(true);
      expect(fixture.debugElement.query(By.css('.logo-text'))).toBeNull();
    });

    it('shows the logo text and nav labels when expanded', async () => {
      // Arrange + Act
      const fixture = await createFixture({ collapsed: false });

      // Assert
      expect(fixture.debugElement.query(By.css('.logo-text'))).not.toBeNull();
      expect(fixture.debugElement.queryAll(By.css('.nav-label')).length).toBeGreaterThan(0);
    });

    it('hides nav labels and sets the title tooltip when collapsed', async () => {
      // Arrange + Act
      const fixture = await createFixture({ collapsed: true });

      // Assert
      expect(fixture.debugElement.queryAll(By.css('.nav-label')).length).toBe(0);
      const firstLink = fixture.debugElement.query(By.css('.sidebar-nav a.nav-item'))
        .nativeElement as HTMLAnchorElement;
      expect(firstLink.getAttribute('title')).toBe('Dashboard');
    });

    it('shows the expand button in .expand-wrap when collapsed', async () => {
      const fixture = await createFixture({ collapsed: true });
      expect(fixture.debugElement.query(By.css('.expand-wrap .collapse-btn'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.sidebar-header .collapse-btn'))).toBeNull();
    });

    it('shows the collapse button in the header when expanded', async () => {
      const fixture = await createFixture({ collapsed: false });
      const button = fixture.debugElement.query(By.css('.collapse-btn'))
        .nativeElement as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Collapse sidebar');
    });
  });

  describe('mobile-open state', () => {
    it('applies the mobile-open class when mobileOpen is true', async () => {
      // Arrange + Act
      const fixture = await createFixture({ mobileOpen: true });

      // Assert
      const aside = fixture.debugElement.query(By.css('aside.sidebar'))
        .nativeElement as HTMLElement;
      expect(aside.classList.contains('mobile-open')).toBe(true);
    });

    it('does not apply the mobile-open class when mobileOpen is false', async () => {
      // Arrange + Act
      const fixture = await createFixture({ mobileOpen: false });

      // Assert
      const aside = fixture.debugElement.query(By.css('aside.sidebar'))
        .nativeElement as HTMLElement;
      expect(aside.classList.contains('mobile-open')).toBe(false);
    });
  });

  describe('super-admin link', () => {
    it('hides the admin nav item when not a super admin', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isSuperAdmin: false });

      // Assert
      expect(fixture.debugElement.query(By.css('.admin-nav-item'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.nav-divider'))).toBeNull();
    });

    it('renders the admin nav item pointing at /admin/dashboard for super admins', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isSuperAdmin: true });

      // Assert
      const adminLink = fixture.debugElement.query(By.css('.admin-nav-item'));
      expect(adminLink).not.toBeNull();
      expect((adminLink.nativeElement as HTMLAnchorElement).getAttribute('href')).toBe(
        '/admin/dashboard',
      );
      expect(fixture.debugElement.query(By.css('.nav-divider'))).not.toBeNull();
    });
  });

  describe('output emits', () => {
    it('emits toggleCollapse when the collapse button is clicked', async () => {
      // Arrange
      const fixture = await createFixture({ collapsed: false });
      const spy = vi.fn();
      fixture.componentInstance.toggleCollapse.subscribe(spy);

      // Act
      (
        fixture.debugElement.query(By.css('.collapse-btn')).nativeElement as HTMLButtonElement
      ).click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits closeMobile when a nav link is clicked', async () => {
      // Arrange
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.closeMobile.subscribe(spy);

      // Act
      (
        fixture.debugElement.query(By.css('.sidebar-nav a.nav-item'))
          .nativeElement as HTMLAnchorElement
      ).click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits closeMobile when the admin link is clicked', async () => {
      // Arrange
      const fixture = await createFixture({ isSuperAdmin: true });
      const spy = vi.fn();
      fixture.componentInstance.closeMobile.subscribe(spy);

      // Act
      (
        fixture.debugElement.query(By.css('.admin-nav-item')).nativeElement as HTMLAnchorElement
      ).click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits logout when the logout button is clicked', async () => {
      // Arrange
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.logout.subscribe(spy);

      // Act
      (
        fixture.debugElement.query(By.css('.sidebar-footer .nav-item'))
          .nativeElement as HTMLButtonElement
      ).click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
