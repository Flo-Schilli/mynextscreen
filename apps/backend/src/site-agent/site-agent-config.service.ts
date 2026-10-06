import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screens, siteAgents } from '../db/schema';
import { ScheduleBoundaryService } from '../screen/schedule-boundary.service';
import { ScreenRemoteControlService } from './screen-remote-control.service';
import type { AgentConfig, AgentScreenConfig } from './agent-config.types';

/** The webOS app the agent keeps in the foreground, unless overridden. */
/** Also used where the dashboard needs to know which app a TV should run. */
export const DEFAULT_SITE_AGENT_APP_ID = 'com.mynextscreen.webos';
/** Which packaged app the agents install. One entry today; kept explicit. */
export const SITE_AGENT_APP_SLUG = 'lg-tvos';
const DEFAULT_APP_ID = DEFAULT_SITE_AGENT_APP_ID;

/** Matches the column default, for an agent row that vanished mid-request. */
const DEFAULT_PROBE_INTERVAL_MINUTES = 1;

/**
 * Assembles what a site agent needs to do its job.
 *
 * This is the only place the Developer Mode passphrase is decrypted for
 * delivery. Everything else that reads these rows goes through the dashboard
 * mapper, which has no field to put it in.
 */
@Injectable()
export class SiteAgentConfigService {
  private readonly appId: string;

  private readonly screenOfflineThresholdMs: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly remoteControls: ScreenRemoteControlService,
    private readonly scheduleBoundaries: ScheduleBoundaryService,
    config: ConfigService,
  ) {
    this.appId = config.get<string>('SITE_AGENT_APP_ID', DEFAULT_APP_ID);
    this.screenOfflineThresholdMs = config.get<number>('SCREEN_OFFLINE_THRESHOLD_MS', 120_000);
  }

  /** The packaged app the agents install. */
  appPackageSlug(): string {
    return SITE_AGENT_APP_SLUG;
  }

  async buildAgentConfig(agentId: string): Promise<AgentConfig> {
    const [agent] = await this.db
      .select({
        organisationId: siteAgents.organisationId,
        probeIntervalMinutes: siteAgents.probeIntervalMinutes,
        subnetSweepEnabled: siteAgents.subnetSweepEnabled,
      })
      .from(siteAgents)
      .where(eq(siteAgents.id, agentId))
      .limit(1);

    const remotes = await this.remoteControls.listForAgent(agentId);
    const screenRows = remotes.length
      ? await this.db
          .select({
            id: screens.id,
            name: screens.name,
            lastHeartbeat: screens.lastHeartbeat,
          })
          .from(screens)
          .where(
            inArray(
              screens.id,
              remotes.map((r) => r.screenId),
            ),
          )
      : [];
    const byId = new Map(screenRows.map((row) => [row.id, row]));

    const screenConfigs = await Promise.all(
      remotes
        .filter((remote) => byId.has(remote.screenId))
        .map((remote) => this.toScreenConfig(remote, byId.get(remote.screenId)!)),
    );

    return {
      agentId,
      organisationId: agent?.organisationId ?? '',
      probeIntervalMs: (agent?.probeIntervalMinutes ?? DEFAULT_PROBE_INTERVAL_MINUTES) * 60_000,
      subnetSweepEnabled: agent?.subnetSweepEnabled ?? false,
      appId: this.appId,
      screens: screenConfigs,
    };
  }

  private async toScreenConfig(
    remote: Awaited<ReturnType<ScreenRemoteControlService['listForAgent']>>[number],
    screen: { id: string; name: string; lastHeartbeat: Date | null },
  ): Promise<AgentScreenConfig> {
    // Only worth computing when the agent would act on it — the query walks
    // every schedule entry of the screen and its group.
    const nextStart = remote.wakeBeforeScheduleEnabled
      ? await this.scheduleBoundaries.getNextStart(screen.id)
      : null;

    return {
      screenId: screen.id,
      name: screen.name,
      localIp: remote.localIp,
      macAddress: remote.macAddress,
      ssapPort: remote.ssapPort,
      devmodePassphrase: remote.devmodePassphrase,
      autoLaunchEnabled: remote.autoLaunchEnabled,
      extendDevmodeEnabled: remote.extendDevmodeEnabled,
      devmodeExtendIntervalDays: remote.devmodeExtendIntervalDays,
      lastDevmodeExtendAt: remote.lastDevmodeExtendAt?.toISOString() ?? null,
      wakeBeforeScheduleEnabled: remote.wakeBeforeScheduleEnabled,
      wakeLeadTimeMinutes: remote.wakeLeadTimeMinutes,
      wakeOnUnreachableEnabled: remote.wakeOnUnreachableEnabled,
      playerHeartbeatStale: this.isHeartbeatStale(screen.lastHeartbeat),
      nextScheduleStartAt: nextStart?.toISOString() ?? null,
      sshHostKeyFingerprint: remote.sshHostKeyFingerprint,
      keyStatus: remote.keyStatus,
      sshStatus: remote.sshStatus,
      ssapStatus: remote.ssapStatus,
      onboardingStep: remote.onboardingStep,
    };
  }

  /** A screen that never sent a heartbeat counts as stale: the app is not running. */
  private isHeartbeatStale(lastHeartbeat: Date | null): boolean {
    if (!lastHeartbeat) {
      return true;
    }
    return Date.now() - lastHeartbeat.getTime() > this.screenOfflineThresholdMs;
  }
}
