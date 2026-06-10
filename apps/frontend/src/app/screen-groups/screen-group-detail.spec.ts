import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
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
import { ContentService } from '../content/content.service';
import { Content } from '../content/content.model';
import { GridCell } from './screen-group-grid-editor';

const ORG_ID = 'org1';

function makeAssigned(overrides: Partial<ScreenGroupScreen> = {}): ScreenGroupScreen {
  return {
    id: 's1',
    name: 'Screen One',
    location: 'Lobby',
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

function makeContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'c1',
    organisationId: ORG_ID,
    title: 'Promo',
    description: null,
    tags: [],
    type: 'image',
    originalFilename: 'promo.png',
    originalMimeType: 'image/png',
    originalSizeBytes: 100,
    transcodedSizeBytes: null,
    transcodingStatus: 'completed',
    transcodingError: null,
    durationSeconds: null,
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

class ContentServiceStub {
  items: Content[] = [];
  fail = false;
  getAll(): Observable<Content[]> {
    return this.fail ? throwError(() => new Error('boom')) : of(this.items);
  }
  getTranscodedUrl(id: string): string {
    return `/transcoded/${id}`;
  }
  getOriginalUrl(id: string): string {
    return `/original/${id}`;
  }
}

class ScreenGroupServiceStub {
  getOneResult: Observable<ScreenGroup> = of(makeGroup());
  assignResult: Observable<ScreenGroupScreen> = of(makeAssigned());
  removeResult: Observable<ScreenGroupScreen> = of(makeAssigned());
  updateResult: Observable<ScreenGroup> = of(makeGroup());

  getOneCalls: { orgId: string; id: string }[] = [];
  assignCalls: { orgId: string; groupId: string; screenId: string; dto: AssignScreenRequest }[] =
    [];
  removeCalls: { orgId: string; groupId: string; screenId: string }[] = [];
  updateCalls: { orgId: string; id: string; dto: UpdateScreenGroupRequest }[] = [];

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
}

/**
 * Builds a minimal CDK drop event. The component only reads
 * `previousContainer.{id,data}`, `container.data` and `item.data`, so a partial
 * shape is sufficient. Returned loosely typed; call sites cast to the exact
 * `CdkDragDrop<...>` the handler expects.
 */
function dropEvent(
  prevContainerId: string,
  prevData: unknown,
  containerData: unknown,
  itemData: ScreenGroupScreen | Screen,
): CdkDragDrop<GridCell, GridCell> {
  return {
    previousContainer: { id: prevContainerId, data: prevData },
    container: { data: containerData },
    item: { data: itemData },
  } as unknown as CdkDragDrop<GridCell, GridCell>;
}

describe('ScreenGroupDetail', () => {
  let fixture: ComponentFixture<ScreenGroupDetail>;
  let component: ScreenGroupDetail;
  let member: MemberServiceStub;
  let screens: ScreenServiceStub;
  let content: ContentServiceStub;
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
    content = new ContentServiceStub();
    groupSvc = new ScreenGroupServiceStub();
    navigateSpy = vi.fn().mockResolvedValue(true);
    routeId = 'g1';

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MemberService, useValue: member },
        { provide: ScreenService, useValue: screens },
        { provide: ContentService, useValue: content },
        { provide: ScreenGroupService, useValue: groupSvc },
        { provide: Router, useValue: { navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => routeId } } },
        },
      ],
    });
  });

  describe('org context + initial load', () => {
    it('prefers the org_admin membership', async () => {
      member.memberships = [membership('viewer', 'orgV'), membership('org_admin', 'orgA')];
      groupSvc.getOneResult = of(makeGroup({ organisationId: 'orgA' }));
      await setUp();

      expect(component.orgId).toBe('orgA');
      expect(component.loading).toBe(false);
    });

    it('reports an error when the user has no organisation', async () => {
      member.memberships = [];
      await setUp();

      expect(component.loadError).toBe('You are not a member of any organisation.');
      expect(component.loading).toBe(false);
    });

    it('reports an error when the memberships request fails', async () => {
      member.fail = true;
      await setUp();

      expect(component.loadError).toBe('Failed to load organisation context.');
    });

    it('reports a missing-id error when the route has no id', async () => {
      routeId = null;
      await setUp();

      expect(component.loadError).toBe('No group ID provided.');
    });

    it('maps a 404 to a not-found error', async () => {
      groupSvc.getOneResult = throwError(() => httpError(404));
      await setUp();

      expect(component.loadError).toBe('Screen group not found.');
    });

    it('maps other load errors to a generic message', async () => {
      groupSvc.getOneResult = throwError(() => httpError(500));
      await setUp();

      expect(component.loadError).toBe('Failed to load screen group.');
    });
  });

  describe('grid building (split mode)', () => {
    it('builds a cell per row/col with screens placed at their coordinates', async () => {
      groupSvc.getOneResult = of(
        makeGroup({
          gridColumns: 2,
          gridRows: 2,
          screens: [makeAssigned({ id: 'sA', gridRow: 1, gridColumn: 0 })],
        }),
      );
      await setUp();

      expect(component.gridCells.length).toBe(4);
      const occupied = component.gridCells.find((c: GridCell) => c.screen?.id === 'sA');
      expect(occupied?.row).toBe(1);
      expect(occupied?.col).toBe(0);
      const empties = component.gridCells.filter((c: GridCell) => c.screen === null);
      expect(empties.length).toBe(3);
    });

    it('exposes drop list ids including the sidebar', async () => {
      groupSvc.getOneResult = of(makeGroup({ gridColumns: 2, gridRows: 1 }));
      await setUp();

      expect(component.allDropListIds).toEqual(['sidebar-list', 'cell-0-0', 'cell-0-1']);
    });

    it('filters assigned screens out of the available list', async () => {
      groupSvc.getOneResult = of(makeGroup({ screens: [makeAssigned({ id: 'sA' })] }));
      screens.screens = [makeScreen({ id: 'sA' }), makeScreen({ id: 'sB' })];
      await setUp();

      expect(component.availableScreens.map((s: Screen) => s.id)).toEqual(['sB']);
    });

    it('reports allCellsAssigned false when a cell is empty', async () => {
      groupSvc.getOneResult = of(
        makeGroup({
          gridColumns: 2,
          gridRows: 1,
          screens: [makeAssigned({ gridRow: 0, gridColumn: 0 })],
        }),
      );
      await setUp();

      expect(component.allCellsAssigned).toBe(false);
    });

    it('reports allCellsAssigned true when every cell is filled', async () => {
      groupSvc.getOneResult = of(
        makeGroup({
          gridColumns: 2,
          gridRows: 1,
          screens: [
            makeAssigned({ id: 's0', gridRow: 0, gridColumn: 0 }),
            makeAssigned({ id: 's1', gridRow: 0, gridColumn: 1 }),
          ],
        }),
      );
      await setUp();

      expect(component.allCellsAssigned).toBe(true);
    });
  });

  describe('drag & drop assign', () => {
    beforeEach(() => {
      groupSvc.getOneResult = of(makeGroup({ gridColumns: 2, gridRows: 1 }));
    });

    it('assigns a screen dragged from the sidebar to a cell', async () => {
      screens.screens = [makeScreen({ id: 'av1', groupId: null })];
      await setUp();
      const targetCell: GridCell = { row: 0, col: 1, screen: null, dropListId: 'cell-0-1' };

      component.onDropToCell(
        dropEvent('sidebar-list', [] as Screen[], targetCell, makeScreen({ id: 'av1' })),
      );
      await fixture.whenStable();

      expect(groupSvc.assignCalls[0]).toEqual({
        orgId: ORG_ID,
        groupId: 'g1',
        screenId: 'av1',
        dto: { gridRow: 0, gridColumn: 1 },
      });
    });

    it('rejects assigning a screen that belongs to another group', async () => {
      screens.screens = [makeScreen({ id: 'av1', groupId: 'other', name: 'Foreign' })];
      await setUp();
      const targetCell: GridCell = { row: 0, col: 0, screen: null, dropListId: 'cell-0-0' };

      component.onDropToCell(
        dropEvent(
          'sidebar-list',
          [] as Screen[],
          targetCell,
          makeScreen({ id: 'av1', name: 'Foreign' }),
        ),
      );

      expect(groupSvc.assignCalls.length).toBe(0);
      expect(component.actionError).toContain('already belongs to another group');
    });

    it('ignores a drop onto an occupied cell holding a different screen', async () => {
      await setUp();
      const occupied: GridCell = {
        row: 0,
        col: 0,
        screen: makeAssigned({ id: 'existing' }),
        dropListId: 'cell-0-0',
      };

      component.onDropToCell(
        dropEvent('sidebar-list', [] as Screen[], occupied, makeScreen({ id: 'av1' })),
      );

      expect(groupSvc.assignCalls.length).toBe(0);
    });

    it('ignores drops while an operation is in progress', async () => {
      await setUp();
      component.operationInProgress = true;
      const targetCell: GridCell = { row: 0, col: 0, screen: null, dropListId: 'cell-0-0' };

      component.onDropToCell(
        dropEvent('sidebar-list', [] as Screen[], targetCell, makeScreen({ id: 'av1' })),
      );

      expect(groupSvc.assignCalls.length).toBe(0);
    });

    it('surfaces the server message when assigning fails', async () => {
      screens.screens = [makeScreen({ id: 'av1', groupId: null })];
      groupSvc.assignResult = throwError(() => httpError(400, 'Assign failed'));
      await setUp();
      const targetCell: GridCell = { row: 0, col: 0, screen: null, dropListId: 'cell-0-0' };

      component.onDropToCell(
        dropEvent('sidebar-list', [] as Screen[], targetCell, makeScreen({ id: 'av1' })),
      );
      await fixture.whenStable();

      expect(component.actionError).toBe('Assign failed');
      expect(component.operationInProgress).toBe(false);
    });
  });

  describe('drag & drop move between cells', () => {
    it('removes then re-assigns when moving a screen to a new cell', async () => {
      groupSvc.getOneResult = of(
        makeGroup({
          gridColumns: 2,
          gridRows: 1,
          screens: [makeAssigned({ id: 'sM', gridRow: 0, gridColumn: 0 })],
        }),
      );
      await setUp();
      const source: GridCell = {
        row: 0,
        col: 0,
        screen: makeAssigned({ id: 'sM' }),
        dropListId: 'cell-0-0',
      };
      const target: GridCell = { row: 0, col: 1, screen: null, dropListId: 'cell-0-1' };

      component.onDropToCell(dropEvent('cell-0-0', source, target, makeAssigned({ id: 'sM' })));
      await fixture.whenStable();

      expect(groupSvc.removeCalls[0]).toMatchObject({ groupId: 'g1', screenId: 'sM' });
      expect(groupSvc.assignCalls[0]).toEqual({
        orgId: ORG_ID,
        groupId: 'g1',
        screenId: 'sM',
        dto: { gridRow: 0, gridColumn: 1 },
      });
    });

    it('ignores a move back onto the same cell', async () => {
      groupSvc.getOneResult = of(
        makeGroup({
          gridColumns: 2,
          gridRows: 1,
          screens: [makeAssigned({ id: 'sM', gridRow: 0, gridColumn: 0 })],
        }),
      );
      await setUp();
      const same: GridCell = {
        row: 0,
        col: 0,
        screen: makeAssigned({ id: 'sM' }),
        dropListId: 'cell-0-0',
      };

      component.onDropToCell(dropEvent('cell-0-0', same, same, makeAssigned({ id: 'sM' })));

      expect(groupSvc.removeCalls.length).toBe(0);
      expect(groupSvc.assignCalls.length).toBe(0);
    });
  });

  describe('drag & drop to sidebar (remove)', () => {
    it('removes a screen dropped back onto the sidebar', async () => {
      groupSvc.getOneResult = of(
        makeGroup({ gridColumns: 2, gridRows: 1, screens: [makeAssigned({ id: 'sR' })] }),
      );
      await setUp();
      const sourceCell: GridCell = {
        row: 0,
        col: 0,
        screen: makeAssigned({ id: 'sR' }),
        dropListId: 'cell-0-0',
      };

      component.onDropToSidebar(
        dropEvent(
          'cell-0-0',
          sourceCell,
          [] as Screen[],
          makeAssigned({ id: 'sR' }),
        ) as unknown as CdkDragDrop<Screen[], GridCell>,
      );
      await fixture.whenStable();

      expect(groupSvc.removeCalls[0]).toMatchObject({ groupId: 'g1', screenId: 'sR' });
    });

    it('ignores a drop that originates in the sidebar', async () => {
      groupSvc.getOneResult = of(makeGroup({ gridColumns: 2, gridRows: 1 }));
      await setUp();

      component.onDropToSidebar(
        dropEvent(
          'sidebar-list',
          [] as Screen[],
          [] as Screen[],
          makeScreen({ id: 'av1' }),
        ) as unknown as CdkDragDrop<Screen[], GridCell>,
      );

      expect(groupSvc.removeCalls.length).toBe(0);
    });
  });

  describe('mirror mode add/remove', () => {
    beforeEach(() => {
      groupSvc.getOneResult = of(makeGroup({ mode: 'mirror', gridColumns: null, gridRows: null }));
    });

    it('opens and cancels the add-screen modal', async () => {
      await setUp();

      component.openAddScreen();
      expect(component.showAddScreen).toBe(true);

      component.cancelAddScreen();
      expect(component.showAddScreen).toBe(false);
    });

    it('assigns a screen with no grid coords in mirror mode', async () => {
      await setUp();

      component.addScreenMirror(makeScreen({ id: 'av1', groupId: null }));
      await fixture.whenStable();

      expect(groupSvc.assignCalls[0]).toEqual({
        orgId: ORG_ID,
        groupId: 'g1',
        screenId: 'av1',
        dto: {},
      });
    });

    it('rejects adding a screen from another group in mirror mode', async () => {
      await setUp();

      component.addScreenMirror(makeScreen({ id: 'av1', groupId: 'other', name: 'Foreign' }));

      expect(groupSvc.assignCalls.length).toBe(0);
      expect(component.addScreenError).toContain('already belongs to another group');
    });

    it('surfaces the server message when mirror add fails', async () => {
      groupSvc.assignResult = throwError(() => httpError(400, 'Add failed'));
      await setUp();

      component.addScreenMirror(makeScreen({ id: 'av1', groupId: null }));
      await fixture.whenStable();

      expect(component.addScreenError).toBe('Add failed');
      expect(component.operationInProgress).toBe(false);
    });

    it('removes a screen from the group', async () => {
      await setUp();

      component.removeScreenFromGroup('sR');
      await fixture.whenStable();

      expect(groupSvc.removeCalls[0]).toMatchObject({ groupId: 'g1', screenId: 'sR' });
    });

    it('surfaces the server message when removing fails', async () => {
      groupSvc.removeResult = throwError(() => httpError(400, 'Remove failed'));
      await setUp();

      component.removeScreenFromGroup('sR');
      await fixture.whenStable();

      expect(component.actionError).toBe('Remove failed');
      expect(component.operationInProgress).toBe(false);
    });
  });

  describe('switch mode', () => {
    it('seeds the grid defaults from the current group on open', async () => {
      groupSvc.getOneResult = of(makeGroup({ mode: 'split', gridColumns: 4, gridRows: 3 }));
      await setUp();

      component.openSwitchMode();

      expect(component.showSwitchMode).toBe(true);
      expect(component.switchGridColumns).toBe(4);
      expect(component.switchGridRows).toBe(3);
    });

    it('switches a mirror group to split with the chosen grid', async () => {
      groupSvc.getOneResult = of(makeGroup({ mode: 'mirror', gridColumns: null, gridRows: null }));
      await setUp();
      component.switchGridColumns = 3;
      component.switchGridRows = 2;

      component.executeSwitchMode();
      await fixture.whenStable();

      expect(groupSvc.updateCalls[0]).toEqual({
        orgId: ORG_ID,
        id: 'g1',
        dto: { mode: 'split', gridColumns: 3, gridRows: 2 },
      });
      expect(component.showSwitchMode).toBe(false);
    });

    it('switches a split group to mirror without grid dimensions', async () => {
      groupSvc.getOneResult = of(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
      await setUp();

      component.executeSwitchMode();
      await fixture.whenStable();

      expect(groupSvc.updateCalls[0].dto).toEqual({ mode: 'mirror' });
    });

    it('blocks switching to split without grid dimensions', async () => {
      groupSvc.getOneResult = of(makeGroup({ mode: 'mirror', gridColumns: null, gridRows: null }));
      await setUp();
      component.switchGridColumns = 0;
      component.switchGridRows = 0;

      component.executeSwitchMode();

      expect(groupSvc.updateCalls.length).toBe(0);
      expect(component.switchError).toBe('Grid columns and rows are required for split mode.');
    });

    it('surfaces the server message when switching fails', async () => {
      groupSvc.getOneResult = of(makeGroup({ mode: 'split', gridColumns: 2, gridRows: 2 }));
      groupSvc.updateResult = throwError(() => httpError(400, 'Switch failed'));
      await setUp();

      component.executeSwitchMode();
      await fixture.whenStable();

      expect(component.switchError).toBe('Switch failed');
      expect(component.switching).toBe(false);
    });

    it('cancels the switch-mode modal', async () => {
      groupSvc.getOneResult = of(makeGroup());
      await setUp();

      component.openSwitchMode();
      component.cancelSwitchMode();

      expect(component.showSwitchMode).toBe(false);
    });
  });

  describe('wall-preview content selection', () => {
    it('filters content to completed items and non-failed images', async () => {
      content.items = [
        makeContent({ id: 'done', transcodingStatus: 'completed' }),
        makeContent({ id: 'imgPending', type: 'image', transcodingStatus: 'pending' }),
        makeContent({ id: 'imgFailed', type: 'image', transcodingStatus: 'failed' }),
        makeContent({ id: 'videoPending', type: 'video', transcodingStatus: 'pending' }),
      ];
      await setUp();

      expect(component.contentItems.map((c: Content) => c.id)).toEqual(['done', 'imgPending']);
    });

    it('clears the preview when no content id is selected', async () => {
      await setUp();
      component.previewImageUrl = 'something';

      component.onPreviewContentSelect('');

      expect(component.previewImageUrl).toBeNull();
      expect(component.selectedContent).toBeNull();
    });

    it('ignores an unknown content id', async () => {
      content.items = [makeContent({ id: 'c1' })];
      await setUp();

      component.onPreviewContentSelect('does-not-exist');

      expect(component.selectedContent).toBeNull();
    });

    it('sets the selected content and starts image loading for image content', async () => {
      content.items = [makeContent({ id: 'c1', type: 'image', transcodingStatus: 'completed' })];
      await setUp();

      component.onPreviewContentSelect('c1');

      expect(component.selectedContent?.id).toBe('c1');
    });
  });

  describe('navigation', () => {
    it('navigates back to the groups list', async () => {
      await setUp();

      component.goBack();

      expect(navigateSpy).toHaveBeenCalledWith(['/screen-groups']);
    });
  });
});
