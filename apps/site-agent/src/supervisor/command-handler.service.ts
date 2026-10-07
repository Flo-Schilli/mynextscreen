import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandStreamService } from '../connection/command-stream.service';
import { ServerClient } from '../connection/server-client.service';
import { AgentConfigStore } from '../config/agent-config.store';
import { DevmodeKeyService } from '../tv/devmode-key.service';
import { ReachabilityService } from '../probe/reachability.service';
import { SshService } from '../tv/ssh.service';
import { SsapClient } from '../tv/ssap-client';
import { SsapKeyStore } from '../tv/ssap-key.store';
import { UpdateService } from '../update/update.service';
import { SupervisorService, classifySsap, describe } from './supervisor.service';
import type {
  AgentScreenConfigMessage,
  AgentScreenReportMessage,
  SiteAgentCommandMessage,
} from '../protocol/server-protocol';

/** Steps of the onboarding wizard, mirrored from the backend enum. */
const STEP_NETWORK = 2;
const STEP_KEY_SERVER = 4;
const STEP_PASSPHRASE = 5;
const STEP_SSH = 6;
const STEP_INSTALL_APP = 7;
const STEP_SSAP_PAIRING = 8;
const STEP_FINISH = 9;

/**
 * Executes what the operator asked for, now.
 *
 * Separate from the loop because the two have opposite rules: the loop backs
 * off, spreads load and skips what is not due, while a command runs
 * immediately and resets that screen's backoff — a person pressing a button has
 * usually just fixed whatever the loop kept failing on.
 */
@Injectable()
export class CommandHandlerService implements OnModuleInit {
  private readonly logger = new Logger(CommandHandlerService.name);

  constructor(
    private readonly stream: CommandStreamService,
    private readonly supervisor: SupervisorService,
    private readonly configs: AgentConfigStore,
    private readonly client: ServerClient,
    private readonly reachability: ReachabilityService,
    private readonly devmodeKeys: DevmodeKeyService,
    private readonly ssh: SshService,
    private readonly ssapKeys: SsapKeyStore,
    private readonly updates: UpdateService,
  ) {}

  onModuleInit(): void {
    this.stream.onCommand((command) => this.handle(command));
  }

  async handle(command: SiteAgentCommandMessage): Promise<void> {
    this.logger.log(`Command ${command.type}${command.screenId ? ` for ${command.screenId}` : ''}`);

    if (command.type === 'reload_config') {
      await this.supervisor.refreshConfigIfDue(true);
      return;
    }

    if (command.type === 'probe_now') {
      await this.supervisor.probeNow();
      return;
    }

    if (command.type === 'update_agent') {
      await this.updates.requestUpdate(command.commandId);
      return;
    }

    if (!command.screenId) {
      return;
    }

    if (command.type === 'check') {
      await this.runCheck(command);
      return;
    }

    if (command.type === 'standby') {
      await this.standby(command);
      return;
    }

    if (command.type === 'install_app') {
      await this.installApp(command);
      return;
    }

    if (command.type === 'refetch_key') {
      // The only one that really is "look again": dropping the key changes what
      // the next round finds, and the round is what fetches a fresh one.
      await this.devmodeKeys.forget(command.screenId);
      await this.supervisor.runNow(command.screenId);
      return;
    }

    // The rest are done outright. Running a round instead would put them back
    // in front of the policy that decides what is *due*, which is exactly what
    // a person pressing a button has already overruled.
    const action =
      command.type === 'extend_devmode' ? 'extend-devmode' : (command.type as 'wake' | 'launch');
    await this.supervisor.runAction(command.screenId, action);
  }

  /**
   * Installs the packaged player app on the TV.
   *
   * The same three steps `ares-install` takes over the Developer Mode session:
   * copy the package to the set, hand it to the install service, delete it
   * again. The call goes over `luna-send-pub` because that is all the
   * `prisoner` user has — the private bus is closed to it, which is also why
   * the install service is addressed through its `dev` folder.
   *
   * The package is fetched from the server rather than carried in the agent's
   * image, so a venue does not need redeploying to pick up a new player.
   */
  private async installApp(command: SiteAgentCommandMessage): Promise<void> {
    const screen = this.configs.current()?.screens.find((s) => s.screenId === command.screenId);
    if (!screen) {
      return;
    }

    const report: AgentScreenReportMessage = {
      screenId: screen.screenId,
      commandId: command.commandId,
    };
    await this.install(screen, report);
    await this.send(report);
  }

