import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenRemoteControls, screens, siteAgents } from '../db/schema';
import { SecretCipher } from '../common/secret-cipher.service';
import {
  SCREEN_REMOTE_CONFIG_CHANGED,
  ScreenRemoteConfigChangedEvent,
} from './screen-onboarding.event';
import { OnboardingStep } from './site-agent-command.enum';

/** One screen as a backup describes it. No secret except the passphrase. */
export interface BackupScreenEntry {
  screenId: string;
  /** The display's name when the backup was taken; absent in older files. */
  name?: string;
  devmodePassphrase?: string;
  localIp?: string;
  macAddress?: string;
  ssapPort?: number;
  /** Whether the file carries a pairing key / SSH key for it (the agent keeps those). */
  hasSsapKey?: boolean;
  hasDevmodeKey?: boolean;
}

/**
 * What an entry would do as it stands:
 * - `fill`: the screen exists and has settings this agent may complete
 * - `create`: the screen exists but has no settings; they are created
 * - `other_agent`: the screen belongs to another agent and is left alone
 * - `not_found`: no such screen in this organisation — map it or skip it
 */
export type BackupEntryStatus = 'fill' | 'create' | 'other_agent' | 'not_found';

export interface BackupPlanEntry {
  screenId: string;
  backupName: string | null;
  status: BackupEntryStatus;
  /** The screen's current name, when it exists. */
  screenName: string | null;
  /** For `other_agent`: whose it is. */
  ownerAgentName: string | null;
}

/** A screen an unknown entry could be mapped onto. */
export interface BackupTarget {
  screenId: string;
  name: string;
  /** Free or this agent's own; another agent's screens are listed but not selectable. */
  selectable: boolean;
  ownerAgentName: string | null;
}

export interface BackupPlan {
  entries: BackupPlanEntry[];
  targets: BackupTarget[];
}

export interface BackupMapping {
  /** The backup entry's screen id, which does not exist here. */
  from: string;
  /** The existing screen it is restored onto. */
  to: string;
}

export type BackupSkipReason =
  'screen_not_found' | 'assigned_to_other_agent' | 'target_unavailable';

export interface BackupRestoreVerdict {
  /** Screens now assigned to the importing agent; it may write their keys. */
  restored: Array<{
    screenId: string;
    /** The backup entry it came from; differs from `screenId` when mapped. */
    sourceScreenId: string;
    created: boolean;
    /** Mapped onto another screen: its settings and keys were overwritten. */
    mapped: boolean;
    fields: string[];
  }>;
  skipped: Array<{ screenId: string; reason: BackupSkipReason }>;
}

/** The settings a backup carries, in the order the audit entry lists them. */
const BACKUP_FIELDS = ['localIp', 'macAddress', 'devmodePassphrase'] as const;

interface OrgView {
  screenNames: Map<string, string>;
  owners: Map<string, string | null>;
  agentNames: Map<string, string>;
}

/**
 * Plans and applies the server's half of restoring an agent backup.
 *
 * The rule: a backup completes, it does not overwrite — unless the operator
 * explicitly maps an entry the organisation no longer knows onto an existing
 * screen. Then that screen gets the entry's settings (and, on the agent, its
 * keys), because that is what mapping means: "this TV is now that display".
 */
