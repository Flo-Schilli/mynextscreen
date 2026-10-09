import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { ScreenRemoteCommandService } from './screen-remote-command.service';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { SecretCipher } from '../common/secret-cipher.service';
import { SiteAgentCommandType, ONBOARDING_LAST_STEP } from './site-agent-command.enum';
import { ScreenReachability } from './screen-reachability.enum';
import type { AgentScreenReportDto } from './dto/agent-report.dto';
import { DevmodeKeyStatus } from './devmode-key-status.enum';
import { SshStatus } from './ssh-status.enum';
import { SCREEN_ONBOARDING_CHECKED, SCREEN_REACHABILITY_CHANGED } from './screen-onboarding.event';
import {
  AUDIT_SCREEN_REMOTE_ADDRESS_CHANGED,
  AUDIT_SCREEN_REMOTE_COMMAND,
  AUDIT_SCREEN_REMOTE_ONBOARDED,
} from '../audit-log/audit.events';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screenRemoteControls, screens, siteAgents } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScreenRemoteCommandService', () => {
  let db: DrizzleDB;
  let service: ScreenRemoteCommandService;
  let remoteControls: ScreenRemoteControlService;
  let sse: { push: jest.Mock; isConnected: jest.Mock };
  let emitter: { emit: jest.Mock };
  let orgId: string;
  let agentId: string;
  let screenId: string;

  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const encryptionKey = Buffer.alloc(32, 7).toString('base64');

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    sse = { push: jest.fn().mockReturnValue(true), isConnected: jest.fn().mockReturnValue(true) };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenRemoteCommandService,
        ScreenRemoteControlService,
        SecretCipher,
        { provide: DRIZZLE, useValue: db },
        { provide: SiteAgentSseService, useValue: sse },
        { provide: EventEmitter2, useValue: emitter },
        { provide: ConfigService, useValue: { get: jest.fn(() => encryptionKey) } },
      ],
    }).compile();
    service = module.get(ScreenRemoteCommandService);
    remoteControls = module.get(ScreenRemoteControlService);

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    const [agent] = await db
      .insert(siteAgents)
      .values({ organisationId: orgId, name: 'Venue North' })
      .returning();
    agentId = agent.id;
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Foyer left',
        resolution: '1920x1080',
        location: 'Foyer',
        apiKeyHash: 'hash',
      })
      .returning();
    screenId = screen.id;
  });

  async function assignToAgent() {
    await remoteControls.upsert(orgId, screenId, { agentId }, userId);
  }

  async function remoteRow() {
    const [row] = await db
      .select()
      .from(screenRemoteControls)
      .where(eq(screenRemoteControls.screenId, screenId));
    return row;
  }

  function emitted(name: string) {
    return emitter.emit.mock.calls.filter(([n]) => n === name).map(([, payload]) => payload);
  }

  describe('dispatchManual', () => {
    it('pushes the command to the screen agent with a correlation id', async () => {
      await assignToAgent();

      const result = await service.dispatchManual(
        orgId,
        screenId,
        SiteAgentCommandType.Launch,
        userId,
      );

      expect(result.commandId).toEqual(expect.any(String));
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({
          commandId: result.commandId,
          type: SiteAgentCommandType.Launch,
          screenId,
        }),
      );
    });

    it('audits who asked for it', async () => {
      await assignToAgent();

      await service.dispatchManual(orgId, screenId, SiteAgentCommandType.Wake, userId);

      expect(emitted(AUDIT_SCREEN_REMOTE_COMMAND)[0]).toMatchObject({
        screenId,
        userId,
        details: { type: SiteAgentCommandType.Wake },
      });
    });

    // Queueing would mean a "start the app now" firing six hours later; the
    // operator needs to know the venue is unreachable instead.
    it('refuses with 409 when the agent is offline', async () => {
      await assignToAgent();
      sse.push.mockReturnValue(false);

      await expect(
        service.dispatchManual(orgId, screenId, SiteAgentCommandType.Launch, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses with 409 when the screen has no agent at all', async () => {
      await remoteControls.upsert(orgId, screenId, { localIp: '10.0.0.1' }, userId);

      await expect(
        service.dispatchManual(orgId, screenId, SiteAgentCommandType.Launch, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('does not audit a command it could not deliver', async () => {
      await assignToAgent();
      sse.push.mockReturnValue(false);

      await service
        .dispatchManual(orgId, screenId, SiteAgentCommandType.Launch, userId)
        .catch(() => undefined);

      expect(emitted(AUDIT_SCREEN_REMOTE_COMMAND)).toHaveLength(0);
    });
  });

  describe('dispatchCheck', () => {
    it('carries the step the wizard asked for', async () => {
      await assignToAgent();

      await service.dispatchCheck(orgId, screenId, 4);

      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.Check, step: 4, screenId }),
      );
    });
  });

  describe('applyReport', () => {
    beforeEach(assignToAgent);

    it('stores the probe result and the time it was taken', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        reachability: ScreenReachability.Reachable,
      });

      const row = await remoteRow();
      expect(row.reachability).toBe(ScreenReachability.Reachable);
      expect(row.lastProbeAt).not.toBeNull();
    });

    it('keeps the failure detail only while the TV is unreachable', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        reachability: ScreenReachability.Unreachable,
        detail: 'ETIMEDOUT',
      });
      expect((await remoteRow()).lastProbeError).toBe('ETIMEDOUT');

      await service.applyReport(agentId, orgId, {
        screenId,
        reachability: ScreenReachability.Reachable,
      });
      expect((await remoteRow()).lastProbeError).toBeNull();
    });

    describe('an announced app launch', () => {
      const probe = (extra: Partial<AgentScreenReportDto> = {}): AgentScreenReportDto => ({
        screenId,
        reachability: ScreenReachability.Reachable,
        ...extra,
      });

      it('is stored on the server clock and passed on to the dashboard', async () => {
        const before = Date.now();

        await service.applyReport(agentId, orgId, probe({ appLaunchInSeconds: 180 }));

        const planned = (await remoteRow()).appLaunchPlannedAt as Date;
        expect(planned.getTime()).toBeGreaterThanOrEqual(before + 180_000);
        expect(planned.getTime()).toBeLessThanOrEqual(Date.now() + 180_000);
        expect(emitted(SCREEN_REACHABILITY_CHANGED)[0]).toMatchObject({
          appLaunchPlannedAt: planned,
        });
      });

      // The agent stops announcing once it launched or the set went away.
      it('is cleared by a probe report without one', async () => {
        await service.applyReport(agentId, orgId, probe({ appLaunchInSeconds: 180 }));

        await service.applyReport(agentId, orgId, probe());

        expect((await remoteRow()).appLaunchPlannedAt).toBeNull();
      });

      it('is cleared by a launch', async () => {
        await service.applyReport(agentId, orgId, probe({ appLaunchInSeconds: 180 }));

        await service.applyReport(agentId, orgId, { screenId, launched: true });

        expect((await remoteRow()).appLaunchPlannedAt).toBeNull();
      });

      it('is not passed on alongside a launch in the same report', async () => {
        await service.applyReport(
          agentId,
          orgId,
          probe({ launched: true, appLaunchInSeconds: 180 }),
        );

        expect(emitted(SCREEN_REACHABILITY_CHANGED)[0]).toMatchObject({
          appLaunchPlannedAt: null,
        });
      });

      it('is left alone by a report that did not probe', async () => {
        await service.applyReport(agentId, orgId, probe({ appLaunchInSeconds: 180 }));

        await service.applyReport(agentId, orgId, {
          screenId,
          sshHostKeyFingerprint: 'SHA256:abc',
        });

        expect((await remoteRow()).appLaunchPlannedAt).not.toBeNull();
      });

      // A wait no agent rule can produce means the agent's numbers are off.
      it('is dropped when it lies implausibly far ahead', async () => {
        await service.applyReport(agentId, orgId, probe({ appLaunchInSeconds: 2 * 60 * 60 }));

        expect((await remoteRow()).appLaunchPlannedAt).toBeNull();
      });
    });

    describe('a set found under a new address', () => {
      async function withMac(localIp = '192.168.1.50') {
        await remoteControls.upsert(
          orgId,
          screenId,
          { agentId, localIp, macAddress: 'AA:BB:CC:DD:EE:FF' },
          userId,
        );
        emitter.emit.mockClear();
      }

      it('stores the new address, audits the move and tells the dashboard', async () => {
        await withMac();

        await service.applyReport(agentId, orgId, {
          screenId,
          reachability: ScreenReachability.Reachable,
          localIp: '192.168.1.77',
        });

        expect((await remoteRow()).localIp).toBe('192.168.1.77');
        expect(emitted(AUDIT_SCREEN_REMOTE_ADDRESS_CHANGED)).toEqual([
          expect.objectContaining({
            screenId,
            details: { from: '192.168.1.50', to: '192.168.1.77', origin: 'agent' },
          }),
        ]);
        expect(emitted(SCREEN_REACHABILITY_CHANGED)).toEqual([
          expect.objectContaining({ localIp: '192.168.1.77' }),
        ]);
      });

      it('ignores an address for a screen without a MAC', async () => {
        await remoteControls.upsert(orgId, screenId, { agentId, localIp: '192.168.1.50' }, userId);

        await service.applyReport(agentId, orgId, { screenId, localIp: '192.168.1.77' });

        expect((await remoteRow()).localIp).toBe('192.168.1.50');
        expect(emitted(AUDIT_SCREEN_REMOTE_ADDRESS_CHANGED)).toEqual([]);
      });

      it.each(['127.0.0.1', '169.254.10.2', '239.255.255.250', '0.0.0.0'])(
        'refuses %s as a display address',
        async (address) => {
          await withMac();

          await service.applyReport(agentId, orgId, { screenId, localIp: address });

          expect((await remoteRow()).localIp).toBe('192.168.1.50');
        },
      );

      it('tells the dashboard about a move reported without a probe result', async () => {
        await withMac();

        await service.applyReport(agentId, orgId, { screenId, localIp: '192.168.1.77' });

        expect(emitted(SCREEN_REACHABILITY_CHANGED)).toEqual([
          expect.objectContaining({ localIp: '192.168.1.77', reachability: 'reachable' }),
        ]);
      });

      it('does not audit an address that did not change', async () => {
        await withMac('192.168.1.77');

        await service.applyReport(agentId, orgId, { screenId, localIp: '192.168.1.77' });

        expect(emitted(AUDIT_SCREEN_REMOTE_ADDRESS_CHANGED)).toEqual([]);
      });
    });

    it('records the version the TV reports as installed', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        installedAppId: 'com.mynextscreen.webos',
        installedAppVersion: '0.15.0',
      });

      const row = await remoteRow();
      expect(row.installedAppId).toBe('com.mynextscreen.webos');
      expect(row.installedAppVersion).toBe('0.15.0');
      expect(row.installedAppVersionAt).not.toBeNull();
    });

    /**
     * Developer Mode deletes the app when the session expires. Keeping the last
     * known version would have the dashboard claim an app is installed that is
     * not there any more.
     */
    it('clears the version when the set reports the app id without one', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        installedAppId: 'com.mynextscreen.webos',
        installedAppVersion: '0.15.0',
      });

      await service.applyReport(agentId, orgId, {
        screenId,
        installedAppId: 'com.mynextscreen.webos',
      });

      const row = await remoteRow();
      expect(row.installedAppVersion).toBeNull();
      expect(row.installedAppId).toBe('com.mynextscreen.webos');
    });

    // A probe round says nothing about SSH; blanking it would discard exactly
    // what the operator needs to see.
    it('leaves statuses the agent did not report untouched', async () => {
      await service.applyReport(agentId, orgId, { screenId, sshStatus: SshStatus.Ok });

      await service.applyReport(agentId, orgId, {
        screenId,
        reachability: ScreenReachability.Reachable,
      });

      expect((await remoteRow()).sshStatus).toBe(SshStatus.Ok);
    });

    it('records a successful Developer Mode extension and moves the clock', async () => {
      await service.applyReport(agentId, orgId, { screenId, devmodeExtended: true });

      const row = await remoteRow();
      expect(row.lastDevmodeExtendOk).toBe(true);
      expect(row.lastDevmodeExtendAt).not.toBeNull();
    });

    // A failed attempt must leave the extension due, so it retries the next
    // time the TV is on rather than waiting out another full interval.
    it('records a failed extension without moving the clock', async () => {
      await service.applyReport(agentId, orgId, { screenId, devmodeExtended: false });

      const row = await remoteRow();
      expect(row.lastDevmodeExtendOk).toBe(false);
      expect(row.lastDevmodeExtendAt).toBeNull();
    });

    it('stamps a launch and a wake', async () => {
      await service.applyReport(agentId, orgId, { screenId, launched: true, woken: true });

      const row = await remoteRow();
      expect(row.lastLaunchAt).not.toBeNull();
      expect(row.lastWakeAt).not.toBeNull();
    });

    it('pins the SSH host key the agent saw', async () => {
      await service.applyReport(agentId, orgId, { screenId, sshHostKeyFingerprint: 'SHA256:abc' });

      expect((await remoteRow()).sshHostKeyFingerprint).toBe('SHA256:abc');
    });

    it('emits a reachability event for the dashboard', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        reachability: ScreenReachability.Unreachable,
      });

      expect(emitted(SCREEN_REACHABILITY_CHANGED)[0]).toMatchObject({
        screenId,
        reachability: ScreenReachability.Unreachable,
      });
    });

    // One agent must not be able to write telemetry onto another venue's screen.
    it('ignores a report for a screen the agent does not manage', async () => {
      const [other] = await db
        .insert(siteAgents)
        .values({ organisationId: orgId, name: 'Venue South' })
        .returning();

      await service.applyReport(other.id, orgId, {
        screenId,
        reachability: ScreenReachability.Unreachable,
      });

      expect((await remoteRow()).reachability).toBe(ScreenReachability.Unknown);
    });
  });

  describe('onboarding progress', () => {
    beforeEach(assignToAgent);

    it('advances past a step that passed', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        step: 2,
        reachability: ScreenReachability.Reachable,
      });

      expect((await remoteRow()).onboardingStep).toBe(3);
    });

    // Leaving the operator on the failing step is the point: that step's
    // instructions are the ones they still need.
    it('does not advance past a step that failed', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        step: 2,
        reachability: ScreenReachability.Unreachable,
        detail: 'ETIMEDOUT',
      });

      expect((await remoteRow()).onboardingStep).toBe(1);
    });

    it.each([
      ['key server off', { keyStatus: DevmodeKeyStatus.KeyServerOff }],
      ['wrong passphrase', { keyStatus: DevmodeKeyStatus.WrongPassphrase }],
      ['ssh auth failure', { sshStatus: SshStatus.AuthFailed }],
      ['failed devmode extension', { devmodeExtended: false }],
    ])('treats %s as a failed check', async (_label, payload) => {
      await service.applyReport(agentId, orgId, { screenId, step: 4, ...payload });

      const checks = emitted(SCREEN_ONBOARDING_CHECKED);
      expect(checks[0].ok).toBe(false);
    });

    it('reports the result with the command id so the wizard can pair it up', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        step: 4,
        commandId: '990e8400-e29b-41d4-a716-446655440000',
        keyStatus: DevmodeKeyStatus.Ok,
      });

      expect(emitted(SCREEN_ONBOARDING_CHECKED)[0]).toMatchObject({
        commandId: '990e8400-e29b-41d4-a716-446655440000',
        step: 4,
        ok: true,
      });
    });

    it('never moves the step backwards when an earlier check is re-run', async () => {
      await db
        .update(screenRemoteControls)
        .set({ onboardingStep: 6 })
        .where(eq(screenRemoteControls.screenId, screenId));

      await service.applyReport(agentId, orgId, {
        screenId,
        step: 2,
        reachability: ScreenReachability.Reachable,
      });

      expect((await remoteRow()).onboardingStep).toBe(6);
    });

    it('marks onboarding complete on the last step and audits it', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        step: ONBOARDING_LAST_STEP,
        devmodeExtended: true,
      });

      const row = await remoteRow();
      expect(row.onboardingCompletedAt).not.toBeNull();
      expect(row.onboardingStep).toBe(ONBOARDING_LAST_STEP);
      expect(emitted(AUDIT_SCREEN_REMOTE_ONBOARDED)).toHaveLength(1);
    });

    it('emits no check result for a plain telemetry report', async () => {
      await service.applyReport(agentId, orgId, {
        screenId,
        reachability: ScreenReachability.Reachable,
      });

      expect(emitted(SCREEN_ONBOARDING_CHECKED)).toHaveLength(0);
    });
  });

  describe('handleConfigChanged', () => {
    it('tells every affected agent to re-pull', () => {
      service.handleConfigChanged({ agentIds: [agentId, 'other-agent'] });

      expect(sse.push).toHaveBeenCalledTimes(2);
      expect(sse.push).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({ type: SiteAgentCommandType.ReloadConfig }),
      );
    });

    // Re-pulling is idempotent and the agent polls anyway, so a missed push
    // costs at most one interval — no reason to fail anything over it.
    it('does not throw when the agent is offline', () => {
      sse.push.mockReturnValue(false);

      expect(() => service.handleConfigChanged({ agentIds: [agentId] })).not.toThrow();
    });
  });
});
