import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { SiteAgentService } from './site-agent.service';
import {
  MASKED_SECRET,
  type ScreenRemoteControl,
  type SiteAgentListItem,
} from './site-agent.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SCREEN_ID = 'screen-1';
const AGENT_ID = 'agent-1';

function makeRemote(overrides: Partial<ScreenRemoteControl> = {}): ScreenRemoteControl {
  return {
    screenId: SCREEN_ID,
    organisationId: 'org-1',
    agentId: AGENT_ID,
    localIp: '192.168.1.50',
    macAddress: null,
    devmodePassphrase: MASKED_SECRET,
    installedAppId: null,
    installedAppVersion: null,
    installedAppVersionAt: null,
    availableAppVersion: null,
    ssapPort: 3001,
    autoLaunchEnabled: true,
    extendDevmodeEnabled: true,
    devmodeExtendIntervalDays: 7,
    wakeBeforeScheduleEnabled: false,
    wakeLeadTimeMinutes: 10,
    wakeOnUnreachableEnabled: false,
    reachability: 'reachable',
    lastProbeAt: null,
    lastProbeError: null,
    lastLaunchAt: null,
    lastWakeAt: null,
    lastDevmodeExtendAt: null,
    lastDevmodeExtendOk: null,
    keyStatus: 'ok',
    sshStatus: 'ok',
    ssapStatus: 'ok',
    sshHostKeyFingerprint: null,
    onboardingStep: 8,
    onboardingCompletedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('SiteAgentService', () => {
  let service: SiteAgentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        SiteAgentService,
      ],
    });
    service = TestBed.inject(SiteAgentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // The organisation header is added globally by authInterceptor, so these
  // calls must not set it themselves and get it twice.
  it('does not set the organisation header itself', () => {
    service.getAll().subscribe();

    const req = http.expectOne('/api/site-agents');
    expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
    req.flush([]);
  });

  it('lists agents with their screen counts', () => {
    const agents: SiteAgentListItem[] = [];
    service.getAll().subscribe((result) => expect(result).toBe(agents));

    http.expectOne('/api/site-agents').flush(agents);
  });

  it('creates an agent and returns its one-time token', () => {
    service.create({ name: 'Venue North' }).subscribe((created) => {
      expect(created.enrolmentToken).toBe('raw-token');
    });

    const req = http.expectOne('/api/site-agents');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Venue North' });
    req.flush({
      agent: { id: AGENT_ID },
      enrolmentToken: 'raw-token',
      expiresAt: '2026-10-02T10:00:00.000Z',
    });
  });

  it('reissues a token without disconnecting the agent', () => {
    service.reissueEnrolment(AGENT_ID).subscribe();

    const req = http.expectOne(`/api/site-agents/${AGENT_ID}/enrolment-token`);
    expect(req.request.method).toBe('POST');
    req.flush({ enrolmentToken: 'fresh', expiresAt: '2026-10-02T10:00:00.000Z' });
  });

  it('revokes access as a separate action', () => {
    service.revoke(AGENT_ID).subscribe((result) => expect(result.revoked).toBe(2));

    http.expectOne(`/api/site-agents/${AGENT_ID}/revoke`).flush({ revoked: 2 });
  });

  describe('remote control', () => {
    it('reads a screen settings', () => {
      const remote = makeRemote();
      service.getRemoteControl(SCREEN_ID).subscribe((result) => expect(result).toBe(remote));

      http.expectOne(`/api/screens/${SCREEN_ID}/remote-control`).flush(remote);
    });

    // The server never sends the real value, so a client that echoed back what
    // it was given would write the mask into the database.
    it('receives the passphrase masked, never in the clear', () => {
      service.getRemoteControl(SCREEN_ID).subscribe((result) => {
        expect(result.devmodePassphrase).toBe(MASKED_SECRET);
      });

      http.expectOne(`/api/screens/${SCREEN_ID}/remote-control`).flush(makeRemote());
    });

    it('saves with PUT', () => {
      service.updateRemoteControl(SCREEN_ID, { localIp: '10.0.0.5' }).subscribe();

      const req = http.expectOne(`/api/screens/${SCREEN_ID}/remote-control`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ localIp: '10.0.0.5' });
      req.flush(makeRemote());
    });
  });

  describe('removeRemoteControl', () => {
    it('deletes the settings rather than unassigning them', () => {
      service.removeRemoteControl(SCREEN_ID).subscribe();

      const req = http.expectOne(`/api/screens/${SCREEN_ID}/remote-control`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    // A PUT with agentId: null would leave the address, the passphrase and the
    // onboarding progress behind for the next agent to inherit.
    it('does not send a body that could be mistaken for an update', () => {
      service.removeRemoteControl(SCREEN_ID).subscribe();

      const req = http.expectOne(`/api/screens/${SCREEN_ID}/remote-control`);
      expect(req.request.body).toBeNull();
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  describe('remove', () => {
    it('deletes the agent', () => {
      service.remove(AGENT_ID).subscribe();

      const req = http.expectOne(`/api/site-agents/${AGENT_ID}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });

  describe('commands', () => {
    it('dispatches a manual action', () => {
      service.sendCommand(SCREEN_ID, 'launch').subscribe((result) => {
        expect(result.commandId).toBe('cmd-1');
      });

      const req = http.expectOne(`/api/screens/${SCREEN_ID}/remote-control/commands`);
      expect(req.request.body).toEqual({ type: 'launch' });
      req.flush({ commandId: 'cmd-1' });
    });

    it('runs one onboarding step', () => {
      service.runCheck(SCREEN_ID, 4).subscribe();

      const req = http.expectOne(`/api/screens/${SCREEN_ID}/remote-control/checks`);
      expect(req.request.body).toEqual({ step: 4 });
      req.flush({ commandId: 'cmd-2' });
    });

    // The agent being offline is the one failure the operator has to act on,
    // and the UI shows a different message for it.
    it('surfaces a 409 when the agent is not connected', () => {
      service.sendCommand(SCREEN_ID, 'wake').subscribe({
        next: () => expect.unreachable('the request must not succeed'),
        error: (error: { status: number }) => expect(error.status).toBe(409),
      });

      http
        .expectOne(`/api/screens/${SCREEN_ID}/remote-control/commands`)
        .flush({ message: 'Site agent is offline' }, { status: 409, statusText: 'Conflict' });
    });
  });
});
