import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, input, output, signal, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { vi, type Mock } from 'vitest';
import { Layout } from './layout';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { AuthService } from '../auth/auth.service';
import { OrganisationStateService } from './organisation-state.service';
import { ThemeService } from './theme.service';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SIDEBAR_KEY = 'signage_sidebar_collapsed';

// Stub children: keep the same selectors + the inputs/outputs the container binds.
@Component({ selector: 'app-sidebar', template: '' })
class StubSidebar {
  readonly collapsed = input.required<boolean>();
  readonly mobileOpen = input.required<boolean>();
  readonly navItems = input.required<unknown[]>();
  readonly isSuperAdmin = input.required<boolean>();
  readonly toggleCollapse = output<void>();
  readonly closeMobile = output<void>();
  readonly logout = output<void>();
}

@Component({ selector: 'app-topbar', template: '' })
class StubTopbar {
  readonly organisations = input.required<unknown[]>();
  readonly selectedOrgId = input.required<string | null>();
  readonly isSuperAdmin = input.required<boolean>();
  readonly isDark = input.required<boolean>();
  readonly openMobile = output<void>();
  readonly selectOrg = output<string>();
  readonly toggleTheme = output<void>();
}

interface OrgStateStub {
  organisations: ReturnType<typeof signal<unknown[]>>;
  selectedOrgId: ReturnType<typeof signal<string | null>>;
  isSuperAdmin: ReturnType<typeof signal<boolean>>;
  loadOrganisations: Mock;
  select: Mock;
}

interface ThemeStub {
  isDark: ReturnType<typeof signal<boolean>>;
  toggle: Mock;
}

interface AuthStub {
  logout: Mock;
}

interface SseStub {
  connect: Mock;
  disconnect: Mock;
}

interface RouterStub {
  navigate: Mock;
}

function createStubs(): {
  orgState: OrgStateStub;
  theme: ThemeStub;
  auth: AuthStub;
  sse: SseStub;
  router: RouterStub;
} {
  return {
    orgState: {
      organisations: signal<unknown[]>([
        { id: 'org-1', name: 'Org', timeZone: 'UTC', role: 'org_admin' },
      ]),
      selectedOrgId: signal<string | null>(null),
      isSuperAdmin: signal(false),
      loadOrganisations: vi.fn(),
      select: vi.fn(),
    },
    theme: { isDark: signal(true), toggle: vi.fn() },
    auth: { logout: vi.fn().mockResolvedValue(undefined) },
    sse: { connect: vi.fn(), disconnect: vi.fn() },
    router: { navigate: vi.fn() },
  };
}

