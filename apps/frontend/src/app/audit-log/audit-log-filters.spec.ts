import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuditLogFilters } from './audit-log-filters';
import { AUDIT_ACTIONS, RESOURCE_TYPES } from './audit-log.model';
import { Membership } from '../settings/users/member.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function makeMember(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'm1',
    userId: 'u1',
    organisationId: 'org1',
    role: 'org_admin',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    user: {
      id: 'u1',
      email: 'alice@example.com',
      name: 'Alice',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('AuditLogFilters', () => {
  let fixture: ComponentFixture<AuditLogFilters>;
  let component: AuditLogFilters;

  async function setUp(members: Membership[] = []): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        AuditLogFilters,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogFilters);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('auditActions', AUDIT_ACTIONS);
    fixture.componentRef.setInput('members', members);
    fixture.componentRef.setInput('resourceTypes', RESOURCE_TYPES);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('action select', () => {
    it('renders an "All actions" option plus one option per audit action with its label', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const options = fixture.debugElement.queryAll(By.css('#filterAction option'));
      expect(options.length).toBe(AUDIT_ACTIONS.length + 1);
      expect(options[0].nativeElement.textContent.trim()).toBe('All actions');
      // 'content.upload' -> 'Content uploaded'
      const uploadOption = options.find((o) => o.nativeElement.value === 'content.upload');
      expect(uploadOption?.nativeElement.textContent.trim()).toBe('Content uploaded');
    });

    it('falls back to the raw action key when no label is registered', async () => {
      // Arrange
      await setUp();

      // Act
      const label = (component as unknown as { actionLabel(a: string): string }).actionLabel(
        'unknown.action',
      );

      // Assert
      expect(label).toBe('unknown.action');
    });
  });

  describe('user select', () => {
    it('renders an option per member using name, falling back to email', async () => {
      // Arrange / Act
      await setUp([
        makeMember({ userId: 'u1', user: { ...makeMember().user, name: 'Alice' } }),
        makeMember({
          userId: 'u2',
          user: { ...makeMember().user, id: 'u2', name: null, email: 'bob@example.com' },
        }),
      ]);

      // Assert
      const options = fixture.debugElement.queryAll(By.css('#filterUser option'));
      expect(options.length).toBe(3);
      expect(options[0].nativeElement.textContent.trim()).toBe('All users');
      expect(options[1].nativeElement.textContent.trim()).toBe('Alice');
      expect(options[2].nativeElement.textContent.trim()).toBe('bob@example.com');
    });
  });

  describe('resource type select', () => {
    it('renders a title-cased option per resource type', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const options = fixture.debugElement.queryAll(By.css('#filterResource option'));
      expect(options.length).toBe(RESOURCE_TYPES.length + 1);
      expect(options[0].nativeElement.textContent.trim()).toBe('All types');
      // 'content' -> 'Content'
      expect(options[1].nativeElement.textContent.trim()).toBe('Content');
    });
  });

  describe('date inputs', () => {
    it('renders date-typed from and to inputs', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(fixture.debugElement.query(By.css('#filterFrom')).nativeElement.type).toBe('date');
      expect(fixture.debugElement.query(By.css('#filterTo')).nativeElement.type).toBe('date');
    });
  });

  describe('apply emits', () => {
    it('emits apply when the action model changes', async () => {
      // Arrange
      await setUp();
      const spy = vi.fn();
      component.apply.subscribe(spy);

      // Act
      const select = fixture.debugElement.query(By.css('#filterAction')).nativeElement;
      select.value = 'content.upload';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      // Assert
      expect(component.action()).toBe('content.upload');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits apply when the from date changes', async () => {
      // Arrange
      await setUp();
      const spy = vi.fn();
      component.apply.subscribe(spy);

      // Act
      const input = fixture.debugElement.query(By.css('#filterFrom')).nativeElement;
      input.value = '2026-01-01';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      // Assert
      expect(component.from()).toBe('2026-01-01');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear button', () => {
    it('is hidden when no filter is active', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(fixture.debugElement.query(By.css('.clear-btn'))).toBeNull();
    });

    it('appears once a filter value is set and emits clear on click', async () => {
      // Arrange
      await setUp();
      component.action.set('content.upload');
      fixture.componentRef.changeDetectorRef.detectChanges();
      const spy = vi.fn();
      component.clear.subscribe(spy);

      // Act
      const btn = fixture.debugElement.query(By.css('.clear-btn'));
      expect(btn).not.toBeNull();
      btn.nativeElement.click();

      // Assert
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasActiveFilters', () => {
    it('is false when all filter models are empty', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const hasActive = (
        component as unknown as { hasActiveFilters(): boolean }
      ).hasActiveFilters();
      expect(hasActive).toBe(false);
    });

    it('is true when any single filter model is set', async () => {
      // Arrange
      await setUp();

      // Act
      component.resourceType.set('screen');

      // Assert
      const hasActive = (
        component as unknown as { hasActiveFilters(): boolean }
      ).hasActiveFilters();
      expect(hasActive).toBe(true);
    });
  });
});
