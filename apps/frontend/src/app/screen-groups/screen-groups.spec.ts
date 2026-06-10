import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ScreenGroups } from './screen-groups';
import { ScreenGroupService } from './screen-group.service';
import {
  ScreenGroup,
  CreateScreenGroupRequest,
  UpdateScreenGroupRequest,
} from './screen-group.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: 'org1',
    name: 'Lobby',
    mode: 'mirror',
    gridColumns: null,
    gridRows: null,
    screens: [],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function membership(role: MyMembership['role'], orgId: string): MyMembership {
  return {
    id: 'm-' + orgId,
    userId: 'u1',
    organisationId: orgId,
    role,
    createdAt: '2026-06-01T00:00:00Z',
  };
}

/** Stub for {@link MemberService}: only `getMyMemberships` is used here. */
class MemberServiceStub {
  memberships: MyMembership[] = [membership('org_admin', 'org1')];
  failMemberships = false;

  getMyMemberships(): Observable<MyMembership[]> {
    return this.failMemberships ? throwError(() => new Error('boom')) : of(this.memberships);
  }
}

interface HttpLikeError {
  status?: number;
  error?: { message?: string };
}

/** Stub for {@link ScreenGroupService} with capturable args and per-call results. */
class ScreenGroupServiceStub {
  getAllResult: Observable<ScreenGroup[]> = of([]);
  createResult: Observable<ScreenGroup> = of(makeGroup());
  updateResult: Observable<ScreenGroup> = of(makeGroup());
  deleteResult: Observable<void> = of(undefined);

  getAllCalls: string[] = [];
  createArgs: { orgId: string; dto: CreateScreenGroupRequest } | null = null;
  updateArgs: { orgId: string; id: string; dto: UpdateScreenGroupRequest } | null = null;
  deleteArgs: { orgId: string; id: string } | null = null;

  getAll(orgId: string): Observable<ScreenGroup[]> {
    this.getAllCalls.push(orgId);
    return this.getAllResult;
  }

  create(orgId: string, dto: CreateScreenGroupRequest): Observable<ScreenGroup> {
    this.createArgs = { orgId, dto };
    return this.createResult;
  }

  update(orgId: string, id: string, dto: UpdateScreenGroupRequest): Observable<ScreenGroup> {
    this.updateArgs = { orgId, id, dto };
    return this.updateResult;
  }

  delete(orgId: string, id: string): Observable<void> {
    this.deleteArgs = { orgId, id };
    return this.deleteResult;
  }
}

const httpError = (status: number, message?: string): HttpLikeError => ({
  status,
  error: message ? { message } : undefined,
});

