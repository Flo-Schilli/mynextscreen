import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LiveStreams } from './live-streams';
import { LiveStreamCard } from './live-stream-card';
import { LiveStreamService } from './live-stream.service';
import { ScreenService } from '../screens/screen.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { MemberService } from '../settings/users/member.service';
import {
  LiveStream,
  CreateLiveStreamRequest,
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  UpdateLiveStreamRequest,
} from './live-stream.model';
import { Screen } from '../screens/screen.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { MyMembership } from '../settings/users/member.model';

const ORG_ID = 'org1';

function makeStream(overrides: Partial<LiveStream> = {}): LiveStream {
  return {
    id: 'ls-1',
    organisationId: ORG_ID,
    name: 'Main Stage',
    sourceUrl: 'rtmp://source/live',
    protocol: 'rtmp',
    status: 'idle',
    transcodingPreset: 'high_1080p',
    audioEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function membership(role: MyMembership['role'], orgId: string): MyMembership {
  return { id: 'm-' + orgId, userId: 'u1', organisationId: orgId, role, createdAt: 'now' };
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
  failMemberships = false;
  getMyMemberships(): Observable<MyMembership[]> {
    return this.failMemberships ? throwError(() => new Error('boom')) : of(this.memberships);
  }
}

class LiveStreamServiceStub {
  getAllResult: Observable<LiveStream[]> = of([]);
  createResult: Observable<LiveStream> = of(makeStream());
  updateResult: Observable<LiveStream> = of(makeStream());
  deleteResult: Observable<void> = of(undefined);
  activateResult: Observable<ActivateStreamResponse> = of({
    stream: makeStream({ status: 'active' }),
    warnings: [],
  });
  deactivateResult: Observable<LiveStream> = of(makeStream({ status: 'idle' }));

  getAllCalls: string[] = [];
  createArgs: { orgId: string; dto: CreateLiveStreamRequest } | null = null;
  updateArgs: { orgId: string; id: string; dto: UpdateLiveStreamRequest } | null = null;
  deleteArgs: { orgId: string; id: string } | null = null;
  activateArgs: { orgId: string; id: string; dto: ActivateLiveStreamRequest } | null = null;
  deactivateArgs: { orgId: string; id: string } | null = null;

  getAll(orgId: string): Observable<LiveStream[]> {
    this.getAllCalls.push(orgId);
    return this.getAllResult;
  }
  create(orgId: string, dto: CreateLiveStreamRequest): Observable<LiveStream> {
    this.createArgs = { orgId, dto };
    return this.createResult;
  }
  update(orgId: string, id: string, dto: UpdateLiveStreamRequest): Observable<LiveStream> {
    this.updateArgs = { orgId, id, dto };
    return this.updateResult;
  }
  delete(orgId: string, id: string): Observable<void> {
    this.deleteArgs = { orgId, id };
    return this.deleteResult;
  }
  activate(
    orgId: string,
    id: string,
    dto: ActivateLiveStreamRequest,
  ): Observable<ActivateStreamResponse> {
    this.activateArgs = { orgId, id, dto };
    return this.activateResult;
  }
  deactivate(orgId: string, id: string): Observable<LiveStream> {
    this.deactivateArgs = { orgId, id };
    return this.deactivateResult;
  }
}

class ScreenServiceStub {
  getAllResult: Observable<Screen[]> = of([]);
  getAll(): Observable<Screen[]> {
    return this.getAllResult;
  }
}

class ScreenGroupServiceStub {
  getAllResult: Observable<ScreenGroup[]> = of([]);
  getAll(): Observable<ScreenGroup[]> {
    return this.getAllResult;
  }
}

describe('LiveStreams (list container)', () => {
  let fixture: ComponentFixture<LiveStreams>;
  let component: LiveStreams;
  let member: MemberServiceStub;
  let streams: LiveStreamServiceStub;
  let screens: ScreenServiceStub;
  let groups: ScreenGroupServiceStub;
  let navigateSpy: ReturnType<typeof vi.fn>;

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(LiveStreams);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    member = new MemberServiceStub();
    streams = new LiveStreamServiceStub();
    screens = new ScreenServiceStub();
    groups = new ScreenGroupServiceStub();
    navigateSpy = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MemberService, useValue: member },
        { provide: LiveStreamService, useValue: streams },
        { provide: ScreenService, useValue: screens },
        { provide: ScreenGroupService, useValue: groups },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
  });

  describe('org context resolution', () => {
    it('prefers the org_admin membership for the org context', async () => {
      member.memberships = [membership('editor', 'orgE'), membership('org_admin', 'orgA')];
      await setUp();
      expect(component.orgId).toBe('orgA');
      expect(streams.getAllCalls).toContain('orgA');
      expect(component.loading).toBe(false);
    });

    it('falls back to the first membership when none is org_admin', async () => {
      member.memberships = [membership('editor', 'orgE'), membership('viewer', 'orgV')];
      await setUp();
      expect(component.orgId).toBe('orgE');
      expect(streams.getAllCalls).toContain('orgE');
    });

    it('reports an error when the user belongs to no organisation', async () => {
      member.memberships = [];
      await setUp();
      expect(component.loadError).toContain('not a member of any organisation');
      expect(component.loading).toBe(false);
    });

    it('reports an error when the memberships request fails', async () => {
      member.failMemberships = true;
      await setUp();
      expect(component.loadError).toBe('Failed to load organisation context.');
      expect(component.loading).toBe(false);
    });
  });

  describe('data loading', () => {
    it('renders the empty state when there are no streams', async () => {
      await setUp();
      expect(fixture.debugElement.query(By.css('.empty-state'))).not.toBeNull();
      expect(fixture.debugElement.query(By.directive(LiveStreamCard))).toBeNull();
    });

    it('renders one card per stream in a grid', async () => {
      streams.getAllResult = of([makeStream(), makeStream({ id: 'ls-2', name: 'Stage B' })]);
      await setUp();
      const cards = fixture.debugElement.queryAll(By.directive(LiveStreamCard));
      expect(cards.length).toBe(2);
      expect(fixture.debugElement.query(By.css('.stream-grid'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.empty-state'))).toBeNull();
    });

    it('maps a 403 to an access-denied error', async () => {
      streams.getAllResult = throwError(() => httpError(403));
      await setUp();
      expect(component.loadError).toBe('Access denied.');
    });

    it('maps other errors to a generic load failure', async () => {
      streams.getAllResult = throwError(() => httpError(500));
      await setUp();
      expect(component.loadError).toBe('Failed to load live streams.');
    });
  });

  describe('navigation', () => {
    it('navigates to the detail route when a card emits open', async () => {
      await setUp();
      component.openDetail(makeStream({ id: 'ls-7' }));
      expect(navigateSpy).toHaveBeenCalledWith(['/live-streams', 'ls-7']);
    });
  });

  describe('create flow', () => {
    it('opens and cancels the create form', async () => {
      await setUp();
      component.openCreateForm();
      expect(component.showCreateForm).toBe(true);
      component.cancelCreate();
      expect(component.showCreateForm).toBe(false);
    });

    it('creates a stream, closes the form and reloads', async () => {
      await setUp();
      const dto: CreateLiveStreamRequest = { name: 'New', sourceUrl: 'rtmp://n', protocol: 'rtmp' };
      streams.getAllResult = of([makeStream({ id: 'new' })]);
      component.openCreateForm();
      component.submitCreate(dto);
      await fixture.whenStable();
      expect(streams.createArgs).toEqual({ orgId: ORG_ID, dto });
      expect(component.creating).toBe(false);
      expect(component.showCreateForm).toBe(false);
      expect(component.streams.length).toBe(1);
    });

    it('surfaces the server message on create failure and keeps the form open', async () => {
      await setUp();
      streams.createResult = throwError(() => httpError(400, 'Name taken'));
      component.openCreateForm();
      component.submitCreate({ name: 'X', sourceUrl: 'rtmp://x', protocol: 'rtmp' });
      await fixture.whenStable();
      expect(component.createError).toBe('Name taken');
      expect(component.creating).toBe(false);
      expect(component.showCreateForm).toBe(true);
    });
  });

  describe('quick toggle from a card', () => {
    it('deactivates an active stream and reloads', async () => {
      await setUp();
      component.toggleStream(makeStream({ id: 'ls-2', status: 'active' }));
      await fixture.whenStable();
      expect(streams.deactivateArgs).toEqual({ orgId: ORG_ID, id: 'ls-2' });
      expect(component.actionError).toBe('');
    });

    it('navigates to detail to pick targets when going live from a card', async () => {
      await setUp();
      component.toggleStream(makeStream({ id: 'ls-3', status: 'idle' }));
      expect(navigateSpy).toHaveBeenCalledWith(['/live-streams', 'ls-3']);
      expect(streams.activateArgs).toBeNull();
    });

    it('surfaces the server message on deactivate failure', async () => {
      await setUp();
      streams.deactivateResult = throwError(() => httpError(500, 'Stop failed'));
      component.toggleStream(makeStream({ status: 'active' }));
      await fixture.whenStable();
      expect(component.actionError).toBe('Stop failed');
    });
  });

  describe('delete flow', () => {
    it('deletes a stream and reloads', async () => {
      await setUp();
      streams.getAllResult = of([]);
      component.confirmDelete(makeStream({ id: 'ls-9' }));
      expect(component.deletingStream?.id).toBe('ls-9');
      component.executeDelete();
      await fixture.whenStable();
      expect(streams.deleteArgs).toEqual({ orgId: ORG_ID, id: 'ls-9' });
      expect(component.deletingStream).toBeNull();
      expect(component.deleting).toBe(false);
    });

    it('does nothing on executeDelete when no stream is selected', async () => {
      await setUp();
      component.executeDelete();
      expect(streams.deleteArgs).toBeNull();
      expect(component.deleting).toBe(false);
    });

    it('surfaces the server message on delete failure', async () => {
      await setUp();
      streams.deleteResult = throwError(() => httpError(409, 'In use'));
      component.confirmDelete(makeStream());
      component.executeDelete();
      await fixture.whenStable();
      expect(component.deleteError).toBe('In use');
      expect(component.deletingStream).not.toBeNull();
    });
  });

  describe('subtitle', () => {
    it('summarises live/total when streams exist', async () => {
      streams.getAllResult = of([makeStream({ status: 'active' }), makeStream({ id: 'ls-2' })]);
      await setUp();
      expect(component.streamSubtitle).toBe('1 live · 2 streams');
    });
  });
});
