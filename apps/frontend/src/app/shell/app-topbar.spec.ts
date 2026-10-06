import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AppTopbar } from './app-topbar';
import { NotificationBell } from '../notifications/notification-bell';
import { GlobalSearch } from '../search/global-search';
import { OrgWithRole } from './organisation-state.service';
import { LanguageSwitcher } from './language-switcher';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

// Lightweight stubs so the topbar spec does not pull in the real notification /
// search dependency trees.
@Component({ selector: 'app-notification-bell', template: '' })
class StubNotificationBell {}

@Component({ selector: 'app-global-search', template: '' })
class StubGlobalSearch {}

@Component({ selector: 'app-language-switcher', template: '' })
class StubLanguageSwitcher {}

const ORGS: OrgWithRole[] = [
  { id: 'org-1', name: 'Venue One', timeZone: 'Europe/Vienna', role: 'org_admin' },
  { id: 'org-2', name: 'Venue Two', timeZone: 'Europe/Berlin', role: 'editor' },
];

async function createFixture(
  overrides: {
    organisations?: OrgWithRole[];
    selectedOrgId?: string | null;
    selectedOrg?: OrgWithRole | null;
    isSuperAdmin?: boolean;
    isDark?: boolean;
    userEmail?: string | null;
    avatarUrl?: string | null;
  } = {},
): Promise<ComponentFixture<AppTopbar>> {
  await TestBed.configureTestingModule({
    // Pin English so the existing English text assertions below hold.
    imports: [AppTopbar, getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [provideZonelessChangeDetection()],
  })
    .overrideComponent(AppTopbar, {
      remove: { imports: [NotificationBell, GlobalSearch, LanguageSwitcher] },
      add: { imports: [StubNotificationBell, StubGlobalSearch, StubLanguageSwitcher] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(AppTopbar);
  const orgs = overrides.organisations ?? ORGS;
  fixture.componentRef.setInput('organisations', orgs);
  fixture.componentRef.setInput(
    'selectedOrgId',
    overrides.selectedOrgId === undefined ? 'org-1' : overrides.selectedOrgId,
  );
  fixture.componentRef.setInput(
    'selectedOrg',
    overrides.selectedOrg === undefined ? (orgs[0] ?? null) : overrides.selectedOrg,
  );
  fixture.componentRef.setInput('isSuperAdmin', overrides.isSuperAdmin ?? false);
  fixture.componentRef.setInput('isDark', overrides.isDark ?? true);
  fixture.componentRef.setInput(
    'userEmail',
    overrides.userEmail === undefined ? 'user@example.com' : overrides.userEmail,
  );
  fixture.componentRef.setInput('avatarUrl', overrides.avatarUrl ?? null);
  fixture.detectChanges();
  return fixture;
}

describe('AppTopbar', () => {
  describe('organisation indicator', () => {
    it('shows the selected organisation name and role next to the avatar', async () => {
      // Arrange + Act
      const fixture = await createFixture({ selectedOrg: ORGS[1] });

      // Assert
      const name = fixture.debugElement.query(By.css('.org-info .org-name'))
        .nativeElement as HTMLElement;
      const role = fixture.debugElement.query(By.css('.org-info .org-role'))
        .nativeElement as HTMLElement;
      expect(name.textContent?.trim()).toBe('Venue Two');
      expect(role.textContent?.trim()).toBe('Editor');
    });

    it('hides the organisation indicator when the user belongs to no organisation', async () => {
      // Arrange + Act
      const fixture = await createFixture({ organisations: [], selectedOrg: null });

      // Assert
      expect(fixture.debugElement.query(By.css('.org-info'))).toBeNull();
    });

    it('does not render the legacy org select switcher', async () => {
      // Arrange + Act
      const fixture = await createFixture();

      // Assert
      expect(fixture.debugElement.query(By.css('select.org-select'))).toBeNull();
    });
  });

  describe('theme toggle', () => {
    it('shows the sun icon aria-label when in dark mode', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isDark: true });

      // Assert
      const button = fixture.debugElement
        .queryAll(By.css('.topbar-btn'))
        .find((el) =>
          (el.nativeElement as HTMLElement).getAttribute('aria-label')?.includes('mode'),
        );
      expect((button?.nativeElement as HTMLButtonElement).getAttribute('aria-label')).toBe(
        'Switch to light mode',
      );
    });

    it('shows the moon icon aria-label when in light mode', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isDark: false });

      // Assert
      const button = fixture.debugElement
        .queryAll(By.css('.topbar-btn'))
        .find((el) =>
          (el.nativeElement as HTMLElement).getAttribute('aria-label')?.includes('mode'),
        );
      expect((button?.nativeElement as HTMLButtonElement).getAttribute('aria-label')).toBe(
        'Switch to dark mode',
      );
    });

    it('emits toggleTheme when the theme button is clicked', async () => {
      // Arrange
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.toggleTheme.subscribe(spy);
      const button = fixture.debugElement
        .queryAll(By.css('.topbar-btn'))
        .find((el) =>
          (el.nativeElement as HTMLElement).getAttribute('aria-label')?.includes('mode'),
        );

      // Act
      (button?.nativeElement as HTMLButtonElement).click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('embedded child widgets', () => {
    it('renders the global search and notification bell', async () => {
      // Arrange + Act
      const fixture = await createFixture();

      // Assert
      expect(fixture.debugElement.query(By.directive(StubGlobalSearch))).not.toBeNull();
      expect(fixture.debugElement.query(By.directive(StubNotificationBell))).not.toBeNull();
    });
  });

  describe('super-admin avatar', () => {
    it('renders a plain avatar without the admin badge for regular users', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isSuperAdmin: false });

      // Assert
      const avatar = fixture.debugElement.query(By.css('.user-avatar'))
        .nativeElement as HTMLElement;
      const trigger = fixture.debugElement.query(By.css('.user-trigger'))
        .nativeElement as HTMLElement;
      expect(avatar.classList.contains('super-admin')).toBe(false);
      expect(trigger.getAttribute('aria-label')).toBe('Current user');
      expect(fixture.debugElement.query(By.css('.admin-badge'))).toBeNull();
    });

    it('marks the avatar and shows the admin badge for super admins', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isSuperAdmin: true });

      // Assert
      const avatar = fixture.debugElement.query(By.css('.user-avatar'))
        .nativeElement as HTMLElement;
      const trigger = fixture.debugElement.query(By.css('.user-trigger'))
        .nativeElement as HTMLElement;
      expect(avatar.classList.contains('super-admin')).toBe(true);
      expect(trigger.getAttribute('aria-label')).toBe('Instance Admin');
      expect(fixture.debugElement.query(By.css('.admin-badge'))).not.toBeNull();
    });
  });

  describe('gravatar avatar', () => {
    it('shows the placeholder icon when no avatar URL is provided', async () => {
      const fixture = await createFixture({ avatarUrl: null });

      // No img; the mns-icon placeholder renders
      expect(fixture.debugElement.query(By.css('.user-avatar img'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.user-avatar mns-icon'))).not.toBeNull();
    });

    it('renders the Gravatar image when an avatar URL is provided', async () => {
      const url = 'https://www.gravatar.com/avatar/abc?d=identicon&s=160';
      const fixture = await createFixture({ avatarUrl: url });

      const img = fixture.debugElement.query(By.css('.user-avatar img.avatar-img'))
        ?.nativeElement as HTMLImageElement | undefined;
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe(url);
    });

    it('falls back to the placeholder icon when the image fails to load', async () => {
      const fixture = await createFixture({
        avatarUrl: 'https://www.gravatar.com/avatar/abc?d=identicon&s=160',
      });

      const img = fixture.debugElement.query(By.css('.user-avatar img.avatar-img'))
        .nativeElement as HTMLImageElement;
      img.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(fixture.componentInstance.avatarFailed()).toBe(true);
      expect(fixture.debugElement.query(By.css('.user-avatar img'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.user-avatar mns-icon'))).not.toBeNull();
    });
  });

  describe('user menu', () => {
    function clickTrigger(fixture: ComponentFixture<AppTopbar>): void {
      (
        fixture.debugElement.query(By.css('.user-trigger')).nativeElement as HTMLButtonElement
      ).click();
      fixture.detectChanges();
    }

    it('is closed by default', async () => {
      const fixture = await createFixture();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
      expect(fixture.debugElement.query(By.css('.user-dropdown'))).toBeNull();
    });

    it('opens the dropdown and shows the email when the trigger is clicked', async () => {
      const fixture = await createFixture({ userEmail: 'jane@example.com' });

      clickTrigger(fixture);

      expect(fixture.componentInstance.menuOpen()).toBe(true);
      const email = fixture.debugElement.query(By.css('.user-email')).nativeElement as HTMLElement;
      expect(email.textContent?.trim()).toBe('jane@example.com');
    });

    it('shows the Instance Admin role for super admins', async () => {
      const fixture = await createFixture({ isSuperAdmin: true });
      clickTrigger(fixture);
      const role = fixture.debugElement.query(By.css('.user-role')).nativeElement as HTMLElement;
      expect(role.textContent?.trim()).toBe('Instance Admin');
    });

    it('falls back to "Signed in" when no email is known', async () => {
      const fixture = await createFixture({ userEmail: null });
      clickTrigger(fixture);
      const email = fixture.debugElement.query(By.css('.user-email')).nativeElement as HTMLElement;
      expect(email.textContent?.trim()).toBe('Signed in');
    });

    it('emits openProfile and closes the menu when Profile & settings is clicked', async () => {
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.openProfile.subscribe(spy);
      clickTrigger(fixture);

      const profile = fixture.debugElement
        .queryAll(By.css('.dropdown-item'))
        .find((el) => (el.nativeElement as HTMLElement).textContent?.includes('Profile'));
      (profile?.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('emits logout and closes the menu when Log out is clicked', async () => {
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.logout.subscribe(spy);
      clickTrigger(fixture);

      const logout = fixture.debugElement.query(By.css('.dropdown-item-danger'));
      (logout.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('closes the menu on a click outside', async () => {
      const fixture = await createFixture();
      clickTrigger(fixture);
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      document.body.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('closes the menu on Escape', async () => {
      const fixture = await createFixture();
      clickTrigger(fixture);
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      fixture.componentInstance.onEscape();
      fixture.detectChanges();

      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('shows the amber Instance Admin item for super admins and emits openInstanceAdmin', async () => {
      const fixture = await createFixture({ isSuperAdmin: true });
      const spy = vi.fn();
      fixture.componentInstance.openInstanceAdmin.subscribe(spy);
      clickTrigger(fixture);

      const adminItem = fixture.debugElement.query(By.css('.dropdown-item-admin'));
      expect(adminItem).not.toBeNull();
      (adminItem.nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('does not show the Instance Admin item for regular users', async () => {
      const fixture = await createFixture({ isSuperAdmin: false });
      clickTrigger(fixture);
      expect(fixture.debugElement.query(By.css('.dropdown-item-admin'))).toBeNull();
    });
  });

  describe('organisation switch entry', () => {
    function clickTrigger(fixture: ComponentFixture<AppTopbar>): void {
      (
        fixture.debugElement.query(By.css('.user-trigger')).nativeElement as HTMLButtonElement
      ).click();
      fixture.detectChanges();
    }

    function switchItem(fixture: ComponentFixture<AppTopbar>) {
      return fixture.debugElement.query(By.css('.dropdown-item-switch'));
    }

    it('shows the switch item when the user belongs to more than one organisation', async () => {
      const fixture = await createFixture({ organisations: ORGS });
      clickTrigger(fixture);
      expect(switchItem(fixture)).not.toBeNull();
    });

    it('hides the switch item when the user belongs to a single organisation', async () => {
      const fixture = await createFixture({ organisations: [ORGS[0]], selectedOrg: ORGS[0] });
      clickTrigger(fixture);
      expect(switchItem(fixture)).toBeNull();
    });

    it('hides the switch item when the user belongs to no organisation', async () => {
      const fixture = await createFixture({ organisations: [], selectedOrg: null });
      clickTrigger(fixture);
      expect(switchItem(fixture)).toBeNull();
    });

    it('emits openOrgSwitch and closes the menu when the switch item is clicked', async () => {
      const fixture = await createFixture({ organisations: ORGS });
      const spy = vi.fn();
      fixture.componentInstance.openOrgSwitch.subscribe(spy);
      clickTrigger(fixture);

      (switchItem(fixture).nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });
  });
});
