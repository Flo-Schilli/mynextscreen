import { randomInt } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AgentConfigStore } from '../config/agent-config.store';
import {
  ServerClient,
  ServerUnreachableError,
  SessionRejectedError,
} from '../connection/server-client.service';
import { ConnectionStore } from '../connection/connection.store';
import { SetupService } from '../setup/setup.service';
import { ReachabilityService } from '../probe/reachability.service';
import { DevmodeKeyService } from '../tv/devmode-key.service';
import { SshService } from '../tv/ssh.service';
import { WolService } from '../tv/wol.service';
import { SsapClient } from '../tv/ssap-client';
import { SsapKeyStore } from '../tv/ssap-key.store';
import { NetworkInfoService } from '../network/network-info.service';
import { newRuntime, type ScreenRuntime } from './screen-runtime';
import { DEVMODE_JITTER_MAX_MS, backoffFor, decideAction } from './supervision.policy';
import type {
  AgentScreenConfigMessage,
  AgentScreenReportMessage,
  AgentMetricsMessage,
} from '../protocol/server-protocol';

/** How often the agent checks in, independent of the probe interval. */
const HEARTBEAT_INTERVAL_MS = 60_000;

/** How often the config is re-pulled even without a push telling it to. */
const CONFIG_REFRESH_INTERVAL_MS = 60 * 60_000;

/** Used until a config says otherwise, and for a config with a nonsensical value. */
const DEFAULT_PROBE_INTERVAL_MS = 60_000;

/**
 * Floor for whatever the server sends. The dashboard only offers 1–10 minutes;
 * this guards a hand-edited row or a bug from turning the loop into a busy one.
 */
const MIN_PROBE_INTERVAL_MS = 10_000;

/**
 * The loop.
 *
 * Runs from the cached configuration, so a venue keeps being looked after when
 * the uplink is down: it still probes, still starts the app, still wakes a set
 * before a schedule it already knew about. Only the reports and the heartbeat
 * need the server, and those simply fail and are retried.
 */
