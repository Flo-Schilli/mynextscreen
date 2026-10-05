import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ScreenGroupDetail } from './screen-group-detail';
import { ScreenGroupService } from './screen-group.service';
import {
  ScreenGroup,
  ScreenGroupScreen,
  AssignScreenRequest,
  UpdateScreenGroupRequest,
} from './screen-group.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { ToastService } from '../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

const ORG_ID = 'org1';

function makeAssigned(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 's1',
    name: 'Screen One',
    location: 'Lobby',
    resolution: '1920x1080',
    isOnline: false,
    groupId: 'g1',
    gridRow: 0,
    gridColumn: 0,
    ...overrides,
  };
}

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: ORG_ID,
    name: 'Wall',
    mode: 'split',
    gridColumns: 2,
    gridRows: 2,
    color: '#6d6cf6',
    icon: 'Groups',
    screens: [],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 'av1',
    organisationId: ORG_ID,
    name: 'Available',
    resolution: '1920x1080',
    location: 'Hall',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function membership(role: MyMembership['role'], orgId: string): MyMembership {
  return { id: 'm', userId: 'u1', organisationId: orgId, role, createdAt: '2026-06-01T00:00:00Z' };
}

interface HttpLikeError {
  status?: number;
  error?: { message?: string };
}

const httpError = (status: number, message?: string): HttpLikeError => ({
  status,
  error: message ? { message } : undefined,
});

class MemberServiceStub {
  memberships: MyMembership[] = [membership('org_admin', ORG_ID)];
  fail = false;
  getMyMemberships(): Observable<MyMembership[]> {
    return this.fail ? throwError(() => new Error('boom')) : of(this.memberships);
  }
}

class ScreenServiceStub {
  screens: Screen[] = [];
  fail = false;
  getAll(): Observable<Screen[]> {
    return this.fail ? throwError(() => new Error('boom')) : of(this.screens);
  }
}

class ToastServiceStub {
  success = vi.fn();
  error = vi.fn();
  info = vi.fn();
}

class ScreenGroupServiceStub {
  getOneResult: Observable<ScreenGroup> = of(makeGroup());
  assignResult: Observable<ScreenGroupScreen> = of(makeAssigned());
  removeResult: Observable<ScreenGroupScreen> = of(makeAssigned());
  updateResult: Observable<ScreenGroup> = of(makeGroup());
  deleteResult: Observable<void> = of(undefined);

  getOneCalls: { orgId: string; id: string }[] = [];
  assignCalls: { orgId: string; groupId: string; screenId: string; dto: AssignScreenRequest }[] =
    [];
  removeCalls: { orgId: string; groupId: string; screenId: string }[] = [];
  updateCalls: { orgId: string; id: string; dto: UpdateScreenGroupRequest }[] = [];
  deleteCalls: { orgId: string; id: string }[] = [];

  getOne(orgId: string, id: string): Observable<ScreenGroup> {
    this.getOneCalls.push({ orgId, id });
    return this.getOneResult;
  }
  assignScreen(
    orgId: string,
    groupId: string,
    screenId: string,
    dto: AssignScreenRequest,
  ): Observable<ScreenGroupScreen> {
    this.assignCalls.push({ orgId, groupId, screenId, dto });
    return this.assignResult;
  }
  removeScreen(orgId: string, groupId: string, screenId: string): Observable<ScreenGroupScreen> {
    this.removeCalls.push({ orgId, groupId, screenId });
    return this.removeResult;
  }
  update(orgId: string, id: string, dto: UpdateScreenGroupRequest): Observable<ScreenGroup> {
    this.updateCalls.push({ orgId, id, dto });
    return this.updateResult;
  }
  delete(orgId: string, id: string): Observable<void> {
    this.deleteCalls.push({ orgId, id });
    return this.deleteResult;
  }
}

