import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { from, of, throwError, Observable, Subject } from 'rxjs';
import { Screens } from './screens';
import { Screen, ScreenWithApiKey } from './screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { DashboardSseService, DashboardEvent } from '../dashboard/dashboard-sse.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 'screen-1',
    organisationId: ORG_ID,
    name: 'Lobby TV',
    resolution: '1920x1080',
    location: 'Lobby',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeMembership(role: MyMembership['role'], orgId = ORG_ID): MyMembership {
  return {
    id: `m-${orgId}-${role}`,
    userId: 'u1',
    organisationId: orgId,
    role,
    createdAt: '2026-06-01T00:00:00Z',
  };
}

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: ORG_ID,
    name: 'Wall',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    screens: [],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

// Zoneless: no auto-tick. Drain the microtask queue (firstValueFrom/promise
// chains) then let the stabilization barrier run change detection. We avoid a
// trailing manual detectChanges() because pairing it with whenStable() in the
// same synchronous turn trips the dev-mode NG0100 verify pass when an async
// microtask mutated state in between.
// Drains the microtask queue without rendering — used to let a resolved
// confirm-promise continuation (firstValueFrom) issue its HTTP request before
// we assert on it, without consuming the request via change detection.
async function microtasks(): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

async function flush(f: ComponentFixture<Screens>): Promise<void> {
  // The container holds state in plain fields (not signals), so an HTTP/promise
  // resolution does not mark it dirty under zoneless CD. Drain the microtask
  // queue (promise/firstValueFrom chains) first so all field mutations have
  // landed, then render once. Rendering after the queue is empty keeps the
  // dev-mode check-no-changes verify pass stable (no mid-pass mutation).
  for (let i = 0; i < 6; i++) await Promise.resolve();
  // The container mutates plain fields imperatively, so it is never marked dirty
  // under zoneless CD; mark it explicitly so the render actually runs.
  f.componentRef.changeDetectorRef.markForCheck();
  // detectChanges(false) skips the dev-mode check-no-changes verify pass, which
  // otherwise flags a template method binding (bulkDeleteMessage()) returning a
  // fresh string each pass as an NG0100.
  f.detectChanges(false);
}