@Injectable()
export class SiteAgentBackupRestoreService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cipher: SecretCipher,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** What each entry would do, and which screens unknown entries may be mapped onto. */
  async plan(
    organisationId: string,
    agentId: string,
    entries: readonly BackupScreenEntry[],
  ): Promise<BackupPlan> {
    const view = await this.orgView(this.db, organisationId);
    const planEntries = dedupe(entries).map((entry) => this.classify(entry, agentId, view));
    const matched = new Set(
      planEntries.filter((entry) => entry.status !== 'not_found').map((entry) => entry.screenId),
    );

    const targets: BackupTarget[] = [...view.screenNames]
      .filter(([screenId]) => !matched.has(screenId))
      .map(([screenId, name]) => {
        const owner = view.owners.get(screenId) ?? null;
        return {
          screenId,
          name,
          selectable: owner === null || owner === agentId,
          ownerAgentName: owner && owner !== agentId ? (view.agentNames.get(owner) ?? null) : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { entries: planEntries, targets };
  }

  /**
   * Checks the operator's mapping against the plan: each `from` must be an
   * unknown entry, each `to` a selectable target, used once. Throws on the
   * first violation, naming it, so the dashboard can say what was wrong.
   */
  validateMappings(plan: BackupPlan, mappings: readonly BackupMapping[]): void {
    const unknown = new Set(
      plan.entries.filter((entry) => entry.status === 'not_found').map((entry) => entry.screenId),
    );
    const selectable = new Set(
      plan.targets.filter((target) => target.selectable).map((target) => target.screenId),
    );
    const used = new Set<string>();
    for (const { from, to } of mappings) {
      if (!unknown.has(from)) {
        throw new NotFoundException(`Backup entry ${from} is not one that needs mapping`);
      }
      if (!selectable.has(to)) {
        throw new NotFoundException(`Screen ${to} cannot receive a backup entry`);
      }
      if (used.has(to)) {
        throw new NotFoundException(`Screen ${to} is the target of more than one entry`);
      }
      used.add(to);
    }
  }

  /**
   * Applies a backup's settings in one transaction. The situation is read
   * again inside it rather than trusted from the plan: minutes may have passed
   * while the operator was mapping, and a screen given to another agent in the
   * meantime is skipped rather than taken back.
   */
  async restore(
    organisationId: string,
    agentId: string,
    entries: readonly BackupScreenEntry[],
    mappings: readonly BackupMapping[],
  ): Promise<BackupRestoreVerdict> {
    const verdict: BackupRestoreVerdict = { restored: [], skipped: [] };
    const targetOf = new Map(mappings.map((mapping) => [mapping.from, mapping.to]));

    await this.db.transaction(async (tx) => {
      // One restore per organisation at a time: two agents restoring onto the
      // same free screen would otherwise both see it free, and the second
      // insert would fail the whole import on the primary key.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`site-agent-backup:${organisationId}`}))`,
      );
      const view = await this.orgView(tx, organisationId);
      const targetIds = dedupe(entries)
        .map((entry) =>
          view.screenNames.has(entry.screenId) ? entry.screenId : targetOf.get(entry.screenId),
        )
        .filter((id): id is string => id !== undefined);
      const rows = targetIds.length
        ? await tx
            .select()
            .from(screenRemoteControls)
            .where(inArray(screenRemoteControls.screenId, targetIds))
        : [];
      const rowOf = new Map(rows.map((row) => [row.screenId, row]));
      const claimed = new Set<string>();

      for (const entry of dedupe(entries)) {
        const direct = view.screenNames.has(entry.screenId);
        const target = direct ? entry.screenId : targetOf.get(entry.screenId);
        if (!target || !view.screenNames.has(target) || claimed.has(target)) {
          verdict.skipped.push({
            screenId: entry.screenId,
            reason: target ? 'target_unavailable' : 'screen_not_found',
          });
          continue;
        }
        const row = rowOf.get(target);
        if (row?.agentId && row.agentId !== agentId) {
          verdict.skipped.push({
            screenId: entry.screenId,
            reason: direct ? 'assigned_to_other_agent' : 'target_unavailable',
          });
          continue;
        }
        claimed.add(target);

        const mapped = !direct;
        const fields = BACKUP_FIELDS.filter(
          (field) => entry[field] !== undefined && (mapped || !row || row[field] === null),
        );
        const values: Record<string, unknown> = Object.fromEntries(
          fields.map((field) => [
            field,
            field === 'devmodePassphrase'
              ? (this.cipher.encrypt(entry.devmodePassphrase) ?? null)
              : entry[field],
          ]),
        );
        // A port is never empty on an existing row, so only a new or mapped
        // row takes the backup's.
        if (entry.ssapPort !== undefined && (!row || mapped)) {
          values['ssapPort'] = entry.ssapPort;
        }
        // A display that is new here, or now stands for the backed-up TV,
        // starts where its restored data lets it: usually at the final check.
        if (!row || mapped) {
          values['onboardingStep'] = onboardingStartStep(entry);
          values['onboardingCompletedAt'] = null;
        }

        if (row) {
          await tx
            .update(screenRemoteControls)
            .set({ ...values, agentId, updatedAt: new Date() })
            .where(eq(screenRemoteControls.screenId, target));
        } else {
          await tx
            .insert(screenRemoteControls)
            .values({ screenId: target, organisationId, agentId, ...values });
        }
        verdict.restored.push({
          screenId: target,
          sourceScreenId: entry.screenId,
          created: !row,
          mapped,
          fields,
        });
      }
    });

    if (verdict.restored.length > 0) {
      this.eventEmitter.emit(
        SCREEN_REMOTE_CONFIG_CHANGED,
        new ScreenRemoteConfigChangedEvent([agentId]),
      );
    }
    return verdict;
  }

  private classify(entry: BackupScreenEntry, agentId: string, view: OrgView): BackupPlanEntry {
    const screenName = view.screenNames.get(entry.screenId) ?? null;
    const owner = view.owners.get(entry.screenId);
    let status: BackupEntryStatus;
    if (screenName === null) {
      status = 'not_found';
    } else if (owner === undefined) {
      status = 'create';
    } else if (owner !== null && owner !== agentId) {
      status = 'other_agent';
    } else {
      status = 'fill';
    }
    return {
      screenId: entry.screenId,
      backupName: entry.name ?? null,
      status,
      screenName,
      ownerAgentName:
        status === 'other_agent' ? (view.agentNames.get(owner as string) ?? null) : null,
    };
  }

  /** The organisation's screens, who looks after each, and the agents' names. */
  private async orgView(db: Pick<DrizzleDB, 'select'>, organisationId: string): Promise<OrgView> {
    const [screenRows, controlRows, agentRows] = await Promise.all([
      db
        .select({ id: screens.id, name: screens.name })
        .from(screens)
        .where(eq(screens.organisationId, organisationId)),
      db
        .select({ screenId: screenRemoteControls.screenId, agentId: screenRemoteControls.agentId })
        .from(screenRemoteControls)
        .where(eq(screenRemoteControls.organisationId, organisationId)),
      db
        .select({ id: siteAgents.id, name: siteAgents.name })
        .from(siteAgents)
        .where(and(eq(siteAgents.organisationId, organisationId))),
    ]);
    return {
      screenNames: new Map(screenRows.map((row) => [row.id, row.name])),
      owners: new Map(controlRows.map((row) => [row.screenId, row.agentId])),
      agentNames: new Map(agentRows.map((row) => [row.id, row.name])),
    };
  }
}

/**
 * Where a restored display picks up the onboarding: the first step its data
 * does not already cover, and the final check — which talks to the set and
 * starts the app, confirming everything at once — when nothing is missing.
 */
export function onboardingStartStep(entry: BackupScreenEntry): OnboardingStep {
  if (!entry.localIp) {
    return OnboardingStep.Network;
  }
  if (!entry.hasDevmodeKey) {
    return OnboardingStep.KeyServer;
  }
  if (!entry.devmodePassphrase) {
    return OnboardingStep.Passphrase;
  }
  if (!entry.hasSsapKey) {
    return OnboardingStep.Ssh;
  }
  return OnboardingStep.Finish;
}

/** A repeated id would insert the same primary key twice; the first entry wins. */
function dedupe(entries: readonly BackupScreenEntry[]): BackupScreenEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.screenId)) {
      return false;
    }
    seen.add(entry.screenId);
    return true;
  });
}