  /** The install itself, shared by the command and the wizard step. */
  private async install(
    screen: AgentScreenConfigMessage,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    const config = this.configs.current();
    const key = await this.devmodeKeys.obtain(
      screen.screenId,
      screen.localIp,
      screen.devmodePassphrase,
    );
    report.keyStatus = key.status;
    if (key.status !== 'ok' || !key.privateKey) {
      report.installStatus = 'failed';
      report.detail = key.detail ?? 'No usable Developer Mode key';
      return;
    }

    const target = {
      host: screen.localIp as string,
      privateKey: key.privateKey,
      passphrase: screen.devmodePassphrase as string,
      expectedHostKeyFingerprint: screen.sshHostKeyFingerprint,
    };
    const remotePath = `${TEMP_DIR}/${config?.appId ?? 'player'}.ipk`;

    try {
      const pkg = await this.client.fetchAppPackage();
      const uploaded = await this.ssh.upload(target, pkg, remotePath);
      if (uploaded.status !== 'ok') {
        throw new Error(uploaded.detail ?? `Upload failed: ${uploaded.status}`);
      }

      const installed = await this.ssh.run(target, installCommand(remotePath));
      report.sshStatus = installed.status;
      if (installed.status !== 'ok') {
        throw new Error(installed.detail ?? 'Could not reach the set to install');
      }

      // Asked, not inferred. The service's own answers proved useless as a
      // signal — the acknowledgement looks identical whether the package is
      // taken or ignored, and it was reported as success for an install that
      // never happened. Whether the app is on the set afterwards is the only
      // honest answer, and it fills in the version at the same time.
      const version = await this.supervisor.readInstalledVersion(screen.screenId);
      if (!version) {
        throw new Error(installed.stdout?.trim() || 'The set does not report the app as installed');
      }

      report.installStatus = 'ok';
      report.installedAppId = config?.appId;
      report.installedAppVersion = version;
      this.logger.log(`Installed ${version} on ${screen.name}`);
    } catch (error) {
      report.installStatus = 'failed';
      report.detail = describe(error);
      this.logger.warn(`Install on ${screen.name} failed: ${report.detail}`);
    } finally {
      // Always, including after a failure: a half-uploaded package left on a
      // set with little free space is the next problem nobody connects to this.
      await this.ssh.run(target, `rm -f ${remotePath}`).catch(() => undefined);
    }
  }

  /**
   * Puts the set into standby and reports whether it acknowledged.
   *
   * Does not end in a round like the other commands do: the set is on its way
   * off, so probing it immediately afterwards would record it as unreachable
   * and start the backoff on a screen that is doing exactly what was asked.
   */
  private async standby(command: SiteAgentCommandMessage): Promise<void> {
    const screen = this.configs.current()?.screens.find((s) => s.screenId === command.screenId);
    if (!screen) {
      return;
    }

    const report: AgentScreenReportMessage = {
      screenId: screen.screenId,
      commandId: command.commandId,
    };

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
      await client.standby();
      report.standby = true;
      report.ssapStatus = 'ok';
      this.logger.log(`Screen ${screen.name} sent to standby`);
    } catch (error) {
      report.standby = false;
      report.ssapStatus = classifySsap(error);
      report.detail = describe(error);
    } finally {
      client?.close();
    }

