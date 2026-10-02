import { CommandHandlerService } from './command-handler.service';
import type { AgentConfigMessage, AgentScreenConfigMessage } from '../protocol/server-protocol';

function screen(overrides: Partial<AgentScreenConfigMessage> = {}): AgentScreenConfigMessage {
  return {
    screenId: 's1',
    name: 'Foyer left',
    localIp: '192.168.1.50',
    macAddress: null,
    ssapPort: 3001,
    devmodePassphrase: 'AEBC72',
    autoLaunchEnabled: true,
    extendDevmodeEnabled: true,
    devmodeExtendIntervalDays: 7,
    lastDevmodeExtendAt: null,
    wakeBeforeScheduleEnabled: false,
    wakeLeadTimeMinutes: 10,
    wakeOnUnreachableEnabled: false,
    playerHeartbeatStale: false,
    nextScheduleStartAt: null,
    sshHostKeyFingerprint: null,
    keyStatus: 'unknown',
    sshStatus: 'unknown',
    ssapStatus: 'unknown',
    onboardingStep: 1,
    ...overrides,
  };
}

describe('CommandHandlerService', () => {
  let handler: CommandHandlerService;
  let stream: { onCommand: jest.Mock };
  let supervisor: {
    runNow: jest.Mock;
    visitNow: jest.Mock;
    runAction: jest.Mock;
    readInstalledVersion: jest.Mock;
    refreshConfigIfDue: jest.Mock;
  };
  let configs: { current: jest.Mock };
  let client: { sendReports: jest.Mock; fetchAppPackage: jest.Mock };
  let reachability: { probe: jest.Mock };
  let devmodeKeys: { obtain: jest.Mock; probeKeyServer: jest.Mock; forget: jest.Mock };
  let ssh: { run: jest.Mock; upload: jest.Mock };
  let ssapKeys: { load: jest.Mock; save: jest.Mock };

  const config = (screens: AgentScreenConfigMessage[]): AgentConfigMessage => ({
    agentId: 'agent-1',
    organisationId: 'org-1',
    probeIntervalMs: 60_000,
    appId: 'com.mynextscreen.webos',
    screens,
  });

  function reported(): Record<string, unknown> {
    return client.sendReports.mock.calls[0][0].screens[0];
  }

  beforeEach(() => {
    stream = { onCommand: jest.fn() };
    supervisor = {
      runNow: jest.fn(),
      visitNow: jest.fn().mockResolvedValue(null),
      runAction: jest.fn(),
      readInstalledVersion: jest.fn().mockResolvedValue('0.15.0'),
      refreshConfigIfDue: jest.fn(),
    };
    configs = { current: jest.fn().mockReturnValue(config([screen()])) };
    client = {
      sendReports: jest.fn().mockResolvedValue(undefined),
      fetchAppPackage: jest.fn().mockResolvedValue(Buffer.from('ipk')),
    };
    reachability = { probe: jest.fn().mockResolvedValue({ reachability: 'reachable' }) };
    devmodeKeys = {
      obtain: jest.fn().mockResolvedValue({ status: 'ok', privateKey: 'PEM' }),
      probeKeyServer: jest.fn().mockResolvedValue({ status: 'ok' }),
      forget: jest.fn(),
    };
    ssh = {
      run: jest.fn().mockResolvedValue({
        status: 'ok',
        stdout: '{"returnValue":true}',
        hostKeyFingerprint: 'SHA256:abc',
      }),
      upload: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    ssapKeys = { load: jest.fn().mockResolvedValue('granted-key'), save: jest.fn() };

    handler = new CommandHandlerService(
      stream as never,
      supervisor as never,
      configs as never,
      client as never,
      reachability as never,
      devmodeKeys as never,
      ssh as never,
      ssapKeys as never,
    );
  });

  describe('registration', () => {
    it('subscribes to the command stream on start', () => {
      handler.onModuleInit();

      expect(stream.onCommand).toHaveBeenCalled();
    });
  });

  describe('reload_config', () => {
    it('forces a pull rather than waiting for the hourly one', async () => {
      await handler.handle({ commandId: 'c1', type: 'reload_config' });

      expect(supervisor.refreshConfigIfDue).toHaveBeenCalledWith(true);
    });
  });

  describe('actions on a screen', () => {
    it.each([
      ['launch', 'launch'],
      ['wake', 'wake'],
      ['extend_devmode', 'extend-devmode'],
    ])('%s acts on that screen immediately', async (type, action) => {
      await handler.handle({ commandId: 'c1', type, screenId: 's1' } as never);

      expect(supervisor.runAction).toHaveBeenCalledWith('s1', action);
    });

    // Dropping the cached key first is the whole point of the command; without
    // it the agent would keep using the key the operator just replaced.
    it('refetch_key discards the cached key before running', async () => {
      await handler.handle({ commandId: 'c1', type: 'refetch_key', screenId: 's1' });

      expect(devmodeKeys.forget).toHaveBeenCalledWith('s1');
      expect(supervisor.runNow).toHaveBeenCalledWith('s1');
    });

    it('ignores a command with no screen', async () => {
      await handler.handle({ commandId: 'c1', type: 'launch' });

      expect(supervisor.runNow).not.toHaveBeenCalled();
    });
  });

  /**
   * Standby deliberately does not end in a round: the set is on its way off, so
   * probing it straight away would record it unreachable and start the backoff
   * on a screen doing exactly what was asked.
   */
  describe('standby', () => {
    it('does not run a round afterwards', async () => {
      await handler.handle({ commandId: 'c1', type: 'standby', screenId: 's1' });

      expect(supervisor.runNow).not.toHaveBeenCalled();
    });

    it('reports the failure rather than staying silent', async () => {
      await handler.handle({ commandId: 'c1', type: 'standby', screenId: 's1' });

      // No SSAP server in this suite, so the connection cannot succeed — what
      // matters is that the command answers at all.
      expect(reported()).toMatchObject({ commandId: 'c1', standby: false });
    });
  });

  /**
   * A person pressing a button has already decided. Running an ordinary round
   * instead put the request back in front of the policy that decides what is
   * *due* — and that refused a wake unless `wakeOnUnreachableEnabled` was set, a
   * launch unless the heartbeat was stale, an extension unless it fell due. The
   * button did nothing at all, not even fail.
   */
  describe('manual commands', () => {
    it.each([
      ['wake', 'wake'],
      ['launch', 'launch'],
      ['extend_devmode', 'extend-devmode'],
    ])('carries out %s outright rather than running a round', async (type, action) => {
      await handler.handle({ commandId: 'c1', type, screenId: 's1' } as never);

      expect(supervisor.runAction).toHaveBeenCalledWith('s1', action);
      expect(supervisor.runNow).not.toHaveBeenCalled();
    });

    // Dropping the key changes what the next round finds, so this one really is
    // "look again".
    it('runs a round after discarding the key', async () => {
      await handler.handle({ commandId: 'c1', type: 'refetch_key', screenId: 's1' });

      expect(devmodeKeys.forget).toHaveBeenCalledWith('s1');
      expect(supervisor.runNow).toHaveBeenCalledWith('s1');
    });
  });

  describe('install_app', () => {
    it('uploads the package and hands it to the install service', async () => {
      await handler.handle({ commandId: 'c1', type: 'install_app', screenId: 's1' });

      expect(client.fetchAppPackage).toHaveBeenCalled();
      expect(ssh.upload).toHaveBeenCalled();
      expect(ssh.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('appInstallService/dev/install'),
      );
      expect(reported()).toMatchObject({
        commandId: 'c1',
        installStatus: 'ok',
        installedAppVersion: '0.15.0',
      });
    });

    /**
     * The install service answers the same whether it took the package or
     * ignored it — measured on a real set, where a success was reported for an
     * install that never happened. Only the set's own answer counts.
     */
    it('fails when the set does not report the app afterwards', async () => {
      supervisor.readInstalledVersion.mockResolvedValue(null);

      await handler.handle({ commandId: 'c1', type: 'install_app', screenId: 's1' });

      expect(reported()).toMatchObject({ installStatus: 'failed' });
    });

    /**
     * A package left behind on a set with little free space is the next problem
     * nobody connects back to this one.
     */
    it('removes the uploaded package even after a failure', async () => {
      ssh.upload.mockResolvedValue({ status: 'unreachable', detail: 'ETIMEDOUT' });

      await handler.handle({ commandId: 'c1', type: 'install_app', screenId: 's1' });

      expect(ssh.run).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('rm -f'));
      expect(reported()).toMatchObject({ installStatus: 'failed' });
    });

    it('reports a package the server could not hand over', async () => {
      client.fetchAppPackage.mockRejectedValue(new Error('404'));

      await handler.handle({ commandId: 'c1', type: 'install_app', screenId: 's1' });

      expect(ssh.upload).not.toHaveBeenCalled();
      expect(reported()).toMatchObject({ installStatus: 'failed', detail: '404' });
    });

    it('ignores a command for a screen it does not look after', async () => {
      configs.current.mockReturnValue(config([]));

      await handler.handle({ commandId: 'c1', type: 'install_app', screenId: 's1' });

      expect(client.fetchAppPackage).not.toHaveBeenCalled();
    });

    it('does not reach the TV at all without a usable key', async () => {
      devmodeKeys.obtain.mockResolvedValue({ status: 'no_passphrase' });

      await handler.handle({ commandId: 'c1', type: 'install_app', screenId: 's1' });

      expect(ssh.upload).not.toHaveBeenCalled();
      expect(reported()).toMatchObject({ installStatus: 'failed', keyStatus: 'no_passphrase' });
    });

    it('step 5 reports the key status', async () => {
      devmodeKeys.obtain.mockResolvedValue({ status: 'key_server_off', detail: 'refused' });

      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 5 });

      expect(reported()).toMatchObject({ step: 5, keyStatus: 'key_server_off', detail: 'refused' });
    });

    it('step 4 reports what the key server probe found', async () => {
      devmodeKeys.probeKeyServer.mockResolvedValue({ status: 'key_server_off', detail: 'refused' });

      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 4 });

      expect(reported()).toMatchObject({ step: 4, keyStatus: 'key_server_off', detail: 'refused' });
    });

    /**
     * The wizard asks for the passphrase in step 5, so step 4 has to pass
     * without one. Going through `obtain` reported `no_passphrase` and left the
     * wizard stuck on its own fourth step.
     */
    it('step 4 does not need a passphrase', async () => {
      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 4 });

      expect(devmodeKeys.obtain).not.toHaveBeenCalled();
      expect(devmodeKeys.probeKeyServer).toHaveBeenCalled();
      expect(reported()).toMatchObject({ step: 4, keyStatus: 'ok' });
    });

    it('step 6 proves SSH works with a command that changes nothing', async () => {
      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 6 });

      expect(ssh.run).toHaveBeenCalledWith(expect.anything(), 'echo mynextscreen-ssh-ok');
      expect(reported()).toMatchObject({ sshStatus: 'ok', sshHostKeyFingerprint: 'SHA256:abc' });
    });

    it('step 6 stops at the key when there is no usable one', async () => {
      devmodeKeys.obtain.mockResolvedValue({ status: 'wrong_passphrase', detail: 'no' });

      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 6 });

      expect(ssh.run).not.toHaveBeenCalled();
      expect(reported()).toMatchObject({ keyStatus: 'wrong_passphrase' });
    });

    it.each([8, 9])('step %i goes through the normal round', async (step) => {
      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step });

      expect(supervisor.visitNow).toHaveBeenCalledWith('s1');
    });

    /**
     * The round used to report itself, which produced a report with no `step`.
     * The server only advances the wizard on a report that carries one, so
     * these two steps failed in the dashboard however well the round had gone.
     */
    it.each([8, 9])('step %i reports the round under its own command', async (step) => {
      supervisor.visitNow.mockResolvedValue({
        screenId: 's1',
        reachability: 'reachable',
        ssapStatus: 'ok',
        launched: true,
      });

      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step });

      expect(reported()).toMatchObject({
        commandId: 'c1',
        step,
        screenId: 's1',
        ssapStatus: 'ok',
        launched: true,
      });
    });

    it('still answers step 8 when the round had nothing to do', async () => {
      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 8 });

      expect(reported()).toMatchObject({ commandId: 'c1', step: 8 });
    });

    // The step is the install, not a look at it: an operator should not have to
    // press a second button for the thing the step is named after.
    it('step 7 installs rather than only checking', async () => {
      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 7 });

      expect(ssh.upload).toHaveBeenCalled();
      expect(reported()).toMatchObject({ commandId: 'c1', step: 7, installStatus: 'ok' });
    });

    it('ignores a check for a screen it does not look after', async () => {
      configs.current.mockReturnValue(config([]));

      await handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 2 });

      expect(client.sendReports).not.toHaveBeenCalled();
    });

    // The wizard is waiting on this result; failing silently would leave the
    // operator looking at a spinner.
    it('does not throw when the result cannot be delivered', async () => {
      client.sendReports.mockRejectedValue(new Error('offline'));

      await expect(
        handler.handle({ commandId: 'c1', type: 'check', screenId: 's1', step: 2 }),
      ).resolves.toBeUndefined();
    });
  });
});
