import { randomUUID } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  AUDIT_SITE_AGENT_CAPTURE_LICENSE_ACCEPTED,
  AUDIT_SITE_AGENT_CAPTURE_LICENSE_REVOKED,
  AuditSiteAgentEvent,
} from '../audit-log/audit.events';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { capturePluginAcceptances, users, type CapturePluginAcceptance } from '../db/schema';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import {
  CapturePluginStatusService,
  type CapturePluginStatus,
} from './capture-plugin-status.service';
import { CapturePluginLicenseTextService } from './capture-plugin-license-text.service';
import {
  CAPTURE_LICENSE_MISMATCH,
  CAPTURE_LICENSE_TEXT_MISSING,
  CAPTURE_PLUGIN_NOT_READY,
  type CaptureLicenseTextView,
  type CapturePluginView,
} from './capture-plugin-acceptance.types';

/** Shown when the accepting user has no display name; never their email. */
const UNKNOWN_USER_NAME = 'Unknown';

/** Bound on the device-acceptance memo; one entry per agent and license hash. */
const MAX_DEVICE_MEMO = 2000;

/**
 * License acceptance for the capture plugin: the admin's acceptance from the
 * dashboard, the acceptance an operator made on the device, and the gate that
 * keeps NDI streams off agents whose plugin is not licensed.
 */
@Injectable()
export class CapturePluginAcceptanceService {
  /** `agentId:licenseSha256` pairs whose device acceptance is already recorded. */
  private readonly deviceRecorded = new Set<string>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly agents: SiteAgentService,
    private readonly status: CapturePluginStatusService,
    private readonly texts: CapturePluginLicenseTextService,
    private readonly sse: SiteAgentSseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getView(organisationId: string, agentId: string): Promise<CapturePluginView> {
    await this.agents.findOne(organisationId, agentId);
    return this.buildView(agentId);
  }

  async getLicenseText(organisationId: string, agentId: string): Promise<CaptureLicenseTextView> {
    await this.agents.findOne(organisationId, agentId);
    const hash = this.status.get(agentId)?.license?.licenseSha256;
    const row = hash ? await this.texts.find(hash) : undefined;
    if (!row) {
      throw new NotFoundException('License text not available yet');
    }
    return {
      licenseSha256: row.licenseSha256,
      ndiLicenseText: row.ndiLicenseText,
      termsText: row.termsText,
    };
  }

