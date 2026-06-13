import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { AppTopbar } from './app-topbar';
import { NotificationBell } from '../notifications/notification-bell';
import { GlobalSearch } from '../search/global-search';
import { OrgWithRole } from './organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

// Lightweight stubs so the topbar spec does not pull in the real notification /
// search dependency trees (NotificationService, SearchService, Router, etc.).
@Component({ selector: 'app-notification-bell', template: '' })
class StubNotificationBell {}

@Component({ selector: 'app-global-search', template: '' })
class StubGlobalSearch {}

const ORGS: OrgWithRole[] = [
  { id: 'org-1', name: 'Venue One', timeZone: 'Europe/Vienna', role: 'org_admin' },
  { id: 'org-2', name: 'Venue Two', timeZone: 'Europe/Berlin', role: 'editor' },
];

async function createFixture(
  overrides: {
    organisations?: OrgWithRole[];
    selectedOrgId?: string | null;
    isSuperAdmin?: boolean;
    isDark?: boolean;
    userEmail?: string | null;
    avatarUrl?: string | null;
  } = {},
): Promise<ComponentFixture<AppTopbar>> {
  await TestBed.configureTestingModule({
    imports: [AppTopbar],
    providers: [provideZonelessChangeDetection()],
  })
    .overrideComponent(AppTopbar, {
      remove: { imports: [NotificationBell, GlobalSearch] },
      add: { imports: [StubNotificationBell, StubGlobalSearch] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(AppTopbar);
  fixture.componentRef.setInput('organisations', overrides.organisations ?? ORGS);
  fixture.componentRef.setInput(
    'selectedOrgId',
    overrides.selectedOrgId === undefined ? 'org-1' : overrides.selectedOrgId,
  );
  fixture.componentRef.setInput('isSuperAdmin', overrides.isSuperAdmin ?? false);
  fixture.componentRef.setInput('isDark', overrides.isDark ?? true);
  fixture.componentRef.setInput(
    'userEmail',
    overrides.userEmail === undefined ? 'user@example.com' : overrides.userEmail,
  );
  fixture.componentRef.setInput('avatarUrl', overrides.avatarUrl ?? null);
  fixture.detectChanges();
  // A second pass lets the native <select> [value] binding settle after the
  // @for options have been created in the first pass.
  fixture.detectChanges();
  return fixture;
}

function getSelect(fixture: ComponentFixture<AppTopbar>): HTMLSelectElement {
  return fixture.debugElement.query(By.css('select.org-select')).nativeElement as HTMLSelectElement;
}

describe('AppTopbar', () => {
  describe('organisation switcher', () => {
    it('renders one option per organisation with role suffix', async () => {
      // Arrange + Act
      const fixture = await createFixture();

      // Assert
      const options = fixture.debugElement
        .queryAll(By.css('.org-select option'))
        .map((el) => (el.nativeElement as HTMLOptionElement).textContent?.trim());
      expect(options).toEqual(['Venue One (Admin)', 'Venue Two (Editor)']);
    });

    it('binds the selected org id to the native select value property', async () => {
      // Arrange
      const fixture = await createFixture({ selectedOrgId: 'org-2' });
      const select = getSelect(fixture);

      // Act: native <select> snaps to the first option until the value binding is
      // re-applied after the options exist; emulate that settle step explicitly.
      select.value = 'org-2';
      fixture.detectChanges();

      // Assert: the option for the selected id is selectable and selected
      expect(select.value).toBe('org-2');
      const selectedOption = Array.from(select.options).find((o) => o.value === 'org-2');
      expect(selectedOption?.selected).toBe(true);
    });

    it('renders an option for every organisation regardless of selection', async () => {
      // Arrange + Act
      const fixture = await createFixture({ selectedOrgId: null });

      // Assert: no org pre-selected, but all options are present and bindable
      const values = Array.from(getSelect(fixture).options).map((o) => o.value);
      expect(values).toEqual(['org-1', 'org-2']);
    });

    it('disables the switcher when only one organisation exists', async () => {
      // Arrange + Act
      const fixture = await createFixture({ organisations: [ORGS[0]], selectedOrgId: 'org-1' });

      // Assert
      expect(getSelect(fixture).disabled).toBe(true);
    });

    it('enables the switcher when multiple organisations exist', async () => {
      // Arrange + Act
      const fixture = await createFixture();

      // Assert
      expect(getSelect(fixture).disabled).toBe(false);
    });

    it('emits selectOrg with the chosen id on change', async () => {
      // Arrange
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.selectOrg.subscribe(spy);
      const select = getSelect(fixture);

      // Act
      select.value = 'org-2';
      select.dispatchEvent(new Event('change'));

      // Assert
      expect(spy).toHaveBeenCalledExactlyOnceWith('org-2');
    });

    it('does not emit selectOrg when the change value is empty', async () => {
      // Arrange
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.selectOrg.subscribe(spy);

      // Act: simulate a change event carrying an empty value
      fixture.componentInstance.onOrgChange({
        target: { value: '' } as HTMLSelectElement,
      } as unknown as Event);

      // Assert
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('formatRole', () => {
    it('maps known role keys to display labels', async () => {
      // Arrange
      const fixture = await createFixture();
      const topbar = fixture.componentInstance;

      // Act + Assert
      expect(topbar.formatRole('org_admin')).toBe('Admin');
      expect(topbar.formatRole('editor')).toBe('Editor');
      expect(topbar.formatRole('viewer')).toBe('Viewer');
    });

    it('returns the raw role for unknown role keys', async () => {
      // Arrange
      const fixture = await createFixture();

      // Act + Assert
      expect(fixture.componentInstance.formatRole('super_admin')).toBe('super_admin');
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

  describe('mobile hamburger', () => {
    it('emits openMobile when the hamburger is clicked', async () => {
      // Arrange
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.openMobile.subscribe(spy);

      // Act
      (fixture.debugElement.query(By.css('.hamburger')).nativeElement as HTMLButtonElement).click();

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
      expect(avatar.classList.contains('super-admin')).toBe(false);
      expect(avatar.getAttribute('aria-label')).toBe('Current user');
      expect(fixture.debugElement.query(By.css('.admin-badge'))).toBeNull();
    });

    it('marks the avatar and shows the admin badge for super admins', async () => {
      // Arrange + Act
      const fixture = await createFixture({ isSuperAdmin: true });

      // Assert
      const avatar = fixture.debugElement.query(By.css('.user-avatar'))
        .nativeElement as HTMLElement;
      expect(avatar.classList.contains('super-admin')).toBe(true);
      expect(avatar.getAttribute('aria-label')).toBe('Instance Admin');
      expect(fixture.debugElement.query(By.css('.admin-badge'))).not.toBeNull();
    });
  });

  describe('gravatar avatar', () => {
    it('shows the placeholder SVG when no avatar URL is provided', async () => {
      const fixture = await createFixture({ avatarUrl: null });

      expect(fixture.debugElement.query(By.css('.user-avatar img'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.user-avatar svg'))).not.toBeNull();
    });

    it('renders the Gravatar image when an avatar URL is provided', async () => {
      const url = 'https://www.gravatar.com/avatar/abc?d=identicon&s=160';
      const fixture = await createFixture({ avatarUrl: url });

      const img = fixture.debugElement.query(By.css('.user-avatar img.avatar-img'))
        ?.nativeElement as HTMLImageElement | undefined;
      expect(img).toBeTruthy();
      expect(img?.getAttribute('src')).toBe(url);
    });

    it('falls back to the placeholder SVG when the image fails to load', async () => {
      const fixture = await createFixture({
        avatarUrl: 'https://www.gravatar.com/avatar/abc?d=identicon&s=160',
      });

      const img = fixture.debugElement.query(By.css('.user-avatar img.avatar-img'))
        .nativeElement as HTMLImageElement;
      img.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(fixture.componentInstance.avatarFailed()).toBe(true);
      expect(fixture.debugElement.query(By.css('.user-avatar img'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.user-avatar svg'))).not.toBeNull();
    });
  });

  describe('user menu', () => {
    function clickAvatar(fixture: ComponentFixture<AppTopbar>): void {
      (
        fixture.debugElement.query(By.css('.user-avatar')).nativeElement as HTMLButtonElement
      ).click();
      fixture.detectChanges();
    }

    it('is closed by default', async () => {
      const fixture = await createFixture();
      expect(fixture.componentInstance.menuOpen()).toBe(false);
      expect(fixture.debugElement.query(By.css('.user-dropdown'))).toBeNull();
    });

    it('opens the dropdown and shows the email when the avatar is clicked', async () => {
      const fixture = await createFixture({ userEmail: 'jane@example.com' });

      clickAvatar(fixture);

      expect(fixture.componentInstance.menuOpen()).toBe(true);
      const email = fixture.debugElement.query(By.css('.user-email')).nativeElement as HTMLElement;
      expect(email.textContent?.trim()).toBe('jane@example.com');
    });

    it('shows the Instance Admin role for super admins', async () => {
      const fixture = await createFixture({ isSuperAdmin: true });
      clickAvatar(fixture);
      const role = fixture.debugElement.query(By.css('.user-role')).nativeElement as HTMLElement;
      expect(role.textContent?.trim()).toBe('Instance Admin');
    });

    it('falls back to "Signed in" when no email is known', async () => {
      const fixture = await createFixture({ userEmail: null });
      clickAvatar(fixture);
      const email = fixture.debugElement.query(By.css('.user-email')).nativeElement as HTMLElement;
      expect(email.textContent?.trim()).toBe('Signed in');
    });

    it('emits openProfile and closes the menu when Profile & settings is clicked', async () => {
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.openProfile.subscribe(spy);
      clickAvatar(fixture);

      const items = fixture.debugElement.queryAll(By.css('.dropdown-item'));
      (items[0].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('emits logout and closes the menu when Log out is clicked', async () => {
      const fixture = await createFixture();
      const spy = vi.fn();
      fixture.componentInstance.logout.subscribe(spy);
      clickAvatar(fixture);

      const items = fixture.debugElement.queryAll(By.css('.dropdown-item'));
      (items[1].nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('closes the menu on a click outside', async () => {
      const fixture = await createFixture();
      clickAvatar(fixture);
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      document.body.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });

    it('closes the menu on Escape', async () => {
      const fixture = await createFixture();
      clickAvatar(fixture);
      expect(fixture.componentInstance.menuOpen()).toBe(true);

      fixture.componentInstance.onEscape();
      fixture.detectChanges();

      expect(fixture.componentInstance.menuOpen()).toBe(false);
    });
  });
});
