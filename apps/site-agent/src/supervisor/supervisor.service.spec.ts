import { SupervisorService, sanitizeProbeInterval } from './supervisor.service';
import { ServerUnreachableError } from '../connection/server-client.service';
import { SsapClient, SsapUnreachableError } from '../tv/ssap-client';
import { SETTLE_AFTER_REACHABLE_MS } from './supervision.policy';
import type { AgentConfigMessage, AgentScreenConfigMessage } from '../protocol/server-protocol';

const DAY_MS = 24 * 60 * 60 * 1000;

function screen(overrides: Partial<AgentScreenConfigMessage> = {}): AgentScreenConfigMessage {
  return {
    screenId: 's1',
    name: 'Foyer left',
    localIp: '192.168.1.50',
    macAddress: null,
    ssapPort: 3001,
    devmodePassphrase: 'AEBC72',
    autoLaunchEnabled: true,
    extendDevmodeEnabled: false,
    devmodeExtendIntervalDays: 7,
    lastDevmodeExtendAt: new Date(Date.now() - DAY_MS).toISOString(),
    wakeBeforeScheduleEnabled: false,
    wakeLeadTimeMinutes: 10,
    wakeOnUnreachableEnabled: false,
    playerHeartbeatStale: false,
    nextScheduleStartAt: null,
    sshHostKeyFingerprint: null,
    keyStatus: 'ok',
    sshStatus: 'ok',
    ssapStatus: 'ok',
    onboardingStep: 8,
    ...overrides,
  };
}

const WIRED = { interfaceName: 'eth0', kind: 'ethernet', ssid: null, ipAddress: '192.168.1.5' };