  async accept(
    organisationId: string,
    agentId: string,
    userId: string,
    licenseSha256: string,
  ): Promise<CapturePluginView> {
    await this.agents.findOne(organisationId, agentId);
    const reported = this.status.get(agentId)?.license?.licenseSha256;
    if (!reported || reported !== licenseSha256) {
      throw new ConflictException(CAPTURE_LICENSE_MISMATCH);
    }
    if (!(await this.texts.find(licenseSha256))) {
      throw new ConflictException(CAPTURE_LICENSE_TEXT_MISSING);
    }

    const now = new Date();
    await this.db.transaction(async (tx) => {
      // One active acceptance per agent: a newer one supersedes the older.
      await tx
        .update(capturePluginAcceptances)
        .set({ revokedAt: now, revokedByUserId: userId })
        .where(
          and(
            eq(capturePluginAcceptances.agentId, agentId),
            isNull(capturePluginAcceptances.revokedAt),
          ),
        );
      await tx.insert(capturePluginAcceptances).values({
        organisationId,
        agentId,
        licenseSha256,
        source: 'dashboard',
        acceptedByUserId: userId,
        acceptedAt: now,
      });
    });

    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_CAPTURE_LICENSE_ACCEPTED,
      new AuditSiteAgentEvent(agentId, organisationId, userId, {
        licenseSha256,
        source: 'dashboard',
      }),
    );
    this.pushReloadConfig(agentId);
    return this.buildView(agentId);
  }

  async revoke(organisationId: string, agentId: string, userId: string): Promise<void> {
    await this.agents.findOne(organisationId, agentId);
    const revoked = await this.db
      .update(capturePluginAcceptances)
      .set({ revokedAt: new Date(), revokedByUserId: userId })
      .where(
        and(
          eq(capturePluginAcceptances.agentId, agentId),
          isNull(capturePluginAcceptances.revokedAt),
        ),
      )
      .returning({ licenseSha256: capturePluginAcceptances.licenseSha256 });
    if (revoked.length === 0) {
      throw new NotFoundException('No active license acceptance');
    }
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_CAPTURE_LICENSE_REVOKED,
      new AuditSiteAgentEvent(agentId, organisationId, userId, {
        licenseSha256: revoked.map((row) => row.licenseSha256),
      }),
    );
    this.pushReloadConfig(agentId);
  }

  /**
   * Records an acceptance the operator made on the device. Called with every
   * agent report, so the common case (already recorded) costs no query.
   */
  async recordDeviceAcceptance(
    organisationId: string,
    agentId: string,
    report: CapturePluginStatus,
  ): Promise<void> {
    const hash = report.license?.licenseSha256;
    if (report.acceptedVia !== 'environment' || !hash) {
      return;
    }
    const memoKey = `${agentId}:${hash}`;
    if (this.deviceRecorded.has(memoKey)) {
      return;
    }
    const existing = await this.db
      .select({
        source: capturePluginAcceptances.source,
        revokedAt: capturePluginAcceptances.revokedAt,
      })
      .from(capturePluginAcceptances)
      .where(
        and(
          eq(capturePluginAcceptances.agentId, agentId),
          eq(capturePluginAcceptances.licenseSha256, hash),
        ),
      );
    // A revoked device row stays a tombstone: the environment still accepts,
    // but that is not a new decision to record.
    const alreadyKnown = existing.some((row) => row.source === 'device' || row.revokedAt === null);
    if (!alreadyKnown) {
      await this.db.insert(capturePluginAcceptances).values({
        organisationId,
        agentId,
        licenseSha256: hash,
        source: 'device',
        acceptedByUserId: null,
      });
      this.eventEmitter.emit(
        AUDIT_SITE_AGENT_CAPTURE_LICENSE_ACCEPTED,
        new AuditSiteAgentEvent(agentId, organisationId, null, {
          licenseSha256: hash,
          source: 'device',
        }),
      );
    }
    if (this.deviceRecorded.size >= MAX_DEVICE_MEMO) {
      this.deviceRecorded.clear();
    }
    this.deviceRecorded.add(memoKey);
  }

  /** Plugin state for the agent list and detail; `absent` when no fresh report exists. */
  stateOf(agentId: string): CapturePluginView['state'] {
    return this.status.get(agentId)?.state ?? 'absent';
  }

  /** 409 unless the plugin is ready and an active acceptance matches its reported hash. */
  async assertNdiReady(agentId: string): Promise<void> {
    const reported = this.status.get(agentId);
    if (reported?.state !== 'ready' || !reported.license) {
      throw new ConflictException(CAPTURE_PLUGIN_NOT_READY);
    }
    const [match] = await this.db
      .select({ id: capturePluginAcceptances.id })
      .from(capturePluginAcceptances)
      .where(
        and(
          eq(capturePluginAcceptances.agentId, agentId),
          eq(capturePluginAcceptances.licenseSha256, reported.license.licenseSha256),
          isNull(capturePluginAcceptances.revokedAt),
        ),
      )
      .limit(1);
    if (!match) {
      throw new ConflictException(CAPTURE_PLUGIN_NOT_READY);
    }
  }

  private async buildView(agentId: string): Promise<CapturePluginView> {
    const reported = this.status.get(agentId);
    const acceptance = await this.latestActive(agentId);
    const licenseTextAvailable = reported?.license
      ? !!(await this.texts.find(reported.license.licenseSha256))
      : false;
    return {
      state: reported?.state ?? 'absent',
      pluginVersion: reported?.pluginVersion ?? null,
      sdkVersion: reported?.sdkVersion ?? null,
      errorCode: reported?.errorCode ?? null,
      license: reported?.license ?? null,
      licenseTextAvailable,
      acceptance: acceptance ? await this.toAcceptanceView(acceptance) : null,
      reportedAt: reported?.reportedAt ?? null,
    };
  }

  private async latestActive(agentId: string): Promise<CapturePluginAcceptance | undefined> {
    const [row] = await this.db
      .select()
      .from(capturePluginAcceptances)
      .where(
        and(
          eq(capturePluginAcceptances.agentId, agentId),
          isNull(capturePluginAcceptances.revokedAt),
        ),
      )
      .orderBy(desc(capturePluginAcceptances.acceptedAt))
      .limit(1);
    return row;
  }

  private async toAcceptanceView(
    row: CapturePluginAcceptance,
  ): Promise<NonNullable<CapturePluginView['acceptance']>> {
    let acceptedBy: { id: string; name: string } | null = null;
    if (row.acceptedByUserId) {
      const [user] = await this.db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, row.acceptedByUserId))
        .limit(1);
      if (user) {
        acceptedBy = { id: user.id, name: user.name?.trim() || UNKNOWN_USER_NAME };
      }
    }
    return {
      licenseSha256: row.licenseSha256,
      source: row.source,
      acceptedAt: row.acceptedAt.toISOString(),
      acceptedBy,
    };
  }

  private pushReloadConfig(agentId: string): void {
    this.sse.push(agentId, { commandId: randomUUID(), type: SiteAgentCommandType.ReloadConfig });
  }
}
