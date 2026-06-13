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

// Angular's HTML sanitizer strips <svg> from [innerHTML]; the SafeHtmlPipe
// bypasses that so the inline icon markup actually renders. Use real <svg>
// icons here to guard against that regression.
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: '<svg class="icon-dash"><rect x="0" y="0" width="4" height="4" /></svg>',
  },
  {
    label: 'Screens',
    route: '/screens',
    icon: '<svg class="icon-screens"><rect x="0" y="0" width="4" height="4" /></svg>',
  },
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
      // Wildcard route so clicking a RouterLink anchor resolves instead of
      // rejecting with NG04002 (unhandled) — the test only cares that the link
      // exists and emits, not where it lands.
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

      // Assert
      const links = fixture.debugElement.queryAll(By.css('.sidebar-nav .nav-item'));
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

    it('renders the icon markup and label when expanded', async () => {
      // Arrange + Act
      const fixture = await createFixture({ collapsed: false });

      // Assert
      const firstLink = fixture.debugElement.query(By.css('.sidebar-nav a.nav-item'));
      const icon = firstLink.query(By.css('.nav-icon')).nativeElement as HTMLElement;
      const label = firstLink.query(By.css('.nav-label')).nativeElement as HTMLElement;
      expect(icon.querySelector('svg.icon-dash')).not.toBeNull();
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

    it('reflects collapse state in the collapse-button aria-label', async () => {
      // Arrange
      const fixture = await createFixture({ collapsed: false });
      const button = fixture.debugElement.query(By.css('.collapse-btn'))
        .nativeElement as HTMLButtonElement;

      // Assert: expanded
      expect(button.getAttribute('aria-label')).toBe('Collapse sidebar');

      // Act: collapse
      fixture.componentRef.setInput('collapsed', true);
      fixture.detectChanges();

      // Assert: collapsed
      expect(button.getAttribute('aria-label')).toBe('Expand sidebar');
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
      const fixture = await createFixture();
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