describe('ScreenGroupDetail', () => {
  let fixture: ComponentFixture<ScreenGroupDetail>;
  let component: ScreenGroupDetail;
  let member: MemberServiceStub;
  let screens: ScreenServiceStub;
  let groupSvc: ScreenGroupServiceStub;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let routeId: string | null;

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(ScreenGroupDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    member = new MemberServiceStub();
    screens = new ScreenServiceStub();
    groupSvc = new ScreenGroupServiceStub();
    navigateSpy = vi.fn().mockResolvedValue(true);
    routeId = 'g1';

    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MemberService, useValue: member },
        { provide: ScreenService, useValue: screens },
        { provide: ScreenGroupService, useValue: groupSvc },
        { provide: ToastService, useClass: ToastServiceStub },
        { provide: Router, useValue: { navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
      ],
    });
  });

  it('loads the group for the resolved org', async () => {
    groupSvc.getOneResult = of(makeGroup({ id: 'g1' }));
    await setUp();

    expect(component.orgId()).toBe(ORG_ID);
    expect(groupSvc.getOneCalls[0]).toEqual({ orgId: ORG_ID, id: 'g1' });
    expect(component.group()?.id).toBe('g1');
  });

  it('reports an error when no route id is present', async () => {
    routeId = null;
    await setUp();

    expect(component.loadError()).toBe('No group ID provided.');
    expect(component.loading()).toBe(false);
  });

  it('maps a 404 to a not-found error', async () => {
    groupSvc.getOneResult = throwError(() => httpError(404));
    await setUp();

    expect(component.loadError()).toBe('Screen group not found.');
  });

  it('builds wall cells for a split group', async () => {
    groupSvc.getOneResult = of(
      makeGroup({
        gridColumns: 2,
        gridRows: 2,
        screens: [makeAssigned({ id: 's1', gridRow: 0, gridColumn: 0 })],
      }),
    );
    await setUp();

    const cells = component.wallCells();
    expect(cells.length).toBe(4);
    expect(cells[0].screen?.id).toBe('s1');
    expect(cells[1].screen).toBeNull();
  });

  it('counts placed screens and computes panels-needed', async () => {
    groupSvc.getOneResult = of(
      makeGroup({
        gridColumns: 2,
        gridRows: 1,
        screens: [makeAssigned({ id: 's1', gridRow: 0, gridColumn: 0 })],
      }),
    );
    await setUp();

    expect(component.assignedCount()).toBe(1);
    expect(component.cellsNeeded()).toBe(2);
  });

  it('assigns a screen to a cell on wall assign', async () => {
    groupSvc.getOneResult = of(makeGroup({ screens: [] }));
    await setUp();

    component.onWallAssign({ row: 1, col: 0, idx: 2, screenId: 'av1' });
    await fixture.whenStable();

    expect(groupSvc.assignCalls[0]).toEqual({
      orgId: ORG_ID,
      groupId: 'g1',
      screenId: 'av1',
      dto: { gridRow: 1, gridColumn: 0 },
    });
  });

  it('clears a cell when wall assign passes a null screen', async () => {
    groupSvc.getOneResult = of(
      makeGroup({ screens: [makeAssigned({ id: 's1', gridRow: 0, gridColumn: 0 })] }),
    );
    await setUp();

    component.onWallAssign({ row: 0, col: 0, idx: 0, screenId: null });
    await fixture.whenStable();

    expect(groupSvc.removeCalls[0]).toEqual({ orgId: ORG_ID, groupId: 'g1', screenId: 's1' });
  });

  it('adds a mirror screen via the dashed select', async () => {
    groupSvc.getOneResult = of(makeGroup({ mode: 'mirror', gridColumns: null, gridRows: null }));
    screens.screens = [makeScreen({ id: 'av1' })];
    await setUp();

    component.onAddScreenSelect('av1');
    await fixture.whenStable();

    expect(groupSvc.assignCalls[0]).toEqual({
      orgId: ORG_ID,
      groupId: 'g1',
      screenId: 'av1',
      dto: {},
    });
  });

  it('removes a screen from the group', async () => {
    groupSvc.getOneResult = of(
      makeGroup({ screens: [makeAssigned({ id: 's1', gridRow: 0, gridColumn: 0 })] }),
    );
    await setUp();

    component.removeScreenFromGroup('s1');
    await fixture.whenStable();

    expect(groupSvc.removeCalls[0]).toEqual({ orgId: ORG_ID, groupId: 'g1', screenId: 's1' });
  });

  it('switches mode inline via the mode toggle', async () => {
    groupSvc.getOneResult = of(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
    await setUp();

    component.changeMode('mirror');
    await fixture.whenStable();

    expect(groupSvc.updateCalls[0].dto).toEqual({ mode: 'mirror' });
  });

  it('commits grid size from the steppers in split mode', async () => {
    groupSvc.getOneResult = of(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
    await setUp();

    component.cols.set(3);
    component.rows.set(2);
    component.commitGrid();
    await fixture.whenStable();

    expect(groupSvc.updateCalls.at(-1)?.dto).toEqual({ gridColumns: 3, gridRows: 2 });
  });

  it('blocks delete while screens remain, then deletes once empty', async () => {
    groupSvc.getOneResult = of(
      makeGroup({ screens: [makeAssigned({ id: 's1', gridRow: 0, gridColumn: 0 })] }),
    );
    await setUp();

    component.onDelete();
    expect(groupSvc.deleteCalls.length).toBe(0);
    expect(component.actionError()).toContain('Remove all screens');

    groupSvc.getOneResult = of(makeGroup({ screens: [] }));
    component['group'].set(makeGroup({ screens: [] }));
    component.onDelete();
    await fixture.whenStable();

    expect(groupSvc.deleteCalls[0]).toEqual({ orgId: ORG_ID, id: 'g1' });
    expect(navigateSpy).toHaveBeenCalledWith(['/screen-groups']);
  });

  it('renders the live preview from the group colour', async () => {
    groupSvc.getOneResult = of(makeGroup({ color: '#ec4899' }));
    await setUp();

    const preview = component.monitorContent();
    expect(preview?.bg).toContain('#ec4899');
    expect(preview?.bg).not.toContain('url(');
  });

  it('navigates back to the list', async () => {
    await setUp();
    component.goBack();
    expect(navigateSpy).toHaveBeenCalledWith(['/screen-groups']);
  });
});
