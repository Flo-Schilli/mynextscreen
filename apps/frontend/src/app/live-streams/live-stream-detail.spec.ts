import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LiveStreamDetail } from './live-stream-detail';
import { LiveStreamService } from './live-stream.service';
import { ScreenService } from '../screens/screen.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { MemberService } from '../settings/users/member.service';
import { ToastService } from '../shared/toast/toast.service';
import {
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  LiveStream,
  StreamHealthState,
  UpdateLiveStreamRequest,
} from './live-stream.model';
import { Screen } from '../screens/screen.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { MyMembership } from '../settings/users/member.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

const ORG_ID = 'org1';
const STREAM_ID = 'ls-1';

function makeStream(overrides: Partial<LiveStream> = {}): LiveStream {
  return {
    id: STREAM_ID,
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

function makeScreen(id: string): Screen {
  return {
    id,
    organisationId: ORG_ID,
    name: 'Screen ' + id,
    resolution: '1920x1080',
    location: 'Lobby',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: 'now',
    updatedAt: 'now',
  };
}

function makeGroup(id: string, screenCount: number): ScreenGroup {
  return {
    id,
    organisationId: ORG_ID,
    name: 'Group ' + id,
    mode: 'mirror',
    color: '#6d6cf6',
    icon: 'Groups',
    gridColumns: null,
    gridRows: null,
    screens: Array.from({ length: screenCount }, (_, i) => ({
      id: `${id}-s${i}`,
      name: `s${i}`,
      location: '',
      resolution: '1920x1080',
      isOnline: false,
      groupId: id,
      gridRow: null,
      gridColumn: null,
    })),
    createdAt: 'now',
    updatedAt: 'now',
  };
}

function membership(orgId: string): MyMembership {
  return { id: 'm', userId: 'u1', organisationId: orgId, role: 'org_admin', createdAt: 'now' };
}

class MemberServiceStub {
  getMyMemberships(): Observable<MyMembership[]> {
    return of([membership(ORG_ID)]);
  }
}

class LiveStreamServiceStub {
  getOneResult: Observable<LiveStream> = of(makeStream());
  updateResult: Observable<LiveStream> = of(makeStream({ name: 'Renamed' }));
  activateResult: Observable<ActivateStreamResponse> = of({
    stream: makeStream({ status: 'active' }),
    warnings: [],
  });
  deactivateResult: Observable<LiveStream> = of(makeStream({ status: 'idle' }));
  deleteResult: Observable<void> = of(undefined);
  healthResult: Observable<StreamHealthState> = of({
    streamId: STREAM_ID,
    status: 'active',
    health: 'healthy',
    checkedAt: 'now',
  });

  updateArgs: { id: string; dto: UpdateLiveStreamRequest } | null = null;
  activateArgs: { id: string; dto: ActivateLiveStreamRequest } | null = null;
  deactivateCount = 0;
  activateCount = 0;
  deleteArgs: string | null = null;

  getOne(): Observable<LiveStream> {
    return this.getOneResult;
  }
  update(_org: string, id: string, dto: UpdateLiveStreamRequest): Observable<LiveStream> {
    this.updateArgs = { id, dto };
    return this.updateResult;
  }
  activate(
    _org: string,
    id: string,
    dto: ActivateLiveStreamRequest,
  ): Observable<ActivateStreamResponse> {
    this.activateArgs = { id, dto };
    this.activateCount++;
    return this.activateResult;
  }
  deactivate(): Observable<LiveStream> {
    this.deactivateCount++;
    return this.deactivateResult;
  }
  delete(_org: string, id: string): Observable<void> {
    this.deleteArgs = id;
    return this.deleteResult;
  }
  getHealth(): Observable<StreamHealthState> {
    return this.healthResult;
  }
}

class ScreenServiceStub {
  result: Observable<Screen[]> = of([makeScreen('s1'), makeScreen('s2')]);
  getAll(): Observable<Screen[]> {
    return this.result;
  }
}

class ScreenGroupServiceStub {
  result: Observable<ScreenGroup[]> = of([makeGroup('g1', 3)]);
  getAll(): Observable<ScreenGroup[]> {
    return this.result;
  }
}

class ToastServiceStub {
  success = vi.fn();
  error = vi.fn();
  info = vi.fn();
}

describe('LiveStreamDetail', () => {
  let fixture: ComponentFixture<LiveStreamDetail>;
  let component: LiveStreamDetail;
  let streams: LiveStreamServiceStub;
  let toast: ToastServiceStub;
  let navigateSpy: ReturnType<typeof vi.fn>;

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(LiveStreamDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function instance(): Record<string, unknown> {
    return component as unknown as Record<string, unknown>;
  }

  beforeEach(() => {
    streams = new LiveStreamServiceStub();
    toast = new ToastServiceStub();
    navigateSpy = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MemberService, useClass: MemberServiceStub },
        { provide: LiveStreamService, useValue: streams },
        { provide: ScreenService, useClass: ScreenServiceStub },
        { provide: ScreenGroupService, useClass: ScreenGroupServiceStub },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: { navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => STREAM_ID } } },
        },
      ],
    });
  });

  it('loads the stream, screens, groups and health', async () => {
    await setUp();
    const inst = instance();
    expect((inst['stream'] as () => LiveStream | null)()?.id).toBe(STREAM_ID);
    expect((inst['screens'] as () => Screen[])().length).toBe(2);
    expect((inst['groups'] as () => ScreenGroup[])().length).toBe(1);
    expect((inst['health'] as () => StreamHealthState | null)()?.health).toBe('healthy');
    expect((inst['loading'] as () => boolean)()).toBe(false);
  });

  it('shows a not-found error on 404', async () => {
    streams.getOneResult = throwError(() => ({ status: 404 }));
    await setUp();
    expect((instance()['loadError'] as () => string)()).toBe('Live stream not found.');
  });

  it('commits an inline rename via update', async () => {
    streams.updateResult = of(makeStream({ name: 'Renamed' }));
    await setUp();
    component['nameDraft'] = 'Renamed';
    component['commitName']();
    await fixture.whenStable();
    expect(streams.updateArgs).toEqual({ id: STREAM_ID, dto: { name: 'Renamed' } });
    expect(toast.success).toHaveBeenCalled();
  });

  it('does not call update when the name is unchanged', async () => {
    await setUp();
    component['nameDraft'] = 'Main Stage';
    component['commitName']();
    expect(streams.updateArgs).toBeNull();
  });

  it('activates with selected screen ids on go live', async () => {
    await setUp();
    (instance()['selectedScreenIds'] as { set: (v: string[]) => void }).set(['s1', 's2']);
    component['goLive']();
    await fixture.whenStable();
    expect(streams.activateArgs).toEqual({
      id: STREAM_ID,
      dto: { targetScreenIds: ['s1', 's2'] },
    });
  });

  it('blocks go live with no screens selected', async () => {
    await setUp();
    component['goLive']();
    expect(streams.activateArgs).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('activates with a group id when in group mode', async () => {
    await setUp();
    (instance()['targetMode'] as { set: (v: string) => void }).set('group');
    component['selectGroup']('g1');
    component['goLive']();
    await fixture.whenStable();
    expect(streams.activateArgs).toEqual({ id: STREAM_ID, dto: { targetGroupId: 'g1' } });
  });

  it('deactivates on stop', async () => {
    streams.getOneResult = of(makeStream({ status: 'active' }));
    await setUp();
    component['stop']();
    await fixture.whenStable();
    expect(streams.deactivateCount).toBe(1);
    expect(toast.success).toHaveBeenCalledWith('Stream stopped.');
  });

  it('restart sequences deactivate then activate', async () => {
    streams.getOneResult = of(makeStream({ status: 'active' }));
    await setUp();
    (instance()['selectedScreenIds'] as { set: (v: string[]) => void }).set(['s1']);
    component['restart']();
    await fixture.whenStable();
    expect(streams.deactivateCount).toBe(1);
    expect(streams.activateCount).toBe(1);
    expect(toast.success).toHaveBeenCalledWith('Stream restarted.');
  });

  it('toggles audio only when idle', async () => {
    streams.getOneResult = of(makeStream({ status: 'idle', audioEnabled: true }));
    streams.updateResult = of(makeStream({ audioEnabled: false }));
    await setUp();
    component['toggleAudio']();
    await fixture.whenStable();
    expect(streams.updateArgs).toEqual({ id: STREAM_ID, dto: { audioEnabled: false } });
  });

  it('does not toggle audio while live', async () => {
    streams.getOneResult = of(makeStream({ status: 'active' }));
    await setUp();
    component['toggleAudio']();
    expect(streams.updateArgs).toBeNull();
  });

  it('deletes and navigates back', async () => {
    await setUp();
    component['emitDelete']();
    await fixture.whenStable();
    expect(streams.deleteArgs).toBe(STREAM_ID);
    expect(navigateSpy).toHaveBeenCalledWith(['/live-streams']);
  });

  it('navigates back to the list', async () => {
    await setUp();
    component['goBack']();
    expect(navigateSpy).toHaveBeenCalledWith(['/live-streams']);
  });

  it('reports a read-only target count derived from the live mode', async () => {
    streams.getOneResult = of(makeStream({ status: 'active' }));
    await setUp();
    (instance()['selectedScreenIds'] as { set: (v: string[]) => void }).set(['s1', 's2']);
    expect((instance()['targetCount'] as () => number)()).toBe(2);
  });
});
