import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenRemoteControls, screens, siteAgents, type ScreenRemoteControl } from '../db/schema';
import { SecretCipher } from '../common/secret-cipher.service';
import {
  AUDIT_SCREEN_REMOTE_CONTROL_REMOVED,
  AUDIT_SCREEN_REMOTE_CONTROL_UPDATED,
  AuditScreenRemoteEvent,
} from '../audit-log/audit.events';
import {
  SCREEN_REMOTE_CONFIG_CHANGED,
  ScreenRemoteConfigChangedEvent,
} from './screen-onboarding.event';
import { ScreenReachability } from './screen-reachability.enum';
import { DevmodeKeyStatus } from './devmode-key-status.enum';
import { SshStatus } from './ssh-status.enum';
import { SsapStatus } from './ssap-status.enum';
import type { UpdateScreenRemoteControlDto } from './dto/update-screen-remote-control.dto';

/** Defaults a screen gets before anyone has configured remote control for it. */
export const REMOTE_CONTROL_DEFAULTS = {
  agentId: null,
  localIp: null,
  macAddress: null,
  devmodePassphrase: null,
  ssapPort: 3001,
  autoLaunchEnabled: true,
  extendDevmodeEnabled: true,
  devmodeExtendIntervalDays: 7,
  wakeBeforeScheduleEnabled: false,
  wakeLeadTimeMinutes: 10,
  wakeOnUnreachableEnabled: false,
  reachability: ScreenReachability.Unknown,
  lastProbeAt: null,
  lastProbeError: null,
  lastLaunchAt: null,
  appLaunchPlannedAt: null,
  lastWakeAt: null,
  lastDevmodeExtendAt: null,
  lastDevmodeExtendOk: null,
  keyStatus: DevmodeKeyStatus.Unknown,
  sshStatus: SshStatus.Unknown,
  ssapStatus: SsapStatus.Unknown,
  sshHostKeyFingerprint: null,
  lastInstallAt: null,
  lastInstallOk: null,
  lastStandbyAt: null,
  lastStandbyOk: null,
  installedAppId: null,
  installedAppVersion: null,
  installedAppVersionAt: null,
  onboardingStep: 1,
  onboardingCompletedAt: null,
} as const;