async function createFixture(
  stubs: ReturnType<typeof createStubs>,
): Promise<ComponentFixture<Layout>> {
  await TestBed.configureTestingModule({
    imports: [Layout],
    providers: [
      provideZonelessChangeDetection(),
      { provide: OrganisationStateService, useValue: stubs.orgState },
      { provide: ThemeService, useValue: stubs.theme },
      { provide: AuthService, useValue: stubs.auth },
      { provide: DashboardSseService, useValue: stubs.sse },
      { provide: Router, useValue: stubs.router },
    ],
  })
    .overrideComponent(Layout, {
      remove: { imports: [AppSidebar, AppTopbar] },
      add: { imports: [StubSidebar, StubTopbar] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(Layout);
  fixture.detectChanges();
  return fixture;
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('loads organisations on init', async () => {
      // Arrange
      const stubs = createStubs();

      // Act
      await createFixture(stubs);

      // Assert
      expect(stubs.orgState.loadOrganisations).toHaveBeenCalledTimes(1);
    });

    it('starts expanded when nothing is stored', async () => {
      // Arrange
      const stubs = createStubs();

      // Act
      const fixture = await createFixture(stubs);

      // Assert
      expect(fixture.componentInstance.collapsed()).toBe(false);
    });

    it('starts collapsed when the stored flag is "true"', async () => {
      // Arrange
      localStorage.setItem(SIDEBAR_KEY, 'true');
      const stubs = createStubs();

      // Act
      const fixture = await createFixture(stubs);

      // Assert
      expect(fixture.componentInstance.collapsed()).toBe(true);
    });

    it('starts with the mobile drawer closed', async () => {
      // Arrange
      const stubs = createStubs();

      // Act
      const fixture = await createFixture(stubs);

      // Assert
      expect(fixture.componentInstance.mobileOpen()).toBe(false);
    });
  });

  describe('SSE connection effect', () => {
    it('does not connect while no organisation is selected', async () => {
      // Arrange
      const stubs = createStubs();

      // Act
      await createFixture(stubs);

      // Assert
      expect(stubs.sse.connect).not.toHaveBeenCalled();
    });

    it('connects once an organisation becomes selected', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);

      // Act
      stubs.orgState.selectedOrgId.set('org-1');
      fixture.detectChanges();

      // Assert
      expect(stubs.sse.connect).toHaveBeenCalled();
    });
  });

  describe('toggleCollapse', () => {
    it('flips the collapsed signal and persists "true"', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);

      // Act
      fixture.componentInstance.toggleCollapse();

      // Assert
      expect(fixture.componentInstance.collapsed()).toBe(true);
      expect(localStorage.getItem(SIDEBAR_KEY)).toBe('true');
    });

    it('flips back and persists "false" on a second call', async () => {
      // Arrange
      localStorage.setItem(SIDEBAR_KEY, 'true');
      const stubs = createStubs();
      const fixture = await createFixture(stubs);

      // Act
      fixture.componentInstance.toggleCollapse();

      // Assert
      expect(fixture.componentInstance.collapsed()).toBe(false);
      expect(localStorage.getItem(SIDEBAR_KEY)).toBe('false');
    });
  });

  describe('logout', () => {
    it('disconnects SSE, logs out and navigates to /login', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);

      // Act
      await fixture.componentInstance.logout();

      // Assert
      expect(stubs.sse.disconnect).toHaveBeenCalledTimes(1);
      expect(stubs.auth.logout).toHaveBeenCalledTimes(1);
      expect(stubs.router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('responsive resize handling', () => {
    it('closes the mobile drawer when the viewport grows past the mobile breakpoint', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      fixture.componentInstance.mobileOpen.set(true);
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);

      // Act
      fixture.componentInstance.onResize();

      // Assert
      expect(fixture.componentInstance.mobileOpen()).toBe(false);
    });

    it('keeps the mobile drawer open while the viewport stays small', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      fixture.componentInstance.mobileOpen.set(true);
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);

      // Act
      fixture.componentInstance.onResize();

      // Assert
      expect(fixture.componentInstance.mobileOpen()).toBe(true);
    });
  });

  describe('mobile overlay', () => {
    it('hides the overlay when the drawer is closed', async () => {
      // Arrange
      const stubs = createStubs();

      // Act
      const fixture = await createFixture(stubs);

      // Assert
      expect(fixture.debugElement.query(By.css('.overlay'))).toBeNull();
    });

    it('renders the overlay and closes the drawer when it is clicked', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      fixture.componentInstance.mobileOpen.set(true);
      fixture.detectChanges();

      // Act
      const overlay = fixture.debugElement.query(By.css('.overlay'));
      expect(overlay).not.toBeNull();
      (overlay.nativeElement as HTMLElement).click();
      fixture.detectChanges();

      // Assert
      expect(fixture.componentInstance.mobileOpen()).toBe(false);
    });
  });

  describe('child wiring', () => {
    it('passes container state down to the sidebar and top bar', async () => {
      // Arrange
      const stubs = createStubs();
      stubs.orgState.isSuperAdmin.set(true);

      // Act
      const fixture = await createFixture(stubs);
      const sidebar = fixture.debugElement.query(By.directive(StubSidebar))
        .componentInstance as StubSidebar;
      const topbar = fixture.debugElement.query(By.directive(StubTopbar))
        .componentInstance as StubTopbar;

      // Assert
      expect(sidebar.isSuperAdmin()).toBe(true);
      expect(sidebar.navItems().length).toBeGreaterThan(0);
      expect(topbar.isDark()).toBe(true);
      expect(topbar.isSuperAdmin()).toBe(true);
    });

    it('forwards sidebar toggleCollapse to the container handler', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      const sidebar = fixture.debugElement.query(By.directive(StubSidebar))
        .componentInstance as StubSidebar;

      // Act
      sidebar.toggleCollapse.emit();

      // Assert
      expect(fixture.componentInstance.collapsed()).toBe(true);
    });

    it('forwards sidebar logout to the container handler', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      const sidebar = fixture.debugElement.query(By.directive(StubSidebar))
        .componentInstance as StubSidebar;

      // Act
      sidebar.logout.emit();
      await fixture.whenStable();

      // Assert
      expect(stubs.auth.logout).toHaveBeenCalledTimes(1);
    });

    it('forwards topbar openMobile to open the drawer', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      const topbar = fixture.debugElement.query(By.directive(StubTopbar))
        .componentInstance as StubTopbar;

      // Act
      topbar.openMobile.emit();

      // Assert
      expect(fixture.componentInstance.mobileOpen()).toBe(true);
    });

    it('forwards topbar selectOrg to the org state service', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      const topbar = fixture.debugElement.query(By.directive(StubTopbar))
        .componentInstance as StubTopbar;

      // Act
      topbar.selectOrg.emit('org-2');

      // Assert
      expect(stubs.orgState.select).toHaveBeenCalledExactlyOnceWith('org-2');
    });

    it('forwards topbar toggleTheme to the theme service', async () => {
      // Arrange
      const stubs = createStubs();
      const fixture = await createFixture(stubs);
      const topbar = fixture.debugElement.query(By.directive(StubTopbar))
        .componentInstance as StubTopbar;

      // Act
      topbar.toggleTheme.emit();

      // Assert
      expect(stubs.theme.toggle).toHaveBeenCalledTimes(1);
    });
  });
});