    await this.send(report);
  }

  /**
   * One onboarding step. Each reports exactly one status plus a plain-text
   * detail, which is what the wizard shows: the operator is standing in front
   * of the TV and needs to know which switch to flip, not that "something
   * failed".
   */
  private async runCheck(command: SiteAgentCommandMessage): Promise<void> {
    const screen = this.configs.current()?.screens.find((s) => s.screenId === command.screenId);
    if (!screen) {
      return;
    }

    const report: AgentScreenReportMessage = {
      screenId: screen.screenId,
      commandId: command.commandId,
      step: command.step,
    };

    switch (command.step) {
      case STEP_NETWORK:
        await this.checkNetwork(screen, report);
        break;
      case STEP_KEY_SERVER:
        await this.checkKeyServer(screen, report);
        break;
      case STEP_PASSPHRASE:
        await this.checkKey(screen, report);
        break;
      case STEP_SSH:
        await this.checkSsh(screen, report);
        break;
      case STEP_INSTALL_APP:
        // The step *is* the install: there is nothing to verify beforehand, and
        // a check that only looked would leave the operator to press a second
        // button for the thing the step is named after.
        await this.install(screen, report);
        break;
      case STEP_SSAP_PAIRING:
      case STEP_FINISH: {
        // Both end in talking to the set over SSAP; the finish step also leaves
        // the app running, which is what the operator wants to see.
        //
        // The round's own findings are carried into this report rather than
        // sent separately: a report without `step` never reaches the wizard, so
        // these two steps used to fail in the dashboard however well the round
        // had gone.
        const round = await this.supervisor.visitNow(screen.screenId);
        if (round) {
          Object.assign(report, round, { commandId: command.commandId, step: command.step });
        }
        break;
      }
      default:
        report.detail = `Step ${command.step} needs nothing from the agent`;
    }

    await this.send(report);
  }

  private async checkNetwork(
    screen: AgentScreenConfigMessage,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    const probe = await this.reachability.probe(screen.localIp, screen.ssapPort);
    report.reachability = probe.reachability;
    report.detail = probe.detail;
  }

  /**
   * The key-server step, which runs before the passphrase has been entered.
   *
   * It therefore asks only whether Developer Mode is answering on the TV. Going
   * through the full key acquisition here would report `no_passphrase` and make
   * the step impossible to pass in the order the wizard asks for it.
   */
  private async checkKeyServer(
    screen: AgentScreenConfigMessage,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    const probe = await this.devmodeKeys.probeKeyServer(screen.localIp);
    report.keyStatus = probe.status;
    report.detail = probe.detail;
  }

  private async checkKey(
    screen: AgentScreenConfigMessage,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    const key = await this.devmodeKeys.obtain(
      screen.screenId,
      screen.localIp,
      screen.devmodePassphrase,
    );
    report.keyStatus = key.status;
    report.detail = key.detail;
  }

  private async checkSsh(
    screen: AgentScreenConfigMessage,
    report: AgentScreenReportMessage,
  ): Promise<void> {
    const key = await this.devmodeKeys.obtain(
      screen.screenId,
      screen.localIp,
      screen.devmodePassphrase,
    );
    report.keyStatus = key.status;
    if (key.status !== 'ok' || !key.privateKey) {
      report.detail = key.detail;
      return;
    }

    // A harmless call: it proves the session works without changing anything.
    const result = await this.ssh.run(
      {
        host: screen.localIp as string,
        privateKey: key.privateKey,
        passphrase: screen.devmodePassphrase as string,
        expectedHostKeyFingerprint: screen.sshHostKeyFingerprint,
      },
      'echo mynextscreen-ssh-ok',
    );

    report.sshStatus = result.status;
    report.detail = result.detail;
    if (result.hostKeyFingerprint) {
      report.sshHostKeyFingerprint = result.hostKeyFingerprint;
    }
  }

  private async send(report: AgentScreenReportMessage): Promise<void> {
    try {
      await this.client.sendReports({ screens: [report] });
    } catch (error) {
      // The wizard is waiting on this; losing it leaves the operator looking at
      // a spinner, so it is worth a loud log line.
      this.logger.error(
        `Could not report check result for ${report.screenId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

/** Where `ares-install` puts a package before handing it over. */
const TEMP_DIR = '/media/developer/temp';

/** How long to wait on the set for a final install state, in seconds. */
const INSTALL_WAIT_S = 90;

/**
 * `dev/install` rather than `install`: the Developer Mode entry point is the
 * one the public bus exposes, and the public bus is all the agent has.
 */
function installCommand(remotePath: string): string {
  // Subscribed, because the first answer is only an acknowledgement
  // ({"subscribed":false,"returnValue":true}) — measured on a real set, where
  // taking it for success reported an install that never happened. The outcome
  // arrives in later messages as `details.state`.
  const payload = JSON.stringify({
    id: 'com.ares.defaultName',
    ipkUrl: remotePath,
    subscribe: true,
  });
  // `-i`, like ares-install, not `-n`: with a reply count luna-send returns on
  // the acknowledgement and the install never runs — measured on a real set,
  // where the package sat in the temp directory untouched. The subscription has
  // to stay open until the service reports a final state, so this reads the
  // stream on the TV and kills luna-send once it has one.
  const out = '/tmp/mns-install.$$';
  const done = '\'"state" *: *"(installed|install failed)"\'';
  return (
    `f=${out}; ` +
    `luna-send-pub -i luna://com.webos.appInstallService/dev/install '${payload}' > $f 2>&1 & ` +
    `p=$!; i=0; ` +
    `while [ $i -lt ${INSTALL_WAIT_S} ]; do grep -qiE ${done} $f && break; i=$((i+1)); sleep 1; done; ` +
    `kill $p 2>/dev/null; cat $f; rm -f $f`
  );
}