@Injectable()
export class ScreenRemoteControlService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cipher: SecretCipher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Callers of this service always see the passphrase in plaintext; the
   * ciphertext never leaves here. Whether a given caller is allowed to pass it
   * on is decided by which response type it maps to — the dashboard's masks it,
   * the agent's carries it.
   */
  private decryptSecrets(row: ScreenRemoteControl): ScreenRemoteControl {
    return { ...row, devmodePassphrase: this.cipher.decrypt(row.devmodePassphrase) ?? null };
  }

  /**
   * Returns the screen's settings, or a synthetic unconfigured row.
   *
   * A 404 for "nobody has set this up yet" would make the dashboard handle an
   * error for the normal first-visit case, exactly the reason the notification
   * config does the same.
   */
  async getForScreen(organisationId: string, screenId: string): Promise<ScreenRemoteControl> {
    await this.assertScreenInOrg(organisationId, screenId);

    const [row] = await this.db
      .select()
      .from(screenRemoteControls)
      .where(eq(screenRemoteControls.screenId, screenId))
      .limit(1);

    if (!row) {
      const now = new Date();
      return {
        screenId,
        organisationId,
        ...REMOTE_CONTROL_DEFAULTS,
        createdAt: now,
        updatedAt: now,
      };
    }
    return this.decryptSecrets(row);
  }

  async upsert(
    organisationId: string,
    screenId: string,
    dto: UpdateScreenRemoteControlDto,
    userId: string | null,
  ): Promise<ScreenRemoteControl> {
    await this.assertScreenInOrg(organisationId, screenId);
    if (dto.agentId) {
      await this.assertAgentInOrg(organisationId, dto.agentId);
    }

    const existing = await this.getForScreen(organisationId, screenId);
    const merged = { ...existing, ...stripUndefined(dto) };

    // A wake toggle without a MAC address is a switch that silently does
    // nothing. Refusing it here is what lets the UI gate the toggle honestly.
    if (
      (merged.wakeBeforeScheduleEnabled || merged.wakeOnUnreachableEnabled) &&
      !merged.macAddress
    ) {
      throw new BadRequestException('Wake-on-LAN needs a MAC address');
    }

    const passphrase = this.resolvePassphrase(dto.devmodePassphrase, existing.devmodePassphrase);

    const values = {
      screenId,
      organisationId,
      agentId: merged.agentId,
      localIp: merged.localIp,
      macAddress: merged.macAddress,
      devmodePassphrase: passphrase,
      ssapPort: merged.ssapPort,
      autoLaunchEnabled: merged.autoLaunchEnabled,
      extendDevmodeEnabled: merged.extendDevmodeEnabled,
      devmodeExtendIntervalDays: merged.devmodeExtendIntervalDays,
      wakeBeforeScheduleEnabled: merged.wakeBeforeScheduleEnabled,
      wakeLeadTimeMinutes: merged.wakeLeadTimeMinutes,
      wakeOnUnreachableEnabled: merged.wakeOnUnreachableEnabled,
    };

    const [saved] = await this.db
      .insert(screenRemoteControls)
      .values(values)
      .onConflictDoUpdate({
        target: screenRemoteControls.screenId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    // Both the agent losing the screen and the one gaining it need to re-pull.
    const affectedAgents = [existing.agentId, saved.agentId].filter(
      (id): id is string => id !== null,
    );
    if (affectedAgents.length > 0) {
      this.eventEmitter.emit(
        SCREEN_REMOTE_CONFIG_CHANGED,
        new ScreenRemoteConfigChangedEvent([...new Set(affectedAgents)]),
      );
    }

    // `details` deliberately records only which fields changed, never their
    // values: audit entries are shown in the organisation's own audit log.
    this.eventEmitter.emit(
      AUDIT_SCREEN_REMOTE_CONTROL_UPDATED,
      new AuditScreenRemoteEvent(screenId, organisationId, userId, {
        changed: Object.keys(stripUndefined(dto)),
      }),
    );

    return this.decryptSecrets(saved);
  }

  /**
   * Removes a screen's remote-control settings entirely.
   *
   * The row is deleted rather than its `agentId` nulled, and that is the point:
   * what is left behind would otherwise be the old address, the old passphrase
   * and a completed onboarding, so handing the screen to an agent again would
   * silently reuse all of it instead of walking the operator through the set in
   * front of them. A removed screen starts from nothing, like one that was
   * never managed.
   */
  async remove(organisationId: string, screenId: string, userId: string | null): Promise<void> {
    await this.assertScreenInOrg(organisationId, screenId);

    const [removed] = await this.db
      .delete(screenRemoteControls)
      .where(eq(screenRemoteControls.screenId, screenId))
      .returning({ agentId: screenRemoteControls.agentId });

    if (!removed) {
      // Nothing was configured; the caller already has what it asked for.
      return;
    }

    if (removed.agentId) {
      this.eventEmitter.emit(
        SCREEN_REMOTE_CONFIG_CHANGED,
        new ScreenRemoteConfigChangedEvent([removed.agentId]),
      );
    }

    this.eventEmitter.emit(
      AUDIT_SCREEN_REMOTE_CONTROL_REMOVED,
      new AuditScreenRemoteEvent(screenId, organisationId, userId, {
        previousAgentId: removed.agentId,
      }),
    );
  }

  /**
   * Clears the settings of every screen an agent looked after. Called when the
   * agent itself is deleted: the foreign key would only null `agent_id`, which
   * leaves exactly the stale state {@link remove} exists to avoid.
   */
  async removeForAgent(agentId: string): Promise<number> {
    const removed = await this.db
      .delete(screenRemoteControls)
      .where(eq(screenRemoteControls.agentId, agentId))
      .returning({ screenId: screenRemoteControls.screenId });
    return removed.length;
  }

  /** True when that screen is assigned to that agent. The agent's authorisation. */
  async isManagedBy(agentId: string, screenId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ screenId: screenRemoteControls.screenId })
      .from(screenRemoteControls)
      .where(
        and(eq(screenRemoteControls.screenId, screenId), eq(screenRemoteControls.agentId, agentId)),
      )
      .limit(1);
    return row !== undefined;
  }

  /** Every screen an agent looks after, passphrases decrypted. */
  async listForAgent(agentId: string): Promise<ScreenRemoteControl[]> {
    const rows = await this.db
      .select()
      .from(screenRemoteControls)
      .where(eq(screenRemoteControls.agentId, agentId));
    return rows.map((row) => this.decryptSecrets(row));
  }

  /**
   * Blank means "keep the stored value". The client can never read the
   * passphrase back, so an empty field is the only thing it can honestly send
   * for "unchanged" — and treating that as "clear it" would wipe the secret
   * every time someone saved an unrelated toggle.
   *
   * `null`, which the UI sends from an explicit clear action, does clear it.
   */
  private resolvePassphrase(
    incoming: string | null | undefined,
    existingPlaintext: string | null,
  ): string | null {
    if (incoming === undefined || incoming === '') {
      return this.cipher.encrypt(existingPlaintext) ?? null;
    }
    if (incoming === null) {
      return null;
    }
    return this.cipher.encrypt(incoming) ?? null;
  }

  private async assertScreenInOrg(organisationId: string, screenId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: screens.id })
      .from(screens)
      .where(and(eq(screens.id, screenId), eq(screens.organisationId, organisationId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException(`Screen with id "${screenId}" not found`);
    }
  }

  private async assertAgentInOrg(organisationId: string, agentId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: siteAgents.id })
      .from(siteAgents)
      .where(and(eq(siteAgents.id, agentId), eq(siteAgents.organisationId, organisationId)))
      .limit(1);
    if (!row) {
      throw new NotFoundException(`Site agent with id "${agentId}" not found`);
    }
  }
}

/** Drops keys the caller omitted, so they do not overwrite stored values with undefined. */
function stripUndefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
