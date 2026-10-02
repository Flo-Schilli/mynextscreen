import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandStreamService } from '../connection/command-stream.service';
import { ServerClient } from '../connection/server-client.service';
import { AgentConfigStore } from '../config/agent-config.store';
import { DevmodeKeyService } from '../tv/devmode-key.service';
import { ReachabilityService } from '../probe/reachability.service';
import { SshService } from '../tv/ssh.service';
import { SsapClient } from '../tv/ssap-client';
import { SsapKeyStore } from '../tv/ssap-key.store';
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
const STEP_SSAP_PAIRING = 7;
const STEP_FINISH = 8;

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