@Injectable()
export class SupervisorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupervisorService.name);
  private readonly runtimes = new Map<string, ScreenRuntime>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private scheduledIntervalMs = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastConfigPull = 0;
  private running = false;
  /** Set when a "probe now" arrives during a round, so one more follows it. */
  private rerunRequested = false;

  constructor(
    private readonly connections: ConnectionStore,
    private readonly client: ServerClient,
    private readonly configs: AgentConfigStore,
    private readonly setup: SetupService,
    private readonly reachability: ReachabilityService,
    private readonly devmodeKeys: DevmodeKeyService,
    private readonly ssh: SshService,
    private readonly wol: WolService,
    private readonly ssapKeys: SsapKeyStore,
    private readonly network: NetworkInfoService,
    private readonly agentVersion: string,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.configs.load();
    this.scheduleRounds(await this.probeInterval());
    this.heartbeatTimer = setInterval(() => void this.heartbeat(), HEARTBEAT_INTERVAL_MS);
    // Check in now rather than a full interval from now: the server shows the
    // agent online only from its first heartbeat, after a restart as much as
    // after the setup page says it is connected.
    this.setup.onEnrolled(() => void this.heartbeat());
    void this.heartbeat();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  /** One round over every screen. Public so a command can preempt the interval. */
  async tick(): Promise<void> {
    if (this.running) {
      // A round that overruns its interval must not have a second one start on
      // top of it and send two launches to the same set.
      return;
    }

    this.running = true;
    try {
      do {
        this.rerunRequested = false;
        await this.round();
      } while (this.rerunRequested);
    } finally {
      this.running = false;
    }
  }

  /**
   * Probes every screen now, for an operator who does not want to wait out the
   * interval — typically right after switching a set back on.
   *
   * Clears every backoff first, so the round acts on what it finds instead of
   * skipping a screen that failed a while ago. A round already in progress is
   * not interrupted; one more is queued behind it.
   */
  async probeNow(): Promise<void> {
    for (const runtime of this.runtimes.values()) {
      runtime.failures = 0;
      runtime.nextAttemptAt = 0;
    }
    if (this.running) {
      this.rerunRequested = true;
      return;
    }
    await this.tick();
  }

  private async round(): Promise<void> {
    if (!(await this.connections.load())) {
      return;
    }

    await this.refreshConfigIfDue();
    const config = this.configs.current();
    if (!config) {
      return;
    }

    const reports: AgentScreenReportMessage[] = [];
    for (const screen of config.screens) {
      reports.push(await this.visit(screen, config.appId));
    }

    if (reports.length > 0) {
      await this.send(reports);
    }
  }

  /** Runs one screen immediately, out of band, for an operator command. */
  async runNow(screenId: string): Promise<void> {
    const report = await this.visitNow(screenId);
    if (report) {
      await this.send([report]);
    }
  }

  /**
   * What the set reports as installed for the app the agents run.
   *
   * Lives here because the SSAP session handling does, and because the install
   * needs it as a verification: the install service's own answer looks the
   * same whether the package was taken or ignored.
   */
  async readInstalledVersion(screenId: string): Promise<string | null> {
    const config = this.configs.current();
    const screen = config?.screens.find((s) => s.screenId === screenId);
    if (!screen) {
      return null;
    }

    let client: SsapClient | null = null;
    try {
      client = await SsapClient.connect(screen.localIp as string, screen.ssapPort);
      const stored = await this.ssapKeys.load(screenId);
      const clientKey = await client.register(stored);
      if (clientKey && clientKey !== stored) {
        await this.ssapKeys.save(screenId, clientKey);
      }
      return await client.installedAppVersion(config?.appId ?? '');
    } catch (error) {
      this.logger.debug(`Could not read the installed version: ${describe(error)}`);
      return null;
    } finally {
      client?.close();
    }
  }

  /**
   * Does one thing because a person asked, bypassing the policy that decides
   * what is *due*.
   *
   * The manual commands used to run an ordinary round, which refused them: a
   * wake needs `wakeOnUnreachableEnabled`, a launch needs a stale heartbeat, an
   * extension needs to be due. Pressing a button and having nothing happen —
   * not even an error — is the worst of both.
   */
  async runAction(screenId: string, action: 'wake' | 'launch' | 'extend-devmode'): Promise<void> {
    const screen = this.configs.current()?.screens.find((s) => s.screenId === screenId);
    if (!screen) {
      return;
    }
    const runtime = this.runtimeFor(screenId);
    runtime.failures = 0;
    runtime.nextAttemptAt = 0;

    const report: AgentScreenReportMessage = { screenId };
    switch (action) {
      case 'wake':
        await this.doWake(screen, runtime, report);
        break;
      case 'launch':
        await this.doLaunch(screen, this.configs.current()?.appId ?? '', runtime, report);
        break;
      case 'extend-devmode':
        await this.doExtendDevmode(screen, runtime, report);
        break;
    }
    await this.send([report]);
  }

  /**
   * One round for a single screen, returned instead of sent.
   *
   * The onboarding wizard needs the outcome of a round under its own
   * `commandId` and `step`; sending it from here as well would report the same
   * round twice, and the copy without a step is the one that does not advance
   * the wizard.
   */
  async visitNow(screenId: string): Promise<AgentScreenReportMessage | null> {
    const screen = this.configs.current()?.screens.find((s) => s.screenId === screenId);
    if (!screen) {
      return null;
    }
    const runtime = this.runtimeFor(screenId);
    // A human asking resets the backoff: they have presumably just fixed
    // whatever the loop kept failing on.
    runtime.failures = 0;
    runtime.nextAttemptAt = 0;
    return this.visit(screen, this.configs.current()?.appId ?? '');
  }

  /**
   * Probes one screen and, unless it is backing off, acts on the result.
   *
   * The probe itself is never skipped. It is a TCP connect, cheap for the TV,
   * and skipping it meant a set that had been off for a while was only noticed
   * again once its backoff ran out — up to half an hour after someone switched
   * it on. The backoff only holds back the actions that can hammer a set.
   */
  private async visit(
    screen: AgentScreenConfigMessage,
    appId: string,
  ): Promise<AgentScreenReportMessage> {
    const runtime = this.runtimeFor(screen.screenId);
    const now = Date.now();

    const probe = await this.reachability.probe(screen.localIp, screen.ssapPort);
    const reachable = probe.reachability === 'reachable';
    if (reachable && !runtime.reachable) {
      // Back from being off or disconnected: whatever failed before happened to
      // a set in a different state, so it gets a fresh start.
      runtime.failures = 0;
      runtime.nextAttemptAt = 0;
    }
    runtime.reachable = reachable;
    const report: AgentScreenReportMessage = {
      screenId: screen.screenId,
      reachability: probe.reachability,
      ...(probe.detail ? { detail: probe.detail } : {}),
    };

    if (now < runtime.nextAttemptAt) {
      return report;
    }

    const action = decideAction(screen, reachable, runtime, now);
    // A set that does not answer is not a failure of this loop: it is probed
    // again next interval anyway, and backing off would only delay noticing it.
    let ok = true;

    switch (action.kind) {
      case 'wake':
        ok = await this.doWake(screen, runtime, report);
        break;
      case 'extend-devmode':
        ok = await this.doExtendDevmode(screen, runtime, report);
        break;
      case 'launch':
        ok = await this.doLaunch(screen, appId, runtime, report);
        break;
      case 'none':
        break;
    }

    // Only when the round had nothing else to do: a launch already read it on
    // the session it opened, and a failing screen has worse problems.
    if (ok && reachable && action.kind === 'none' && runtime.appVersionReadAt === 0) {
      await this.readAppVersionOnce(screen, appId, runtime, report);
    }

    this.recordOutcome(runtime, ok, screen);
    return report;
  }

  private async doWake(
    screen: AgentScreenConfigMessage,
    runtime: ScreenRuntime,
    report: AgentScreenReportMessage,
  ): Promise<boolean> {
    try {
      await this.wol.wake(screen.macAddress as string, screen.localIp);
      runtime.lastWakeAt = Date.now();
      runtime.wakeCount += 1;
      report.woken = true;
      return true;
    } catch (error) {
      report.detail = describe(error);
      return false;
    }
  }

  private async doExtendDevmode(
    screen: AgentScreenConfigMessage,
    runtime: ScreenRuntime,
    report: AgentScreenReportMessage,
  ): Promise<boolean> {
    const key = await this.devmodeKeys.obtain(
      screen.screenId,
      screen.localIp,
      screen.devmodePassphrase,
    );
    report.keyStatus = key.status;
    if (key.status !== 'ok' || !key.privateKey) {
      report.detail = key.detail;
      return false;
    }

    const result = await this.ssh.extendDevmode({
      host: screen.localIp as string,
      privateKey: key.privateKey,
      passphrase: screen.devmodePassphrase as string,
      expectedHostKeyFingerprint: screen.sshHostKeyFingerprint,
    });

    report.sshStatus = result.status;
    report.devmodeExtended = result.extended;
    if (result.hostKeyFingerprint) {
      report.sshHostKeyFingerprint = result.hostKeyFingerprint;
    }
    if (result.detail) {
      report.detail = result.detail;
    }

    if (result.status === 'auth_failed') {
      // Developer Mode was probably switched on again, which issues a new key.
      await this.devmodeKeys.forget(screen.screenId);
    }

    // Recorded locally as well as reported: the cached config is not refetched
    // after a report, so without this the next round would find the extension
    // due again and relaunch the Developer Mode app a minute later.
    if (result.extended) {
      runtime.lastDevmodeExtendAt = Date.now();
      runtime.devmodeExtendCount += 1;
    }

    // The TV's own displayed countdown updates with a long delay, so it is not
    // read back here: the return value of the Luna call is the only honest
    // signal available.
    return result.extended;
  }

  /**
   * Reads the installed version onto an SSAP session that is already open.
   *
   * Never fatal: an outdated version is worth knowing, but failing to read it
   * must not turn a successful launch into a failed round.
   */
  private async readAppVersion(
    client: SsapClient,
    appId: string,
    runtime: ScreenRuntime,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    try {
      const version = await client.installedAppVersion(appId);
      runtime.appVersionReadAt = Date.now();
      report.installedAppId = appId;
      if (version) {
        report.installedAppVersion = version;
      }
    } catch (error) {
      this.logger.debug(`Could not read the installed version: ${describe(error)}`);
    }
  }

  /** Opens a session purely to read the version, once per agent run. */
  private async readAppVersionOnce(
    screen: AgentScreenConfigMessage,
    appId: string,
    runtime: ScreenRuntime,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    let client: SsapClient | null = null;
    try {
      client = await SsapClient.connect(screen.localIp as string, screen.ssapPort);
      const stored = await this.ssapKeys.load(screen.screenId);
      // No prompt callback: an unpaired screen is not worth interrupting
      // someone's evening for, and the launch path asks properly.
      const clientKey = await client.register(stored);
      if (clientKey && clientKey !== stored) {
        await this.ssapKeys.save(screen.screenId, clientKey);
      }
      await this.readAppVersion(client, appId, runtime, report);
    } catch (error) {
      // Marked as attempted either way, so an unreachable or unpaired set is
      // not retried every single round.
      runtime.appVersionReadAt = Date.now();
      this.logger.debug(`Version read skipped for ${screen.name}: ${describe(error)}`);
    } finally {
      client?.close();
    }
  }

  private async doLaunch(
    screen: AgentScreenConfigMessage,
    appId: string,
    runtime: ScreenRuntime,
    report: AgentScreenReportMessage,
  ): Promise<boolean> {
    let client: SsapClient | null = null;
    try {
      client = await SsapClient.connect(screen.localIp as string, screen.ssapPort);
      const stored = await this.ssapKeys.load(screen.screenId);
      const clientKey = await client.register(stored, () => {
        this.logger.warn(
          `Screen ${screen.name} is showing a pairing prompt — confirm it on the TV`,
        );
      });

      if (clientKey && clientKey !== stored) {
        await this.ssapKeys.save(screen.screenId, clientKey);
      }

      const foreground = await client.foregroundAppId();
      if (foreground !== appId) {
        // The address this agent is itself talking to: a display that was just
        // installed has nothing stored, and this saves typing a URL with a
        // remote. The shell ignores it once it has one of its own.
        const serverUrl = (await this.connections.load())?.serverUrl;
        await client.launch(appId, serverUrl ? { serverUrl } : undefined);
        runtime.lastLaunchAt = Date.now();
        runtime.launchCount += 1;
        report.launched = true;
      }
      await this.readAppVersion(client, appId, runtime, report);
      report.ssapStatus = 'ok';
      return true;
    } catch (error) {
      report.ssapStatus = classifySsap(error);
      report.detail = describe(error);
      return false;
    } finally {
      client?.close();
    }
  }

  private recordOutcome(
    runtime: ScreenRuntime,
    ok: boolean,
    screen: AgentScreenConfigMessage,
  ): void {
    if (ok) {
      runtime.failures = 0;
      runtime.nextAttemptAt = 0;
      return;
    }
    runtime.failures += 1;
    const probeIntervalMs = sanitizeProbeInterval(this.configs.current()?.probeIntervalMs);
    runtime.nextAttemptAt = Date.now() + backoffFor(runtime.failures, probeIntervalMs);
    this.logger.debug(
      `Screen ${screen.name} failed ${runtime.failures}x, next attempt in ${
        runtime.nextAttemptAt - Date.now()
      }ms`,
    );
  }

  private runtimeFor(screenId: string): ScreenRuntime {
    let runtime = this.runtimes.get(screenId);
    if (!runtime) {
      runtime = newRuntime(randomInt(0, DEVMODE_JITTER_MAX_MS));
      this.runtimes.set(screenId, runtime);
    }
    return runtime;
  }

  /** Pulls the config when told to, or when the cached one is an hour old. */
  async refreshConfigIfDue(force = false): Promise<void> {
    if (!force && Date.now() - this.lastConfigPull < CONFIG_REFRESH_INTERVAL_MS) {
      return;
    }
    try {
      const config = await this.client.fetchConfig();
      await this.configs.save(config);
      this.lastConfigPull = Date.now();
      this.setup.recordConfigPull();
      // Only re-arms a loop that is already running; before start-up there is
      // nothing to re-arm, and start-up reads the interval itself.
      if (this.timer) {
        this.scheduleRounds(sanitizeProbeInterval(config.probeIntervalMs));
      }
    } catch (error) {
      this.reportConnectionFailure(error, 'fetch configuration');
    }
  }

  private async heartbeat(): Promise<void> {
    const connection = await this.connections.load();
    if (!connection) {
      return;
    }
    try {
      await this.client.sendHeartbeat(
        this.agentVersion,
        this.collectMetrics(true),
        await this.network.collect(),
      );
    } catch (error) {
      this.reportConnectionFailure(error, 'send heartbeat');
    }
  }

  /**
   * A snapshot of this agent's runtime state for Prometheus, pushed on the
   * heartbeat. Reads only in-memory state the loop already maintains — collecting
   * metrics never probes a TV or opens a session of its own.
   */
  collectMetrics(connected: boolean): AgentMetricsMessage {
    const screens = this.configs.current()?.screens ?? [];
    return {
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssBytes: process.memoryUsage().rss,
      connected,
      lastConfigPullAtMs: this.lastConfigPull,
      screenCount: screens.length,
      screens: screens.map((screen) => {
        const runtime = this.runtimeFor(screen.screenId);
        return {
          screenId: screen.screenId,
          reachable: runtime.reachable,
          failures: runtime.failures,
          devmodeActive: runtime.lastDevmodeExtendAt > 0,
          devmodeExtensions: runtime.devmodeExtendCount,
          launches: runtime.launchCount,
          wakes: runtime.wakeCount,
        };
      }),
    };
  }

  private async send(screens: AgentScreenReportMessage[]): Promise<void> {
    try {
      await this.client.sendReports({ screens });
    } catch (error) {
      // Dropped on the floor on purpose. The next round re-observes everything
      // these reports described, so buffering them would only replay stale
      // state once the link comes back.
      this.reportConnectionFailure(error, 'send reports');
    }
  }

  private reportConnectionFailure(error: unknown, what: string): void {
    if (error instanceof ServerUnreachableError) {
      this.logger.warn(`Could not ${what}: ${error.message} — continuing from cache`);
      return;
    }
    if (error instanceof SessionRejectedError) {
      this.logger.error(`Could not ${what}: the server rejected this agent's session`);
      return;
    }
    this.logger.error(`Could not ${what}: ${describe(error)}`);
  }

  private async probeInterval(): Promise<number> {
    return sanitizeProbeInterval((await this.configs.load())?.probeIntervalMs);
  }

  /** (Re)starts the round timer, but only when the interval actually changed. */
  private scheduleRounds(intervalMs: number): void {
    if (this.timer && intervalMs === this.scheduledIntervalMs) {
      return;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.logger.log(`Probe interval changed to ${Math.round(intervalMs / 1000)}s`);
    }
    this.scheduledIntervalMs = intervalMs;
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }
}

/** The configured interval, or the default when it is missing or implausible. */
export function sanitizeProbeInterval(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_PROBE_INTERVAL_MS;
  }
  return Math.max(value, MIN_PROBE_INTERVAL_MS);
}

export function classifySsap(error: unknown): 'awaiting_pairing' | 'rejected' | 'unreachable' {
  const name = error instanceof Error ? error.name : '';
  if (name === 'SsapPairingTimeoutError') {
    return 'awaiting_pairing';
  }
  if (name === 'SsapUnreachableError') {
    return 'unreachable';
  }
  return 'rejected';
}

export function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