describe('Screens', () => {
  let fixture: ComponentFixture<Screens>;
  let component: Screens;
  let httpMock: HttpTestingController;

  let memberStub: { getMyMemberships: ReturnType<typeof vi.fn> };
  let groupStub: { getAll: ReturnType<typeof vi.fn> };
  let routerStub: { navigate: ReturnType<typeof vi.fn> };
  let screenOnline$: Subject<DashboardEvent>;
  let screenOffline$: Subject<DashboardEvent>;

  function configure(memberships: MyMembership[]): void {
    // Resolve memberships on a microtask so the subscription callback (which
    // mutates orgId/loading) never runs during the initial detectChanges pass,
    // which would otherwise trip NG0100 under zoneless dev-mode checks.
    memberStub = {
      getMyMemberships: vi.fn().mockReturnValue(from(Promise.resolve(memberships))),
    };
    groupStub = { getAll: vi.fn().mockReturnValue(of<ScreenGroup[]>([])) };
    routerStub = { navigate: vi.fn() };
    screenOnline$ = new Subject<DashboardEvent>();
    screenOffline$ = new Subject<DashboardEvent>();
    const sseStub = { screenOnline$, screenOffline$ };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MemberService, useValue: memberStub },
        { provide: ScreenGroupService, useValue: groupStub },
        { provide: DashboardSseService, useValue: sseStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
  }

  // Creates the component and resolves the initial GET /api/screens load.
  async function createAndLoad(screens: Screen[]): Promise<void> {
    fixture = TestBed.createComponent(Screens);
    component = fixture.componentInstance;
    fixture.detectChanges(false); // run ngOnInit
    await flush(fixture); // resolve memberships -> initial getAll
    const req = httpMock.expectOne('/api/screens');
    req.flush(screens);
    await flush(fixture);
  }

  afterEach(() => httpMock.verify());

  describe('organisation context loading', () => {
    it('prefers the org_admin membership when picking the active org', async () => {
      configure([makeMembership('viewer', 'org-x'), makeMembership('org_admin', 'org-admin-id')]);
      fixture = TestBed.createComponent(Screens);
      component = fixture.componentInstance;
      fixture.detectChanges(false); // run ngOnInit
      await flush(fixture);

      const req = httpMock.expectOne('/api/screens');
      expect(req.request.headers.get('X-Organisation-Id')).toBe('org-admin-id');
      req.flush([]);
      await flush(fixture);

      expect(component.orgId).toBe('org-admin-id');
    });

    it('falls back to the first membership when there is no org_admin role', async () => {
      configure([makeMembership('viewer', 'org-viewer')]);
      fixture = TestBed.createComponent(Screens);
      component = fixture.componentInstance;
      fixture.detectChanges(false); // run ngOnInit
      await flush(fixture);

      const req = httpMock.expectOne('/api/screens');
      req.flush([]);
      await flush(fixture);

      expect(component.orgId).toBe('org-viewer');
    });

    it('shows an error and stops loading when the user has no memberships', async () => {
      configure([]);
      fixture = TestBed.createComponent(Screens);
      component = fixture.componentInstance;
      fixture.detectChanges(false); // run ngOnInit
      await flush(fixture);

      expect(component.loading).toBe(false);
      expect(component.loadError).toBe('You are not a member of any organisation.');
      httpMock.expectNone('/api/screens');
    });

    it('shows an error when membership loading fails', async () => {
      configure([]);
      // Errors on a microtask (mirrors a deferred HTTP failure) without a raw
      // rejected Promise, which would surface as an unhandled rejection.
      memberStub.getMyMemberships.mockReturnValue(
        new Observable((sub) => {
          queueMicrotask(() => sub.error(new Error('boom')));
        }),
      );
      fixture = TestBed.createComponent(Screens);
      component = fixture.componentInstance;
      fixture.detectChanges(false); // run ngOnInit
      await flush(fixture);

      expect(component.loadError).toBe('Failed to load organisation context.');
      expect(component.loading).toBe(false);
    });
  });

  describe('screen loading', () => {
    it('renders the grid and an empty toolbar once screens are loaded', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen(), makeScreen({ id: 'screen-2', name: 'Bar TV' })]);

      expect(component.loading).toBe(false);
      expect(component.screens.length).toBe(2);
      expect(component.screenIds).toEqual(['screen-1', 'screen-2']);
      expect(fixture.debugElement.query(By.css('app-screen-grid'))).toBeTruthy();
    });

    it('renders the empty state when there are no screens', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);

      expect(fixture.debugElement.query(By.css('.empty-state'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('app-screen-grid'))).toBeNull();
    });

    it('maps a 403 to an access-denied error', async () => {
      configure([makeMembership('org_admin')]);
      fixture = TestBed.createComponent(Screens);
      component = fixture.componentInstance;
      fixture.detectChanges(false); // run ngOnInit
      await flush(fixture);
      httpMock.expectOne('/api/screens').flush('no', { status: 403, statusText: 'Forbidden' });
      await flush(fixture);

      expect(component.loadError).toBe('Access denied.');
    });

    it('maps a non-403 failure to a generic error', async () => {
      configure([makeMembership('org_admin')]);
      fixture = TestBed.createComponent(Screens);
      component = fixture.componentInstance;
      fixture.detectChanges(false); // run ngOnInit
      await flush(fixture);
      httpMock.expectOne('/api/screens').flush('err', { status: 500, statusText: 'Error' });
      await flush(fixture);

      expect(component.loadError).toBe('Failed to load screens.');
    });
  });

  describe('SSE status updates', () => {
    it('flips a screen to online when a screenOnline event arrives', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1', isOnline: false })]);

      screenOnline$.next({
        type: 'screen.online',
        data: { screenId: 'screen-1' },
        timestamp: 'now',
      });
      await flush(fixture);

      expect(component.screens[0].isOnline).toBe(true);
    });

    it('flips a screen to offline and updates the open detail view', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1', isOnline: true })]);
      component.selectScreen(component.screens[0]);
      await flush(fixture);

      screenOffline$.next({
        type: 'screen.offline',
        data: { screenId: 'screen-1' },
        timestamp: 'now',
      });
      await flush(fixture);

      expect(component.screens[0].isOnline).toBe(false);
      expect(component.selectedScreen?.isOnline).toBe(false);
    });
  });

  describe('create flow', () => {
    it('opens the api-key modal and reloads after a successful create', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);

      component.openCreateForm();
      await flush(fixture);
      expect(fixture.debugElement.query(By.css('app-screen-create-form'))).toBeTruthy();

      component.submitCreate({ name: 'New', resolution: '1920x1080', location: 'Hall' });
      const created: ScreenWithApiKey = { screen: makeScreen({ name: 'New' }), apiKey: 'KEY-123' };
      httpMock.expectOne('/api/screens').flush(created);
      await flush(fixture);

      expect(component.showCreateForm).toBe(false);
      expect(component.creating).toBe(false);
      expect(component.displayedApiKey).toBe('KEY-123');
      expect(component.showApiKeyModal).toBe(true);
      expect(fixture.debugElement.query(By.css('app-screen-api-key-modal'))).toBeTruthy();

      httpMock.expectOne('/api/screens').flush([makeScreen({ name: 'New' })]); // reload
      await flush(fixture);
    });

    it('surfaces the server error message on a failed create', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);

      component.submitCreate({ name: 'New', resolution: '1920x1080', location: 'Hall' });
      httpMock
        .expectOne('/api/screens')
        .flush({ message: 'Duplicate name' }, { status: 400, statusText: 'Bad Request' });
      await flush(fixture);

      expect(component.createError).toBe('Duplicate name');
      expect(component.creating).toBe(false);
      expect(component.showApiKeyModal).toBe(false);
    });

    it('closing the api-key modal clears the displayed key', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);
      component.displayedApiKey = 'KEY';
      component.showApiKeyModal = true;

      component.closeApiKeyModal();

      expect(component.showApiKeyModal).toBe(false);
      expect(component.displayedApiKey).toBe('');
    });
  });

  describe('edit flow', () => {
    it('PATCHes the screen and reloads on a successful edit', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);
      component.startEdit();
      await flush(fixture);

      component.submitEdit({ name: 'Renamed' });
      const req = httpMock.expectOne('/api/screens/screen-1');
      expect(req.request.method).toBe('PATCH');
      req.flush(makeScreen({ name: 'Renamed' }));
      await flush(fixture);

      expect(component.editingScreen).toBe(false);
      expect(component.selectedScreen?.name).toBe('Renamed');
      httpMock.expectOne('/api/screens').flush([makeScreen({ name: 'Renamed' })]); // reload
      await flush(fixture);
    });

    it('does nothing when submitEdit is called without a selected screen', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);

      component.selectedScreen = null;
      component.submitEdit({ name: 'X' });

      httpMock.expectNone('/api/screens/screen-1');
      expect(component.saving).toBe(false);
    });

    it('surfaces the server error message on a failed edit', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);

      component.submitEdit({ name: 'Bad' });
      httpMock
        .expectOne('/api/screens/screen-1')
        .flush({ message: 'Invalid' }, { status: 422, statusText: 'Unprocessable' });
      await flush(fixture);

      expect(component.editError).toBe('Invalid');
      expect(component.saving).toBe(false);
    });
  });

  describe('regenerate api-key flow', () => {
    it('replaces the key and shows the api-key modal on success', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);
      component.confirmRegenerate();
      expect(component.showRegenerateConfirm).toBe(true);

      component.executeRegenerate();
      const req = httpMock.expectOne('/api/screens/screen-1/regenerate-key');
      expect(req.request.method).toBe('POST');
      const result: ScreenWithApiKey = { screen: makeScreen(), apiKey: 'FRESH-KEY' };
      req.flush(result);
      await flush(fixture);

      expect(component.regenerating).toBe(false);
      expect(component.showRegenerateConfirm).toBe(false);
      expect(component.displayedApiKey).toBe('FRESH-KEY');
      expect(component.showApiKeyModal).toBe(true);
    });

    it('surfaces an error and closes the confirm dialog on failure', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);
      component.confirmRegenerate();

      component.executeRegenerate();
      httpMock
        .expectOne('/api/screens/screen-1/regenerate-key')
        .flush({ message: 'Nope' }, { status: 500, statusText: 'Error' });
      await flush(fixture);

      expect(component.actionError).toBe('Nope');
      expect(component.regenerating).toBe(false);
      expect(component.showRegenerateConfirm).toBe(false);
    });

    it('cancelRegenerate closes the confirm dialog without a request', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.confirmRegenerate();

      component.cancelRegenerate();

      expect(component.showRegenerateConfirm).toBe(false);
      httpMock.expectNone('/api/screens/screen-1/regenerate-key');
    });

    it('executeRegenerate is a no-op without a selected screen', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectedScreen = null;

      component.executeRegenerate();

      httpMock.expectNone('/api/screens/screen-1/regenerate-key');
    });
  });

  describe('bulk delete flow', () => {
    it('confirms, deletes the selected screens and reloads', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' }), makeScreen({ id: 'screen-2' })]);
      component.selectionService.selectAll(['screen-1', 'screen-2']);

      const promise = component.handleBulkDelete();
      await flush(fixture);
      expect(component.showBulkDeleteConfirm).toBe(true);

      component.onBulkDeleteConfirmed(true);
      await microtasks();
      const req = httpMock.expectOne('/api/screens/bulk-delete');
      expect(req.request.body).toEqual({ ids: ['screen-1', 'screen-2'] });
      req.flush({ deleted: 2, notFound: [] });
      await promise;
      await flush(fixture);

      expect(component.toastMessage).toBe('2 screen(s) deleted');
      httpMock.expectOne('/api/screens').flush([]); // reload
      await flush(fixture);
    });

    it('shows a warning toast when some ids were not found', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' })]);
      component.selectionService.selectAll(['screen-1', 'screen-2']);

      const promise = component.handleBulkDelete();
      await flush(fixture);
      component.onBulkDeleteConfirmed(true);
      await microtasks();
      httpMock.expectOne('/api/screens/bulk-delete').flush({ deleted: 1, notFound: ['screen-2'] });
      await promise;
      await flush(fixture);

      expect(component.toastType).toBe('warning');
      expect(component.toastMessage).toContain('1 item(s) could not be found');
      httpMock.expectOne('/api/screens').flush([]); // reload
      await flush(fixture);
    });

    it('rejects and issues no request when the user cancels', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectionService.selectAll(['screen-1']);

      const promise = component.handleBulkDelete();
      await flush(fixture);
      component.onBulkDeleteConfirmed(false);

      await expect(promise).rejects.toThrow('cancelled');
      httpMock.expectNone('/api/screens/bulk-delete');
    });
  });

  describe('bulk assign-group flow', () => {
    it('loads groups, assigns the selection and reloads', async () => {
      configure([makeMembership('org_admin')]);
      groupStub.getAll.mockReturnValue(of([makeGroup({ id: 'g1', name: 'Wall A' })]));
      await createAndLoad([makeScreen({ id: 'screen-1' })]);
      component.selectionService.selectAll(['screen-1']);

      const promise = component.handleBulkAssignGroup();
      await flush(fixture);
      expect(component.showAssignGroupModal).toBe(true);
      expect(component.groups.length).toBe(1);

      component.selectedGroupId = 'g1';
      component.executeAssignGroup();
      await microtasks();
      const req = httpMock.expectOne('/api/screens/bulk-assign-group');
      expect(req.request.body).toEqual({ ids: ['screen-1'], groupId: 'g1' });
      req.flush({ updated: 1, notFound: [] });
      await promise;
      await flush(fixture);

      expect(component.toastMessage).toBe('1 screen(s) assigned to Wall A');
      httpMock.expectOne('/api/screens').flush([]); // reload
      await flush(fixture);
    });

    it('sends groupId null and reports "no group" when removing from group', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' })]);
      component.selectionService.selectAll(['screen-1']);

      const promise = component.handleBulkAssignGroup();
      await flush(fixture);
      component.selectedGroupId = '';
      component.executeAssignGroup();
      await microtasks();
      const req = httpMock.expectOne('/api/screens/bulk-assign-group');
      expect(req.request.body).toEqual({ ids: ['screen-1'], groupId: null });
      req.flush({ updated: 1, notFound: [] });
      await promise;
      await flush(fixture);

      expect(component.toastMessage).toBe('1 screen(s) assigned to no group');
      httpMock.expectOne('/api/screens').flush([]); // reload
      await flush(fixture);
    });

    it('reports a group load error inside the modal', async () => {
      configure([makeMembership('org_admin')]);
      groupStub.getAll.mockReturnValue(throwError(() => new Error('boom')));
      await createAndLoad([makeScreen({ id: 'screen-1' })]);
      component.selectionService.selectAll(['screen-1']);

      const promise = component.handleBulkAssignGroup();
      await flush(fixture);

      expect(component.groupsLoadError).toBe('Failed to load groups.');
      expect(component.groupsLoading).toBe(false);

      component.cancelAssignGroup();
      await expect(promise).rejects.toThrow('cancelled');
    });

    it('rejects without a request when assignment is cancelled', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' })]);
      component.selectionService.selectAll(['screen-1']);

      const promise = component.handleBulkAssignGroup();
      await flush(fixture);
      component.cancelAssignGroup();

      await expect(promise).rejects.toThrow('cancelled');
      httpMock.expectNone('/api/screens/bulk-assign-group');
    });
  });

  describe('navigation', () => {
    it('navigates home on goBack', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);

      component.goBack();

      expect(routerStub.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