describe('ScreenGroups', () => {
  let fixture: ComponentFixture<ScreenGroups>;
  let component: ScreenGroups;
  let member: MemberServiceStub;
  let groups: ScreenGroupServiceStub;
  let navigateSpy: ReturnType<typeof vi.fn>;

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(ScreenGroups);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    member = new MemberServiceStub();
    groups = new ScreenGroupServiceStub();
    navigateSpy = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MemberService, useValue: member },
        { provide: ScreenGroupService, useValue: groups },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
  });

  it('prefers the org_admin membership for the org context', async () => {
    member.memberships = [membership('viewer', 'orgV'), membership('org_admin', 'orgA')];
    await setUp();

    expect(component.orgId).toBe('orgA');
    expect(groups.getAllCalls).toContain('orgA');
    expect(component.loading).toBe(false);
  });

  it('falls back to the first membership when none is org_admin', async () => {
    member.memberships = [membership('editor', 'orgE'), membership('viewer', 'orgV')];
    await setUp();

    expect(component.orgId).toBe('orgE');
    expect(groups.getAllCalls).toContain('orgE');
  });

  it('reports an error when the user belongs to no organisation', async () => {
    member.memberships = [];
    await setUp();

    expect(component.loadError).toBe('You are not a member of any organisation.');
    expect(component.loading).toBe(false);
  });

  it('reports an error when the memberships request fails', async () => {
    member.failMemberships = true;
    await setUp();

    expect(component.loadError).toBe('Failed to load organisation context.');
    expect(component.loading).toBe(false);
  });

  it('stores the loaded groups', async () => {
    groups.getAllResult = of([makeGroup({ id: 'g1' }), makeGroup({ id: 'g2' })]);
    await setUp();

    expect(component.groups.length).toBe(2);
  });

  it('maps a 403 to an access-denied error', async () => {
    groups.getAllResult = throwError(() => httpError(403));
    await setUp();

    expect(component.loadError).toBe('Access denied.');
  });

  it('maps other errors to a generic load failure', async () => {
    groups.getAllResult = throwError(() => httpError(500));
    await setUp();

    expect(component.loadError).toBe('Failed to load screen groups.');
  });

  it('opens and cancels the create form', async () => {
    await setUp();

    component.openCreateForm();
    expect(component.showCreateForm).toBe(true);

    component.cancelCreate();
    expect(component.showCreateForm).toBe(false);
  });

  it('creates a group and reloads the list', async () => {
    await setUp();
    const dto: CreateScreenGroupRequest = {
      name: 'New',
      mode: 'split',
      gridColumns: 2,
      gridRows: 2,
    };
    groups.createResult = of(makeGroup({ id: 'gNew' }));
    groups.getAllResult = of([makeGroup({ id: 'gNew' })]);

    component.openCreateForm();
    component.submitCreate(dto);
    await fixture.whenStable();

    expect(groups.createArgs).toEqual({ orgId: 'org1', dto });
    expect(component.creating).toBe(false);
    expect(component.showCreateForm).toBe(false);
    expect(component.groups.length).toBe(1);
  });

  it('surfaces the server message on create failure', async () => {
    await setUp();
    groups.createResult = throwError(() => httpError(400, 'Name taken'));

    component.submitCreate({ name: 'X', mode: 'mirror' });
    await fixture.whenStable();

    expect(component.createError).toBe('Name taken');
    expect(component.creating).toBe(false);
  });

  it('edits a group and reloads the list', async () => {
    await setUp();
    groups.updateResult = of(makeGroup({ id: 'g1', name: 'Renamed' }));

    component.editGroup(makeGroup({ id: 'g1' }));
    expect(component.editingGroup?.id).toBe('g1');

    component.submitEdit({ name: 'Renamed' });
    await fixture.whenStable();

    expect(groups.updateArgs).toEqual({ orgId: 'org1', id: 'g1', dto: { name: 'Renamed' } });
    expect(component.editingGroup).toBeNull();
    expect(component.saving).toBe(false);
  });

  it('does nothing on submitEdit when no group is being edited', async () => {
    await setUp();

    component.editingGroup = null;
    component.submitEdit({ name: 'X' });

    expect(groups.updateArgs).toBeNull();
  });

  it('surfaces the server message on edit failure', async () => {
    await setUp();
    groups.updateResult = throwError(() => httpError(400, 'Invalid'));

    component.editGroup(makeGroup({ id: 'g1' }));
    component.submitEdit({ name: 'Renamed' });
    await fixture.whenStable();

    expect(component.editError).toBe('Invalid');
    expect(component.saving).toBe(false);
  });

  it('confirms then deletes a group and reloads', async () => {
    await setUp();
    groups.deleteResult = of(undefined);

    component.confirmDelete(makeGroup({ id: 'g1' }));
    expect(component.deletingGroup?.id).toBe('g1');

    component.executeDelete();
    await fixture.whenStable();

    expect(groups.deleteArgs).toEqual({ orgId: 'org1', id: 'g1' });
    expect(component.deletingGroup).toBeNull();
    expect(component.deleting).toBe(false);
  });

  it('does nothing on executeDelete when no group is selected', async () => {
    await setUp();

    component.deletingGroup = null;
    component.executeDelete();

    expect(groups.deleteArgs).toBeNull();
  });

  it('cancels delete and clears any delete error', async () => {
    await setUp();

    component.confirmDelete(makeGroup({ id: 'g1' }));
    component.deleteError = 'old';
    component.cancelDelete();

    expect(component.deletingGroup).toBeNull();
    expect(component.deleteError).toBe('');
  });

  it('surfaces the server message on delete failure', async () => {
    await setUp();
    groups.deleteResult = throwError(() => httpError(409, 'In use'));

    component.confirmDelete(makeGroup({ id: 'g1' }));
    component.executeDelete();
    await fixture.whenStable();

    expect(component.deleteError).toBe('In use');
    expect(component.deleting).toBe(false);
  });

  it('navigates to the group detail page on view', async () => {
    await setUp();

    component.viewGroup(makeGroup({ id: 'g7' }));

    expect(navigateSpy).toHaveBeenCalledWith(['/screen-groups', 'g7']);
  });

  it('navigates home on goBack', async () => {
    await setUp();

    component.goBack();

    expect(navigateSpy).toHaveBeenCalledWith(['/']);
  });
});
