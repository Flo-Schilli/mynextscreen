import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LiveStreams } from './live-streams';
import { LiveStreamTable } from './live-stream-table';
import { LiveStreamActivateModal } from './live-stream-activate-modal';
import { LiveStreamService } from './live-stream.service';
import { ScreenService } from '../screens/screen.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { MemberService } from '../settings/users/member.service';
import {
  LiveStream,
  CreateLiveStreamRequest,
  UpdateLiveStreamRequest,
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
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

describe('LiveStreams (smart container)', () => {
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

  /**
   * Settle pending async + RxJS callbacks, then render for DOM assertions.
   * The first `detectChanges()` materialises the `@if` block that opening a
   * modal/banner toggles; the second runs cleanly so no check-no-changes
   * mismatch (NG0100) is observed against the just-created child view.
   */
  async function render(): Promise<void> {
    for (let i = 0; i < 6; i++) await Promise.resolve();
    fixture.componentRef.changeDetectorRef.detectChanges();
    fixture.componentRef.changeDetectorRef.detectChanges();
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
      // Arrange
      member.memberships = [membership('editor', 'orgE'), membership('org_admin', 'orgA')];

      // Act
      await setUp();

      // Assert
      expect(component.orgId).toBe('orgA');
      expect(streams.getAllCalls).toContain('orgA');
      expect(component.loading).toBe(false);
    });

    it('falls back to the first membership when none is org_admin', async () => {
      // Arrange
      member.memberships = [membership('editor', 'orgE'), membership('viewer', 'orgV')];

      // Act
      await setUp();

      // Assert
      expect(component.orgId).toBe('orgE');
      expect(streams.getAllCalls).toContain('orgE');
    });

    it('reports an error when the user belongs to no organisation', async () => {
      // Arrange
      member.memberships = [];

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toContain('not a member of any organisation');
      expect(component.loading).toBe(false);
    });

    it('reports an error when the memberships request fails', async () => {
      // Arrange
      member.failMemberships = true;

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toBe('Failed to load organisation context.');
      expect(component.loading).toBe(false);
    });
  });

  describe('data loading', () => {
    it('renders the empty state when there are no streams', async () => {
      // Act
      await setUp();

      // Assert
      expect(fixture.debugElement.query(By.css('.empty-state'))).not.toBeNull();
      expect(fixture.debugElement.query(By.directive(LiveStreamTable))).toBeNull();
    });

    it('renders the table when streams exist', async () => {
      // Arrange
      streams.getAllResult = of([makeStream()]);

      // Act
      await setUp();

      // Assert
      expect(fixture.debugElement.query(By.directive(LiveStreamTable))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.empty-state'))).toBeNull();
    });

    it('maps a 403 to an access-denied error', async () => {
      // Arrange
      streams.getAllResult = throwError(() => httpError(403));

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toBe('Access denied.');
    });

    it('maps other errors to a generic load failure', async () => {
      // Arrange
      streams.getAllResult = throwError(() => httpError(500));

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toBe('Failed to load live streams.');
    });
  });

  describe('create flow', () => {
    it('opens and cancels the create form', async () => {
      // Arrange
      await setUp();

      // Act / Assert
      component.openCreateForm();
      expect(component.showCreateForm).toBe(true);
      component.cancelCreate();
      expect(component.showCreateForm).toBe(false);
    });

    it('creates a stream, closes the form and reloads', async () => {
      // Arrange
      await setUp();
      const dto: CreateLiveStreamRequest = { name: 'New', sourceUrl: 'rtmp://n', protocol: 'rtmp' };
      streams.getAllResult = of([makeStream({ id: 'new' })]);

      // Act
      component.openCreateForm();
      component.submitCreate(dto);
      await fixture.whenStable();

      // Assert
      expect(streams.createArgs).toEqual({ orgId: ORG_ID, dto });
      expect(component.creating).toBe(false);
      expect(component.showCreateForm).toBe(false);
      expect(component.streams.length).toBe(1);
    });

    it('surfaces the server message on create failure and keeps the form open', async () => {
      // Arrange
      await setUp();
      streams.createResult = throwError(() => httpError(400, 'Name taken'));

      // Act
      component.openCreateForm();
      component.submitCreate({ name: 'X', sourceUrl: 'rtmp://x', protocol: 'rtmp' });
      await fixture.whenStable();

      // Assert
      expect(component.createError).toBe('Name taken');
      expect(component.creating).toBe(false);
      expect(component.showCreateForm).toBe(true);
    });
  });

  describe('edit flow', () => {
    it('edits a stream and reloads', async () => {
      // Arrange
      await setUp();
      streams.updateResult = of(makeStream({ name: 'Renamed' }));

      // Act
      component.editStream(makeStream({ id: 'ls-1' }));
      expect(component.editingStream?.id).toBe('ls-1');
      component.submitEdit({ name: 'Renamed' });
      await fixture.whenStable();

      // Assert
      expect(streams.updateArgs).toEqual({ orgId: ORG_ID, id: 'ls-1', dto: { name: 'Renamed' } });
      expect(component.editingStream).toBeNull();
      expect(component.saving).toBe(false);
    });

    it('does nothing on submitEdit when no stream is being edited', async () => {
      // Arrange
      await setUp();

      // Act
      component.submitEdit({ name: 'x' });

      // Assert
      expect(streams.updateArgs).toBeNull();
      expect(component.saving).toBe(false);
    });

    it('surfaces the server message on edit failure', async () => {
      // Arrange
      await setUp();
      streams.updateResult = throwError(() => httpError(400, 'Invalid'));

      // Act
      component.editStream(makeStream());
      component.submitEdit({ name: 'Renamed' });
      await fixture.whenStable();

      // Assert
      expect(component.editError).toBe('Invalid');
      expect(component.editingStream).not.toBeNull();
    });
  });

  describe('delete flow', () => {
    it('deletes a stream and reloads', async () => {
      // Arrange
      await setUp();
      streams.getAllResult = of([]);

      // Act
      component.confirmDelete(makeStream({ id: 'ls-9' }));
      expect(component.deletingStream?.id).toBe('ls-9');
      component.executeDelete();
      await fixture.whenStable();

      // Assert
      expect(streams.deleteArgs).toEqual({ orgId: ORG_ID, id: 'ls-9' });
      expect(component.deletingStream).toBeNull();
      expect(component.deleting).toBe(false);
    });

    it('does nothing on executeDelete when no stream is selected', async () => {
      // Arrange
      await setUp();

      // Act
      component.executeDelete();

      // Assert
      expect(streams.deleteArgs).toBeNull();
      expect(component.deleting).toBe(false);
    });

    it('surfaces the server message on delete failure', async () => {
      // Arrange
      await setUp();
      streams.deleteResult = throwError(() => httpError(409, 'In use'));

      // Act
      component.confirmDelete(makeStream());
      component.executeDelete();
      await fixture.whenStable();

      // Assert
      expect(component.deleteError).toBe('In use');
      expect(component.deletingStream).not.toBeNull();
    });
  });

  describe('activate flow', () => {
    it('opens the activate modal for the selected stream', async () => {
      // Arrange
      streams.getAllResult = of([makeStream()]);
      await setUp();

      // Act
      component.openActivateModal(makeStream());
      await render();

      // Assert
      expect(component.activatingStream).not.toBeNull();
      expect(fixture.debugElement.query(By.directive(LiveStreamActivateModal))).not.toBeNull();
    });

    it('activates, captures warnings and reloads', async () => {
      // Arrange
      await setUp();
      streams.activateResult = of({
        stream: makeStream({ status: 'active' }),
        warnings: ['screen offline'],
      });
      const dto: ActivateLiveStreamRequest = { targetScreenIds: ['s1'] };

      // Act
      component.openActivateModal(makeStream({ id: 'ls-1' }));
      component.submitActivate(dto);
      await render();

      // Assert
      expect(streams.activateArgs).toEqual({ orgId: ORG_ID, id: 'ls-1', dto });
      expect(component.activatingStream).toBeNull();
      expect(component.passthroughWarnings).toEqual(['screen offline']);
      expect(fixture.debugElement.query(By.css('.warning-banner'))).not.toBeNull();
    });

    it('does not set warnings when the response has none', async () => {
      // Arrange
      await setUp();
      streams.activateResult = of({ stream: makeStream({ status: 'active' }), warnings: [] });

      // Act
      component.openActivateModal(makeStream());
      component.submitActivate({ targetGroupId: 'g1' });
      await fixture.whenStable();

      // Assert
      expect(component.passthroughWarnings).toEqual([]);
    });

    it('does nothing on submitActivate when no stream is selected', async () => {
      // Arrange
      await setUp();

      // Act
      component.submitActivate({ targetGroupId: 'g1' });

      // Assert
      expect(streams.activateArgs).toBeNull();
      expect(component.activating).toBe(false);
    });

    it('surfaces the server message on activate failure', async () => {
      // Arrange
      await setUp();
      streams.activateResult = throwError(() => httpError(400, 'No target'));

      // Act
      component.openActivateModal(makeStream());
      component.submitActivate({ targetScreenIds: ['s1'] });
      await fixture.whenStable();

      // Assert
      expect(component.activateError).toBe('No target');
      expect(component.activatingStream).not.toBeNull();
    });

    it('dismisses the passthrough warnings banner', async () => {
      // Arrange: activate produces a warning, rendering the banner
      streams.activateResult = of({ stream: makeStream({ status: 'active' }), warnings: ['w1'] });
      await setUp();
      component.openActivateModal(makeStream());
      component.submitActivate({ targetScreenIds: ['s1'] });
      await render();
      expect(fixture.debugElement.query(By.css('.warning-banner'))).not.toBeNull();

      // Act
      component.dismissWarnings();
      await render();

      // Assert
      expect(component.passthroughWarnings).toEqual([]);
      expect(fixture.debugElement.query(By.css('.warning-banner'))).toBeNull();
    });
  });

  describe('deactivate flow', () => {
    it('deactivates and reloads', async () => {
      // Arrange
      await setUp();

      // Act
      component.deactivateStream(makeStream({ id: 'ls-2', status: 'active' }));
      await fixture.whenStable();

      // Assert
      expect(streams.deactivateArgs).toEqual({ orgId: ORG_ID, id: 'ls-2' });
      expect(component.actionError).toBe('');
    });

    it('surfaces the server message on deactivate failure', async () => {
      // Arrange
      await setUp();
      streams.deactivateResult = throwError(() => httpError(500, 'Stop failed'));

      // Act
      component.deactivateStream(makeStream({ status: 'active' }));
      await fixture.whenStable();

      // Assert
      expect(component.actionError).toBe('Stop failed');
    });
  });

  describe('navigation', () => {
    it('navigates home on goBack', async () => {
      // Arrange
      await setUp();

      // Act
      component.goBack();

      // Assert
      expect(navigateSpy).toHaveBeenCalledWith(['/']);
    });
  });
});