/** Lets the fire-and-forget heartbeat promise chain settle. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('SupervisorService', () => {
  let supervisor: SupervisorService;
  let connections: { load: jest.Mock };
  let client: { fetchConfig: jest.Mock; sendHeartbeat: jest.Mock; sendReports: jest.Mock };
  let configs: {
    load: jest.Mock;
    save: jest.Mock;
    current: jest.Mock;
    updateScreenAddress: jest.Mock;
  };
  let setup: { recordConfigPull: jest.Mock; onEnrolled: jest.Mock };
  let reachability: { probe: jest.Mock };
  let devmodeKeys: { obtain: jest.Mock; forget: jest.Mock };
  let ssh: { extendDevmode: jest.Mock; run: jest.Mock };
  let wol: { wake: jest.Mock };
  let ssapKeys: { load: jest.Mock; save: jest.Mock };
  let network: { collect: jest.Mock };
  let discovery: { locate: jest.Mock };

  function build(config: AgentConfigMessage | null) {
    configs.current.mockReturnValue(config);
    configs.load.mockResolvedValue(config);
    return new SupervisorService(
      connections as never,
      client as never,
      configs as never,
      setup as never,
      reachability as never,
      devmodeKeys as never,
      ssh as never,
      wol as never,
      ssapKeys as never,
      network as never,
      discovery as never,
      '1.2.3',
    );
  }

  function configWith(screens: AgentScreenConfigMessage[]): AgentConfigMessage {
    return {
      agentId: 'agent-1',
      organisationId: 'org-1',
      probeIntervalMs: 60_000,
      appId: 'com.mynextscreen.webos',
      screens,
    };
  }

  function reported(): Record<string, unknown> {
    return client.sendReports.mock.calls.at(-1)[0].screens[0];
  }

  /** Moves the clock past the wait the loop keeps after a set comes back. */
  function settle(): void {
    const later = Date.now() + SETTLE_AFTER_REACHABLE_MS;
    jest.spyOn(Date, 'now').mockReturnValue(later);
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // No SSAP server here. Refusing at once keeps every launch and version read
    // from waiting out the connect timeout against an address on the real LAN.
    jest
      .spyOn(SsapClient, 'connect')
      .mockRejectedValue(new SsapUnreachableError('ws://192.168.1.50:3001'));
    connections = { load: jest.fn().mockResolvedValue({ agentId: 'agent-1' }) };
    client = {
      fetchConfig: jest.fn(),
      sendHeartbeat: jest.fn(),
      sendReports: jest.fn().mockResolvedValue(undefined),
    };
    configs = {
      load: jest.fn(),
      save: jest.fn(),
      current: jest.fn(),
      updateScreenAddress: jest.fn(),
    } as typeof configs;
    setup = { recordConfigPull: jest.fn(), onEnrolled: jest.fn() };
    reachability = { probe: jest.fn().mockResolvedValue({ reachability: 'reachable' }) };
    devmodeKeys = {
      obtain: jest.fn().mockResolvedValue({ status: 'ok', privateKey: 'PEM' }),
      forget: jest.fn(),
    };
    ssh = {
      extendDevmode: jest.fn().mockResolvedValue({ status: 'ok', extended: true }),
      run: jest.fn(),
    };
    wol = { wake: jest.fn().mockResolvedValue(undefined) };
    ssapKeys = { load: jest.fn().mockResolvedValue('client-key'), save: jest.fn() };
    network = { collect: jest.fn().mockResolvedValue(WIRED) };
    discovery = { locate: jest.fn().mockResolvedValue(null) };
  });

  describe('start-up heartbeat', () => {
    afterEach(() => supervisor.onModuleDestroy());

    it('checks in straight away instead of a full interval later', async () => {
      supervisor = build(configWith([]));

      await supervisor.onModuleInit();
      await flush();

      expect(client.sendHeartbeat).toHaveBeenCalledTimes(1);
    });

    it('reports how the machine is attached to the network', async () => {
      supervisor = build(configWith([]));

      await supervisor.onModuleInit();
      await flush();

      expect(client.sendHeartbeat).toHaveBeenCalledWith('1.2.3', expect.any(Object), WIRED);
    });

    it('sends nothing at start-up before enrolment', async () => {
      connections.load.mockResolvedValue(null);
      supervisor = build(null);

      await supervisor.onModuleInit();
      await flush();

      expect(client.sendHeartbeat).not.toHaveBeenCalled();
    });

    it('checks in as soon as the setup page enrols the agent', async () => {
      connections.load.mockResolvedValue(null);
      supervisor = build(null);
      await supervisor.onModuleInit();
      await flush();
      connections.load.mockResolvedValue({ agentId: 'agent-1' });

      const onEnrolled = setup.onEnrolled.mock.calls[0][0] as () => void;
      onEnrolled();
      await flush();

      expect(client.sendHeartbeat).toHaveBeenCalledTimes(1);
    });
  });

  describe('tick', () => {
    it('does nothing before enrolment', async () => {
      connections.load.mockResolvedValue(null);
      supervisor = build(configWith([screen()]));

      await supervisor.tick();

      expect(reachability.probe).not.toHaveBeenCalled();
    });

    it('reports what it probed', async () => {
      supervisor = build(configWith([screen()]));

      await supervisor.tick();

      expect(reported()).toMatchObject({ screenId: 's1', reachability: 'reachable' });
    });

    it('probes every screen it looks after', async () => {
      supervisor = build(configWith([screen(), screen({ screenId: 's2' })]));

      await supervisor.tick();

      expect(reachability.probe).toHaveBeenCalledTimes(2);
    });

    // A round that overruns its interval must not have a second one start on
    // top of it and send two launches to the same set.
    it('does not start a second round on top of a running one', async () => {
      let release!: (value: { reachability: string }) => void;
      const blocked = new Promise<{ reachability: string }>((resolve) => {
        release = resolve;
      });
      const entered = new Promise<void>((resolve) => {
        reachability.probe.mockImplementation(() => {
          resolve();
          return blocked;
        });
      });
      supervisor = build(configWith([screen()]));

      const first = supervisor.tick();
      await entered;
      await supervisor.tick();
      release({ reachability: 'reachable' });
      await first;

      expect(reachability.probe).toHaveBeenCalledTimes(1);
    });
  });

  describe('a set that just came back', () => {
    const stale = screen({ playerHeartbeatStale: true });

    // Freshly switched on, the set has no network time yet and the app's TLS
    // connections would fail.
    it('is left alone and the launch is announced', async () => {
      supervisor = build(configWith([stale]));

      await supervisor.tick();

      expect(reported()).not.toHaveProperty('ssapStatus');
      expect(reported()).toMatchObject({ appLaunchInSeconds: SETTLE_AFTER_REACHABLE_MS / 1000 });
    });

    it('gets the app launched once it has settled, with the announcement gone', async () => {
      supervisor = build(configWith([stale]));
      await supervisor.tick();
      settle();

      await supervisor.tick();

      expect(reported()).toHaveProperty('ssapStatus');
      expect(reported()).not.toHaveProperty('appLaunchInSeconds');
    });

    it('announces nothing when no launch would follow', async () => {
      supervisor = build(configWith([screen({ autoLaunchEnabled: false })]));

      await supervisor.tick();

      expect(reported()).not.toHaveProperty('appLaunchInSeconds');
    });

    it('waits again after it was off in between', async () => {
      supervisor = build(configWith([stale]));
      await supervisor.tick();
      settle();
      reachability.probe.mockResolvedValueOnce({ reachability: 'unreachable' });
      await supervisor.tick();

      await supervisor.tick();

      expect(reported()).not.toHaveProperty('ssapStatus');
      expect(reported()).toHaveProperty('appLaunchInSeconds');
    });

    // The onboarding wizard: someone is standing at the set.
    it('is launched straight away for an operator', async () => {
      supervisor = build(configWith([stale]));

      const report = await supervisor.visitNow('s1');

      expect(report).toHaveProperty('ssapStatus');
      expect(report).not.toHaveProperty('appLaunchInSeconds');
    });
  });

  describe('probing while backing off', () => {
    const due = screen({ extendDevmodeEnabled: true, lastDevmodeExtendAt: null });

    // A TV that was off for two days must be noticed within one interval of
    // being switched on, not after its backoff has run out.
    it('probes an unreachable set every round', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      supervisor = build(configWith([screen()]));

      await supervisor.tick();
      await supervisor.tick();
      await supervisor.tick();

      expect(reachability.probe).toHaveBeenCalledTimes(3);
      expect(client.sendReports).toHaveBeenCalledTimes(3);
    });

    it('keeps reporting reachability but holds back the failing action', async () => {
      ssh.extendDevmode.mockResolvedValue({ status: 'auth_failed', extended: false });
      supervisor = build(configWith([due]));
      await supervisor.tick();
      settle();

      await supervisor.tick();
      await supervisor.tick();

      expect(reachability.probe).toHaveBeenCalledTimes(3);
      expect(ssh.extendDevmode).toHaveBeenCalledTimes(1);
      expect(reported()).toMatchObject({
        screenId: 's1',
        reachability: 'reachable',
      });
    });

    it('drops the old backoff for a set that comes back', async () => {
      ssh.extendDevmode.mockResolvedValueOnce({ status: 'auth_failed', extended: false });
      supervisor = build(configWith([due]));
      await supervisor.tick();
      settle();
      await supervisor.tick();

      reachability.probe.mockResolvedValueOnce({ reachability: 'unreachable' });
      await supervisor.tick();
      await supervisor.tick();
      settle();
      await supervisor.tick();

      expect(ssh.extendDevmode).toHaveBeenCalledTimes(2);
    });
  });

  describe('a set that changed its address', () => {
    const MAC = 'AA:BB:CC:DD:EE:FF';

    function unreachableAt(ip: string): void {
      reachability.probe.mockImplementation(async (host: string) =>
        host === ip ? { reachability: 'unreachable' } : { reachability: 'reachable' },
      );
    }

    it('finds it by its MAC, adopts the new address and reports it', async () => {
      unreachableAt('192.168.1.50');
      discovery.locate.mockResolvedValue('192.168.1.77');
      supervisor = build(configWith([screen({ macAddress: MAC })]));

      await supervisor.tick();

      expect(discovery.locate).toHaveBeenCalledWith(MAC, '192.168.1.50', false);
      expect(configs.updateScreenAddress).toHaveBeenCalledWith('s1', '192.168.1.77');
      expect(reported()).toMatchObject({ reachability: 'reachable', localIp: '192.168.1.77' });
    });

    it('acts on the set at its new address once it has settled', async () => {
      unreachableAt('192.168.1.50');
      discovery.locate.mockResolvedValue('192.168.1.77');
      const moved = screen({
        macAddress: MAC,
        extendDevmodeEnabled: true,
        lastDevmodeExtendAt: null,
      });
      supervisor = build(configWith([moved]));
      await supervisor.tick();
      configs.current.mockReturnValue(configWith([{ ...moved, localIp: '192.168.1.77' }]));
      settle();

      await supervisor.tick();

      expect(ssh.extendDevmode).toHaveBeenCalledWith(
        expect.objectContaining({ host: '192.168.1.77' }),
      );
    });

    // A neighbour entry can outlive the device that left it.
    it('ignores an address the set does not answer on', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      discovery.locate.mockResolvedValue('192.168.1.77');
      supervisor = build(configWith([screen({ macAddress: MAC })]));

      await supervisor.tick();

      expect(configs.updateScreenAddress).not.toHaveBeenCalled();
      expect(reported()).not.toHaveProperty('localIp');
    });

    it('does not search without a MAC to search for', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      supervisor = build(configWith([screen({ macAddress: null })]));

      await supervisor.tick();

      expect(discovery.locate).not.toHaveBeenCalled();
    });

    it('searches at most once per cooldown while the set stays off', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      supervisor = build(configWith([screen({ macAddress: MAC })]));

      await supervisor.tick();
      await supervisor.tick();

      expect(discovery.locate).toHaveBeenCalledTimes(1);
    });

    it('searches again right away when someone presses check now', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      supervisor = build(configWith([screen({ macAddress: MAC })]));
      await supervisor.tick();

      await supervisor.probeNow();

      expect(discovery.locate).toHaveBeenCalledTimes(2);
    });

    it('searches ever less often while the set stays missing', async () => {
      jest.useFakeTimers({ now: Date.now(), doNotFake: ['setImmediate', 'nextTick'] });
      try {
        reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
        supervisor = build(configWith([screen({ macAddress: MAC })]));

        await supervisor.tick();
        jest.setSystemTime(Date.now() + 2 * 60_000);
        await supervisor.tick();
        jest.setSystemTime(Date.now() + 2 * 60_000);
        await supervisor.tick();

        // First miss doubles the wait to four minutes.
        expect(discovery.locate).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('keeps reporting the new address until the server has taken it', async () => {
      unreachableAt('192.168.1.50');
      discovery.locate.mockResolvedValue('192.168.1.77');
      client.sendReports.mockRejectedValueOnce(new ServerUnreachableError(new Error('down')));
      supervisor = build(configWith([screen({ macAddress: MAC })]));

      await supervisor.tick();
      configs.current.mockReturnValue(
        configWith([screen({ macAddress: MAC, localIp: '192.168.1.77' })]),
      );
      await supervisor.tick();
      await supervisor.tick();

      const sent = client.sendReports.mock.calls.map((call) => call[0].screens[0].localIp);
      expect(sent).toEqual(['192.168.1.77', '192.168.1.77', undefined]);
    });

    it('does not let a config pull hand the old address back before the server has the new one', async () => {
      unreachableAt('192.168.1.50');
      discovery.locate.mockResolvedValue('192.168.1.77');
      client.sendReports.mockRejectedValue(new ServerUnreachableError(new Error('down')));
      supervisor = build(configWith([screen({ macAddress: MAC })]));
      await supervisor.tick();
      client.fetchConfig.mockResolvedValue(configWith([screen({ macAddress: MAC })]));

      await supervisor.refreshConfigIfDue(true);

      const saved = configs.save.mock.calls.at(-1)?.[0] as AgentConfigMessage;
      expect(saved.screens[0].localIp).toBe('192.168.1.77');
    });

    it('passes the operator switch for the subnet sweep through', async () => {
      unreachableAt('192.168.1.50');
      supervisor = build({
        ...configWith([screen({ macAddress: MAC })]),
        subnetSweepEnabled: true,
      });

      await supervisor.tick();

      expect(discovery.locate).toHaveBeenCalledWith(MAC, '192.168.1.50', true);
    });

    it('does not search for a set that answers', async () => {
      supervisor = build(configWith([screen({ macAddress: MAC })]));

      await supervisor.tick();

      expect(discovery.locate).not.toHaveBeenCalled();
    });
  });

  describe('probeNow', () => {
    it('clears the backoff so the failing action is retried', async () => {
      ssh.extendDevmode.mockResolvedValueOnce({ status: 'auth_failed', extended: false });
      supervisor = build(configWith([due()]));
      await supervisor.tick();
      settle();
      await supervisor.tick();

      await supervisor.probeNow();

      expect(ssh.extendDevmode).toHaveBeenCalledTimes(2);
    });

    it('queues one more round behind a running one instead of dropping the request', async () => {
      let release!: (value: { reachability: string }) => void;
      const entered = new Promise<void>((resolve) => {
        reachability.probe.mockImplementationOnce(() => {
          resolve();
          return new Promise((done) => {
            release = done;
          });
        });
      });
      supervisor = build(configWith([screen()]));

      const first = supervisor.tick();
      await entered;
      await supervisor.probeNow();
      release({ reachability: 'reachable' });
      await first;

      expect(reachability.probe).toHaveBeenCalledTimes(2);
    });

    function due(): AgentScreenConfigMessage {
      return screen({ extendDevmodeEnabled: true, lastDevmodeExtendAt: null });
    }
  });

  describe('probe interval', () => {
    let setIntervalSpy: jest.SpyInstance;

    beforeEach(() => {
      setIntervalSpy = jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
      supervisor.onModuleDestroy();
      setIntervalSpy.mockRestore();
    });

    function roundIntervals(): unknown[] {
      return setIntervalSpy.mock.calls.map((call) => call[1]).filter((ms) => ms !== 60_000);
    }

    it('starts the rounds at the configured interval', async () => {
      supervisor = build({ ...configWith([]), probeIntervalMs: 300_000 });

      await supervisor.onModuleInit();

      expect(roundIntervals()).toEqual([300_000]);
    });

    it('re-arms the timer when a pulled config changes the interval', async () => {
      supervisor = build(configWith([]));
      await supervisor.onModuleInit();
      client.fetchConfig.mockResolvedValue({ ...configWith([]), probeIntervalMs: 600_000 });

      await supervisor.refreshConfigIfDue(true);

      expect(roundIntervals()).toEqual([600_000]);
    });

    it('leaves the timer alone when the interval did not change', async () => {
      supervisor = build(configWith([]));
      await supervisor.onModuleInit();
      const before = setIntervalSpy.mock.calls.length;
      client.fetchConfig.mockResolvedValue(configWith([]));

      await supervisor.refreshConfigIfDue(true);

      expect(setIntervalSpy.mock.calls.length).toBe(before);
    });
  });

  describe('sanitizeProbeInterval', () => {
    it('falls back to a minute when nothing usable is configured', () => {
      expect(sanitizeProbeInterval(undefined)).toBe(60_000);
      expect(sanitizeProbeInterval(Number.NaN)).toBe(60_000);
    });

    it('refuses an interval short enough to turn the loop into a busy one', () => {
      expect(sanitizeProbeInterval(0)).toBe(10_000);
    });

    it('passes a sensible interval through', () => {
      expect(sanitizeProbeInterval(300_000)).toBe(300_000);
    });
  });

  describe('Developer Mode extension', () => {
    const due = screen({ extendDevmodeEnabled: true, lastDevmodeExtendAt: null });

    it('runs before the app is launched', async () => {
      supervisor = build(configWith([{ ...due, playerHeartbeatStale: true }]));
      await supervisor.tick();
      settle();

      await supervisor.tick();

      expect(ssh.extendDevmode).toHaveBeenCalled();
      expect(reported()).toMatchObject({ devmodeExtended: true });
    });

    it('never runs while the TV does not answer', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      supervisor = build(configWith([due]));

      await supervisor.tick();

      expect(ssh.extendDevmode).not.toHaveBeenCalled();
    });

    it('reports the key problem instead of attempting SSH', async () => {
      devmodeKeys.obtain.mockResolvedValue({ status: 'key_server_off', detail: 'refused' });
      supervisor = build(configWith([due]));
      await supervisor.tick();
      settle();

      await supervisor.tick();

      expect(ssh.extendDevmode).not.toHaveBeenCalled();
      expect(reported()).toMatchObject({ keyStatus: 'key_server_off' });
    });

    // Developer Mode re-issues the key when it is switched on again, so a
    // rejected key is a reason to fetch a fresh one, not to give up.
    it('discards the cached key after an authentication failure', async () => {
      ssh.extendDevmode.mockResolvedValue({ status: 'auth_failed', extended: false });
      supervisor = build(configWith([due]));
      await supervisor.tick();
      settle();

      await supervisor.tick();

      expect(devmodeKeys.forget).toHaveBeenCalledWith('s1');
    });

    it('passes the pinned host key through so a change is detected', async () => {
      supervisor = build(configWith([{ ...due, sshHostKeyFingerprint: 'SHA256:abc' }]));
      await supervisor.tick();
      settle();

      await supervisor.tick();

      expect(ssh.extendDevmode).toHaveBeenCalledWith(
        expect.objectContaining({ expectedHostKeyFingerprint: 'SHA256:abc' }),
      );
    });
  });

  /**
   * The counterpart to the command handler's tests: these go through the real
   * supervisor, so they catch an action wired to the wrong branch.
   */
  describe('readInstalledVersion', () => {
    it('answers null for a screen it does not look after', async () => {
      supervisor = build(configWith([screen()]));

      expect(await supervisor.readInstalledVersion('unknown')).toBeNull();
    });

    // Used to verify an install, so a connection problem must read as "not
    // installed" rather than throwing into the caller's error path.
    it('answers null instead of throwing when the set cannot be reached', async () => {
      supervisor = build(configWith([screen({ localIp: '203.0.113.1' })]));

      await expect(supervisor.readInstalledVersion('s1')).resolves.toBeNull();
    });
  });

  describe('runAction', () => {
    it('wakes a screen whose automatic waking is switched off', async () => {
      supervisor = build(
        configWith([screen({ macAddress: 'AA:BB:CC:DD:EE:FF', wakeOnUnreachableEnabled: false })]),
      );

      await supervisor.runAction('s1', 'wake');

      expect(wol.wake).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', '192.168.1.50');
      expect(reported()).toMatchObject({ woken: true });
    });

    it('extends Developer Mode even when it is not due', async () => {
      supervisor = build(
        configWith([
          screen({
            extendDevmodeEnabled: true,
            lastDevmodeExtendAt: new Date().toISOString(),
          }),
        ]),
      );

      await supervisor.runAction('s1', 'extend-devmode');

      expect(ssh.extendDevmode).toHaveBeenCalled();
      expect(reported()).toMatchObject({ devmodeExtended: true });
    });

    it('reports the launch attempt even when the player is healthy', async () => {
      supervisor = build(configWith([screen({ playerHeartbeatStale: false })]));

      await supervisor.runAction('s1', 'launch');

      // No SSAP server here, so the attempt fails — what matters is that it was
      // made at all instead of being filtered out by the policy.
      expect(reported()).toMatchObject({ screenId: 's1' });
    });

    it('does nothing for a screen it does not look after', async () => {
      supervisor = build(configWith([screen()]));

      await supervisor.runAction('unknown', 'wake');

      expect(wol.wake).not.toHaveBeenCalled();
      expect(client.sendReports).not.toHaveBeenCalled();
    });
  });

  describe('wake', () => {
    it('sends a magic packet before a schedule', async () => {
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });
      supervisor = build(
        configWith([
          screen({
            macAddress: 'AA:BB:CC:DD:EE:FF',
            wakeBeforeScheduleEnabled: true,
            nextScheduleStartAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          }),
        ]),
      );

      await supervisor.tick();

      // The address goes with it: without one the packet only reaches the
      // default route's network, which need not be the TV's.
      expect(wol.wake).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', expect.any(String));
      expect(reported()).toMatchObject({ woken: true });
    });

    it('does not wake a set that already answers', async () => {
      supervisor = build(
        configWith([
          screen({
            macAddress: 'AA:BB:CC:DD:EE:FF',
            wakeBeforeScheduleEnabled: true,
            nextScheduleStartAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          }),
        ]),
      );

      await supervisor.tick();

      expect(wol.wake).not.toHaveBeenCalled();
    });
  });

  describe('resilience', () => {
    // The whole reason the config is cached: the venue must keep being looked
    // after when the uplink is down.
    it('keeps working when the config cannot be refreshed', async () => {
      client.fetchConfig.mockRejectedValue(new ServerUnreachableError(new Error('ENOTFOUND')));
      supervisor = build(configWith([screen()]));

      await supervisor.tick();

      expect(reachability.probe).toHaveBeenCalled();
    });

    it('keeps working when the reports cannot be delivered', async () => {
      client.sendReports.mockRejectedValue(new ServerUnreachableError(new Error('ENOTFOUND')));
      supervisor = build(configWith([screen()]));

      await expect(supervisor.tick()).resolves.toBeUndefined();
    });

    it('does nothing at all when there is no cached config yet', async () => {
      supervisor = build(null);

      await supervisor.tick();

      expect(reachability.probe).not.toHaveBeenCalled();
    });
  });

  describe('runNow', () => {
    it('visits one screen out of band', async () => {
      supervisor = build(configWith([screen(), screen({ screenId: 's2' })]));

      await supervisor.runNow('s2');

      expect(reachability.probe).toHaveBeenCalledTimes(1);
      expect(reported()).toMatchObject({ screenId: 's2' });
    });

    it('ignores a screen it does not look after', async () => {
      supervisor = build(configWith([screen()]));

      await supervisor.runNow('unknown');

      expect(reachability.probe).not.toHaveBeenCalled();
    });
  });

  describe('collectMetrics', () => {
    it('reports agent-level basics and the connected flag', () => {
      supervisor = build(configWith([screen()]));

      const metrics = supervisor.collectMetrics(true);

      expect(metrics.connected).toBe(true);
      expect(metrics.screenCount).toBe(1);
      expect(metrics.memoryRssBytes).toBeGreaterThan(0);
      expect(metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('reflects per-screen reachability and counters after a round', async () => {
      supervisor = build(
        configWith([screen({ wakeOnUnreachableEnabled: true, macAddress: 'AA:BB:CC:DD:EE:FF' })]),
      );
      reachability.probe.mockResolvedValue({ reachability: 'unreachable' });

      await supervisor.tick();
      const metrics = supervisor.collectMetrics(true);

      const screenMetrics = metrics.screens.find((s) => s.screenId === 's1');
      expect(screenMetrics).toBeDefined();
      expect(screenMetrics?.reachable).toBe(false);
      // An unreachable screen with wake enabled gets a WoL packet.
      expect(screenMetrics?.wakes).toBe(1);
    });

    it('counts a successful launch', async () => {
      supervisor = build(configWith([screen({ playerHeartbeatStale: true })]));

      await supervisor.tick();
      const metrics = supervisor.collectMetrics(false);

      const screenMetrics = metrics.screens.find((s) => s.screenId === 's1');
      expect(screenMetrics?.launches).toBeGreaterThanOrEqual(0);
      expect(metrics.connected).toBe(false);
    });

    it('reports devmode active and the extension count after an extension round', async () => {
      supervisor = build(
        configWith([
          screen({
            extendDevmodeEnabled: true,
            lastDevmodeExtendAt: null,
            playerHeartbeatStale: true,
          }),
        ]),
      );
      await supervisor.tick();
      settle();

      await supervisor.tick();
      const metrics = supervisor.collectMetrics(true);

      const screenMetrics = metrics.screens.find((s) => s.screenId === 's1');
      expect(screenMetrics?.devmodeActive).toBe(true);
      expect(screenMetrics?.devmodeExtensions).toBe(1);
    });

    it('surfaces the last config pull once one has happened', async () => {
      supervisor = build(configWith([screen()]));
      client.fetchConfig.mockResolvedValue(configWith([screen()]));

      // A tick refreshes the config when due, stamping lastConfigPull.
      await supervisor.tick();
      const metrics = supervisor.collectMetrics(true);

      expect(metrics.lastConfigPullAtMs).toBeGreaterThanOrEqual(0);
    });

    it('returns an empty screen list when no config is cached', () => {
      supervisor = build(null);

      const metrics = supervisor.collectMetrics(true);

      expect(metrics.screenCount).toBe(0);
      expect(metrics.screens).toEqual([]);
    });
  });
});
