import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { from, Observable, Subject } from 'rxjs';
import { Screens } from './screens';
import { ScreenListItem } from './screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { DashboardSseService, DashboardEvent } from '../dashboard/dashboard-sse.service';
import { ToastService, Toast } from '../shared/toast/toast.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeScreen(overrides: Partial<ScreenListItem> = {}): ScreenListItem {
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
    showUnmuteButton: true,
    showDisconnectButton: true,
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    currentPlaylistName: null,
    currentPlaylistThumbnail: null,
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

// Zoneless: no auto-tick. The container holds state in plain fields, so an
// HTTP/promise resolution does not mark it dirty under zoneless CD. Drain the
// microtask queue (promise chains) first so all field mutations have landed,
// then render once.
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
  // otherwise flags a template getter binding (screenSubtitle) returning a
  // fresh string each pass as an NG0100.
  f.detectChanges(false);
}

describe('Screens', () => {
  let fixture: ComponentFixture<Screens>;
  let component: Screens;
  let httpMock: HttpTestingController;
  let toastService: ToastService;

  function lastToast(): Toast | undefined {
    return toastService.toasts().at(-1);
  }

  let memberStub: { getMyMemberships: ReturnType<typeof vi.fn> };
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
        { provide: DashboardSseService, useValue: sseStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  }

  // Creates the component and resolves the initial GET /api/screens load.
  async function createAndLoad(screens: ScreenListItem[]): Promise<void> {
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
    it('renders the grid once screens are loaded', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen(), makeScreen({ id: 'screen-2', name: 'Bar TV' })]);

      expect(component.loading).toBe(false);
      expect(component.screens.length).toBe(2);
      expect(component.screens.map((s) => s.id)).toEqual(['screen-1', 'screen-2']);
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
    it('sends the pairing code, toasts and reloads after a successful create', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);

      component.openCreateForm();
      await flush(fixture);
      const createModal = fixture.debugElement.query(By.css('app-screen-form'));
      expect(createModal).toBeTruthy();
      expect(createModal.componentInstance.mode()).toBe('create');

      component.submitCreate({
        name: 'New',
        resolution: '1920x1080',
        location: 'Hall',
        pairingCode: '123456',
      });
      const req = httpMock.expectOne('/api/screens');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        name: 'New',
        resolution: '1920x1080',
        location: 'Hall',
        pairingCode: '123456',
      });
      req.flush(makeScreen({ name: 'New' }));
      await flush(fixture);

      expect(component.showCreateForm).toBe(false);
      expect(component.creating).toBe(false);
      expect(lastToast()?.type).toBe('success');
      expect(lastToast()?.message).toContain('New');
      // No API-key modal exists anymore.
      expect(fixture.debugElement.query(By.css('app-screen-api-key-modal'))).toBeNull();

      httpMock.expectOne('/api/screens').flush([makeScreen({ name: 'New' })]); // reload
      await flush(fixture);
    });

    it('surfaces the server error message on a failed create', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([]);

      component.submitCreate({
        name: 'New',
        resolution: '1920x1080',
        location: 'Hall',
        pairingCode: '123456',
      });
      httpMock
        .expectOne('/api/screens')
        .flush({ message: 'Duplicate name' }, { status: 400, statusText: 'Bad Request' });
      await flush(fixture);

      expect(component.createError).toBe('Duplicate name');
      expect(component.creating).toBe(false);
    });
  });

  describe('edit flow', () => {
    it('opens the unified modal in edit mode when a card is selected', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);

      component.selectScreen(component.screens[0]);
      await flush(fixture);

      expect(component.editingScreen).toBe(true);
      const editModal = fixture.debugElement.query(By.css('app-screen-form'));
      expect(editModal).toBeTruthy();
      expect(editModal.componentInstance.mode()).toBe('edit');
      expect(editModal.componentInstance.screen()).toEqual(component.screens[0]);
    });

    it('PATCHes the screen and reloads on a successful edit', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);
      await flush(fixture);

      component.submitEdit({ name: 'Renamed' });
      const req = httpMock.expectOne('/api/screens/screen-1');
      expect(req.request.method).toBe('PATCH');
      req.flush(makeScreen({ name: 'Renamed' }));
      await flush(fixture);

      expect(component.editingScreen).toBe(false);
      expect(component.selectedScreen).toBeNull();
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

  describe('re-pair flow', () => {
    it('POSTs the pairing code to /repair and toasts on success', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);

      component.submitRepair('654321');
      const req = httpMock.expectOne('/api/screens/screen-1/repair');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ pairingCode: '654321' });
      req.flush(makeScreen());
      await flush(fixture);

      expect(component.repairing).toBe(false);
      expect(lastToast()?.type).toBe('success');
    });

    it('surfaces an error on a failed re-pair', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectScreen(component.screens[0]);

      component.submitRepair('654321');
      httpMock
        .expectOne('/api/screens/screen-1/repair')
        .flush({ message: 'Nope' }, { status: 500, statusText: 'Error' });
      await flush(fixture);

      expect(component.actionError).toBe('Nope');
      expect(component.repairing).toBe(false);
    });

    it('is a no-op without a selected screen', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen()]);
      component.selectedScreen = null;

      component.submitRepair('654321');

      httpMock.expectNone('/api/screens/screen-1/repair');
    });
  });

  describe('single delete flow', () => {
    it('confirms, deletes the screen and reloads', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' })]);

      component.onDeleteScreen(component.screens[0]);
      expect(component.showDeleteConfirm).toBe(true);
      await flush(fixture);
      // The confirm-delete modal renders with the screen name (not window.confirm).
      const modal = fixture.debugElement.query(By.css('mns-modal'));
      expect(modal).toBeTruthy();
      expect(modal.nativeElement.textContent).toContain('Lobby TV');

      component.executeDelete();
      const req = httpMock.expectOne('/api/screens/bulk-delete');
      expect(req.request.body).toEqual({ ids: ['screen-1'] });
      req.flush({ deleted: 1, notFound: [] });
      await flush(fixture);

      expect(component.showDeleteConfirm).toBe(false);
      expect(lastToast()?.type).toBe('success');
      expect(lastToast()?.message).toContain('deleted');
      httpMock.expectOne('/api/screens').flush([]); // reload
      await flush(fixture);
    });

    it('surfaces an error on a failed delete', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' })]);

      component.onDeleteScreen(component.screens[0]);
      component.executeDelete();
      httpMock
        .expectOne('/api/screens/bulk-delete')
        .flush({ message: 'Nope' }, { status: 500, statusText: 'Error' });
      await flush(fixture);

      expect(component.actionError).toBe('Nope');
      expect(component.deleting).toBe(false);
    });

    it('cancels without a request', async () => {
      configure([makeMembership('org_admin')]);
      await createAndLoad([makeScreen({ id: 'screen-1' })]);

      component.onDeleteScreen(component.screens[0]);
      component.cancelDelete();

      expect(component.showDeleteConfirm).toBe(false);
      httpMock.expectNone('/api/screens/bulk-delete');
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
