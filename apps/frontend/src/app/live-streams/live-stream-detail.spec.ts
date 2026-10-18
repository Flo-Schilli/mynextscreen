import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { LiveStreamDetail } from './live-stream-detail';
import { LiveStreamService } from './live-stream.service';
import { ScreenService } from '../screens/screen.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { SiteAgentService } from '../site-agents/site-agent.service';
import { SiteAgentListItem } from '../site-agents/site-agent.model';
import { MemberService } from '../settings/users/member.service';
import { ToastService } from '../shared/toast/toast.service';
import {
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  LiveStream,
  PtzCommand,
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
    sourceType: 'pull',
    agentId: null,
    cameraHost: null,
    ndiSourceName: null,
    qualityPreset: null,
    encoderPref: null,
    status: 'idle',
    transcodingPreset: 'high_1080p',
    audioEnabled: true,
    ptzEnabled: false,
    ptzProtocol: 'visca_udp',
    ptzPort: null,
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
  ptzResult: Observable<void> = of(undefined);
  ptzCommands: PtzCommand[] = [];
  sendPtz(_org: string, _id: string, command: PtzCommand): Observable<void> {
    this.ptzCommands.push(command);
    return this.ptzResult;
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

class SiteAgentServiceStub {
  getAll(): Observable<SiteAgentListItem[]> {
    return of([{ id: 'ag-1', name: 'Venue Agent' } as SiteAgentListItem]);
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
        { provide: SiteAgentService, useClass: SiteAgentServiceStub },
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

  it.each([
    ['capture_plugin_not_ready', 'not ready or its license has not been accepted'],
    ['capture_plugin_status_pending', 'status is still loading'],
  ])('explains a %s refusal on start', async (code, fragment) => {
    streams.getOneResult = of(makeStream({ status: 'idle' }));
    await setUp();
    streams.activateResult = throwError(() => ({ status: 409, error: { message: code } }));
    (instance()['selectedScreenIds'] as { set: (v: string[]) => void }).set(['s1']);

    component['goLive']();
    await fixture.whenStable();

    expect(String(toast.error.mock.calls.at(-1)?.[0])).toContain(fragment);
  });

  it.each([
    ['capture_plugin_not_ready', 'not ready or its license has not been accepted'],
    ['capture_plugin_status_pending', 'status is still loading'],
  ])('explains a %s refusal on restart', async (code, fragment) => {
    streams.getOneResult = of(makeStream({ status: 'active' }));
    await setUp();
    streams.activateResult = throwError(() => ({ status: 409, error: { message: code } }));
    (instance()['selectedScreenIds'] as { set: (v: string[]) => void }).set(['s1']);

    component['restart']();
    await fixture.whenStable();

    expect(String(toast.error.mock.calls.at(-1)?.[0])).toContain(fragment);
  });

  it('labels the error codes an agent reports and shows unknown ones as they came', async () => {
    streams.getOneResult = of(
      makeStream({
        status: 'active',
        sourceType: 'ndi',
        ndiStatus: {
          state: 'error',
          sourceName: null,
          encoder: null,
          fps: null,
          framesDropped: 0,
          uploadLagMs: null,
          error: 'license_required',
        },
      }),
    );
    await setUp();
    expect(fixture.nativeElement.querySelector('.ndi-error')?.textContent).toContain(
      'license has not been accepted',
    );

    expect(component['ndiErrorLabel']('something_new')).toBe('something_new');
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

  describe('NDI stream', () => {
    const ndiStream = (overrides: Partial<LiveStream> = {}): LiveStream =>
      makeStream({
        sourceType: 'ndi',
        sourceUrl: undefined,
        protocol: undefined,
        agentId: 'ag-1',
        cameraHost: '192.168.1.50',
        ndiSourceName: null,
        qualityPreset: '720p30',
        encoderPref: 'auto',
        ...overrides,
      });

    const text = (): string => fixture.nativeElement.textContent as string;

    it('shows agent name, camera IP, fallback source label and encoder', async () => {
      streams.getOneResult = of(ndiStream());
      await setUp();
      expect(text()).toContain('Venue Agent');
      expect(text()).toContain('192.168.1.50');
      expect(text()).toContain('First source of the camera');
      expect(text()).toContain('NDI');
      expect(fixture.nativeElement.querySelector('.src-url')).toBeNull();
    });

    it('shows the configured NDI source name', async () => {
      streams.getOneResult = of(ndiStream({ ndiSourceName: 'CAM (Main)' }));
      await setUp();
      expect(text()).toContain('CAM (Main)');
    });

    it('renders ndiStatus values when present', async () => {
      streams.getOneResult = of(
        ndiStream({
          status: 'active',
          ndiStatus: {
            state: 'streaming',
            sourceName: 'CAM (Actual)',
            encoder: 'libx264',
            fps: 29,
            framesDropped: 7,
            uploadLagMs: 420,
            error: null,
          },
        }),
      );
      await setUp();
      expect(text()).toContain('Streaming');
      expect(text()).toContain('CAM (Actual)');
      expect(text()).toContain('libx264');
      expect(text()).toContain('420 ms');
    });

    it('omits the status block without ndiStatus', async () => {
      streams.getOneResult = of(ndiStream());
      await setUp();
      expect(text()).not.toContain('Upload lag');
    });

    it('PATCHes the quality preset also while the stream is active and toasts success', async () => {
      streams.getOneResult = of(ndiStream({ status: 'active' }));
      streams.updateResult = of(ndiStream({ status: 'active', qualityPreset: '1080p30' }));
      await setUp();
      component['changeQualityPreset']('1080p30');
      expect(streams.updateArgs).toEqual({ id: STREAM_ID, dto: { qualityPreset: '1080p30' } });
      expect(toast.success).toHaveBeenCalled();
    });

    it('toasts the server error when the preset change fails', async () => {
      streams.getOneResult = of(ndiStream());
      streams.updateResult = throwError(() => ({ error: { message: 'nope' } }));
      await setUp();
      component['changeQualityPreset']('preview');
      expect(toast.error).toHaveBeenCalledWith('nope');
    });

    it('does not PATCH when the preset is unchanged', async () => {
      streams.getOneResult = of(ndiStream());
      await setUp();
      component['changeQualityPreset']('720p30');
      expect(streams.updateArgs).toBeNull();
    });

    describe('PTZ', () => {
      const panel = (): HTMLElement | null =>
        fixture.nativeElement.querySelector('app-ptz-control-panel');
      const ptzStream = (overrides: Partial<LiveStream> = {}): LiveStream =>
        ndiStream({ status: 'active', ptzEnabled: true, ...overrides });
      const move: PtzCommand = { action: 'move', direction: 'up', speed: 5 };

      it('renders the panel only for an active NDI stream with PTZ enabled', async () => {
        streams.getOneResult = of(ptzStream());
        await setUp();
        expect(panel()).not.toBeNull();
      });

      it.each([
        ['idle', { status: 'idle' as const }],
        ['ptz disabled', { ptzEnabled: false }],
        ['pull source', { sourceType: 'pull' as const }],
      ])('hides the panel when %s', async (_name, overrides) => {
        streams.getOneResult = of(ptzStream(overrides));
        await setUp();
        expect(panel()).toBeNull();
      });

      it('forwards panel commands to sendPtz without toasting on success', async () => {
        streams.getOneResult = of(ptzStream());
        await setUp();
        component['sendPtz'](move);
        expect(streams.ptzCommands).toEqual([move]);
        expect(toast.error).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
      });

      it('does not send when the panel is not available', async () => {
        streams.getOneResult = of(ptzStream({ status: 'idle' }));
        await setUp();
        component['sendPtz'](move);
        expect(streams.ptzCommands).toEqual([]);
      });

      it('toasts the server message on a 409', async () => {
        streams.getOneResult = of(ptzStream());
        streams.ptzResult = throwError(() => ({
          status: 409,
          error: { message: 'Site agent offline' },
        }));
        await setUp();
        component['sendPtz'](move);
        expect(toast.error).toHaveBeenCalledWith('Site agent offline');
      });

      it('toasts a fallback message and rate-limits repeated errors', async () => {
        streams.getOneResult = of(ptzStream());
        streams.ptzResult = throwError(() => ({ status: 409 }));
        await setUp();
        component['sendPtz'](move);
        component['sendPtz'](move);
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error.mock.calls[0][0]).toContain('camera command');
      });

      it('saves PTZ settings with a parsed port', async () => {
        streams.getOneResult = of(ptzStream());
        streams.updateResult = of(ptzStream({ ptzProtocol: 'visca_tcp', ptzPort: 5000 }));
        await setUp();
        component['ptzProtocolDraft'].set('visca_tcp');
        component['ptzPortDraft'].set('5000');
        component['savePtzSettings']();
        expect(streams.updateArgs).toEqual({
          id: STREAM_ID,
          dto: { ptzEnabled: true, ptzProtocol: 'visca_tcp', ptzPort: 5000 },
        });
        expect(toast.success).toHaveBeenCalled();
      });

      it('rejects an invalid port without calling the API', async () => {
        streams.getOneResult = of(ptzStream());
        await setUp();
        component['ptzPortDraft'].set('70000');
        component['savePtzSettings']();
        expect(streams.updateArgs).toBeNull();
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });
});
