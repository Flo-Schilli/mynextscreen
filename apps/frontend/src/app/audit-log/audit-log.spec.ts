import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuditLog } from './audit-log';
import { AuditLogTable } from './audit-log-table';
import { AuditLogFilters } from './audit-log-filters';
import { AuditLogService } from './audit-log.service';
import { MemberService } from '../settings/users/member.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import {
  AuditEntry,
  AuditLogResponse,
  AuditLogFilters as AuditLogFilterParams,
} from './audit-log.model';
import { Membership } from '../settings/users/member.model';
import { OrgWithRole } from '../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function org(role: string): OrgWithRole {
  return { id: ORG_ID, name: 'Acme', timeZone: 'UTC', role };
}

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'a1',
    timestamp: '2026-01-01T12:00:00.000Z',
    userId: 'u1',
    organisationId: ORG_ID,
    action: 'content.upload',
    resourceType: 'content',
    resourceId: 'c1',
    details: { name: 'clip.mp4' },
    ...overrides,
  };
}

function makeResponse(entries: AuditEntry[], total?: number): AuditLogResponse {
  return { data: entries, total: total ?? entries.length };
}

function makeMember(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'm1',
    userId: 'u1',
    organisationId: ORG_ID,
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

interface HttpLikeError {
  status?: number;
}
const httpError = (status: number): HttpLikeError => ({ status });

class AuditLogServiceStub {
  result: Observable<AuditLogResponse> = of(makeResponse([]));
  calls: { orgId: string; filters: AuditLogFilterParams }[] = [];

  getAuditLog(orgId: string, filters: AuditLogFilterParams): Observable<AuditLogResponse> {
    this.calls.push({ orgId, filters });
    return this.result;
  }
}

class MemberServiceStub {
  members: Membership[] = [makeMember()];
  listMembers(): Observable<Membership[]> {
    return of(this.members);
  }
}

describe('AuditLog (smart container)', () => {
  let fixture: ComponentFixture<AuditLog>;
  let component: AuditLog;
  let auditService: AuditLogServiceStub;
  let memberService: MemberServiceStub;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let selectedOrg: OrgWithRole | null;

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(AuditLog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentRef.changeDetectorRef.detectChanges();
  }

  /**
   * Settle the synchronous `of(...)` callbacks a mutating method triggers, then
   * render twice so the re-materialised `@if`/table view is checked cleanly
   * (no NG0100 against the just-updated entries list).
   */
  async function render(): Promise<void> {
    for (let i = 0; i < 6; i++) await Promise.resolve();
    fixture.componentRef.changeDetectorRef.detectChanges();
    fixture.componentRef.changeDetectorRef.detectChanges();
  }

  beforeEach(() => {
    auditService = new AuditLogServiceStub();
    memberService = new MemberServiceStub();
    navigateSpy = vi.fn().mockResolvedValue(true);
    selectedOrg = org('org_admin');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuditLogService, useValue: auditService },
        { provide: MemberService, useValue: memberService },
        { provide: OrganisationStateService, useValue: { selectedOrg: () => selectedOrg } },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
  });

  describe('access gate', () => {
    it('reports an error when no organisation is selected', async () => {
      // Arrange
      selectedOrg = null;

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toBe('No organisation selected.');
      expect(component.loading).toBe(false);
      expect(auditService.calls.length).toBe(0);
    });

    it('denies access and renders the error when the role is not org_admin', async () => {
      // Arrange
      selectedOrg = org('editor');

      // Act
      await setUp();

      // Assert
      expect(component.isOrgAdmin).toBe(false);
      expect(component.loading).toBe(false);
      expect(auditService.calls.length).toBe(0);
      expect(fixture.debugElement.query(By.css('.error')).nativeElement.textContent).toContain(
        'Access denied',
      );
      expect(fixture.debugElement.query(By.directive(AuditLogFilters))).toBeNull();
    });

    it('admits an org_admin, loads members into the user map and renders filters', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(component.isOrgAdmin).toBe(true);
      expect(component.members.length).toBe(1);
      expect(component.userMap.get('u1')).toBe('Alice');
      expect(fixture.debugElement.query(By.directive(AuditLogFilters))).not.toBeNull();
    });
  });

  describe('initial load', () => {
    it('requests the first page with limit 50 / offset 0', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const entryCall = auditService.calls.find((c) => c.filters.offset === 0);
      expect(entryCall?.orgId).toBe(ORG_ID);
      expect(entryCall?.filters.limit).toBe(50);
      expect(entryCall?.filters.offset).toBe(0);
    });

    it('renders the empty state when there are no entries', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(fixture.debugElement.query(By.css('.empty-text')).nativeElement.textContent).toContain(
        'No audit log entries found',
      );
      expect(fixture.debugElement.query(By.directive(AuditLogTable))).toBeNull();
    });

    it('renders the table when entries exist', async () => {
      // Arrange
      auditService.result = of(makeResponse([makeEntry()], 1));

      // Act
      await setUp();

      // Assert
      expect(component.entries.length).toBe(1);
      expect(component.total).toBe(1);
      expect(fixture.debugElement.query(By.directive(AuditLogTable))).not.toBeNull();
    });

    it('maps a 403 to an access-denied error', async () => {
      // Arrange
      auditService.result = throwError(() => httpError(403));

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toContain('Access denied');
      expect(component.loading).toBe(false);
    });

    it('maps other errors to a generic load failure', async () => {
      // Arrange
      auditService.result = throwError(() => httpError(500));

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toBe('Failed to load audit log.');
      expect(component.loading).toBe(false);
    });
  });

  describe('buildFilters', () => {
    it('omits empty filter values', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      const filters = auditService.calls[0].filters;
      expect(filters.action).toBeUndefined();
      expect(filters.userId).toBeUndefined();
      expect(filters.resourceType).toBeUndefined();
      expect(filters.from).toBeUndefined();
      expect(filters.to).toBeUndefined();
    });

    it('includes set action/user/resource filters and ISO date range', async () => {
      // Arrange
      await setUp();
      auditService.calls = [];
      component.filterAction = 'content.upload';
      component.filterUserId = 'u9';
      component.filterResourceType = 'screen';
      component.filterFrom = '2026-01-01';
      component.filterTo = '2026-01-31';

      // Act
      component.applyFilters();

      // Assert
      const filters = auditService.calls[0].filters;
      expect(filters.action).toBe('content.upload');
      expect(filters.userId).toBe('u9');
      expect(filters.resourceType).toBe('screen');
      expect(filters.from).toBe(new Date('2026-01-01').toISOString());
      // `to` is pushed to the end of the day
      const expectedTo = new Date('2026-01-31');
      expectedTo.setHours(23, 59, 59, 999);
      expect(filters.to).toBe(expectedTo.toISOString());
    });
  });

  describe('pagination', () => {
    it('appends the next page and offsets by the current entry count', async () => {
      // Arrange
      auditService.result = of(makeResponse([makeEntry({ id: 'a1' })], 3));
      await setUp();
      auditService.calls = [];
      auditService.result = of(makeResponse([makeEntry({ id: 'a2' })], 3));

      // Act
      component.loadMore();
      await render();

      // Assert
      expect(auditService.calls[0].filters.offset).toBe(1);
      expect(component.entries.map((e) => e.id)).toEqual(['a1', 'a2']);
      expect(component.loading).toBe(false);
    });

    it('exposes hasMore while loaded entries are fewer than total', async () => {
      // Arrange
      auditService.result = of(makeResponse([makeEntry()], 5));

      // Act
      await setUp();

      // Assert
      expect(component.hasMore).toBe(true);
    });

    it('reports a dedicated error when loading more fails', async () => {
      // Arrange
      auditService.result = of(makeResponse([makeEntry()], 3));
      await setUp();
      auditService.result = throwError(() => httpError(500));

      // Act
      component.loadMore();
      await render();

      // Assert
      expect(component.loadError).toBe('Failed to load more entries.');
      expect(component.loading).toBe(false);
    });
  });

  describe('applyFilters / clearFilters', () => {
    it('resets entries and total then reloads on applyFilters', async () => {
      // Arrange
      auditService.result = of(makeResponse([makeEntry()], 1));
      await setUp();
      auditService.calls = [];
      auditService.result = of(makeResponse([makeEntry({ id: 'b' })], 1));

      // Act
      component.applyFilters();
      await render();

      // Assert
      expect(auditService.calls[0].filters.offset).toBe(0);
      expect(component.entries.map((e) => e.id)).toEqual(['b']);
    });

    it('clears every filter field and reloads', async () => {
      // Arrange
      await setUp();
      component.filterAction = 'content.upload';
      component.filterUserId = 'u9';
      component.filterResourceType = 'screen';
      component.filterFrom = '2026-01-01';
      component.filterTo = '2026-01-31';
      auditService.calls = [];

      // Act
      component.clearFilters();
      await fixture.whenStable();

      // Assert
      expect(component.filterAction).toBe('');
      expect(component.filterUserId).toBe('');
      expect(component.filterResourceType).toBe('');
      expect(component.filterFrom).toBe('');
      expect(component.filterTo).toBe('');
      expect(auditService.calls[0].filters.action).toBeUndefined();
    });
  });

  describe('navigateToResource', () => {
    it('navigates to the mapped route for a known resource type', async () => {
      // Arrange
      await setUp();

      // Act
      component.navigateToResource('playlist', 'p1');

      // Assert
      expect(navigateSpy).toHaveBeenCalledWith(['/playlists']);
    });

    it('maps each known resource type to its route', async () => {
      // Arrange
      await setUp();
      const cases: [string, string][] = [
        ['content', '/content'],
        ['screen', '/screens'],
        ['schedule', '/schedules'],
        ['user', '/settings/users'],
        ['organisation', '/admin/organisations'],
      ];

      // Act / Assert
      for (const [type, route] of cases) {
        navigateSpy.mockClear();
        component.navigateToResource(type, 'x');
        expect(navigateSpy).toHaveBeenCalledWith([route]);
      }
    });

    it('does nothing when the resourceId is null', async () => {
      // Arrange
      await setUp();

      // Act
      component.navigateToResource('content', null);

      // Assert
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('does not navigate for an unknown resource type', async () => {
      // Arrange
      await setUp();

      // Act
      component.navigateToResource('mystery', 'x');

      // Assert
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
