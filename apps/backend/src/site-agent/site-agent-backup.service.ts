import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis';
import {
  AUDIT_SITE_AGENT_BACKUP_EXPORTED,
  AUDIT_SITE_AGENT_BACKUP_IMPORTED,
  AuditSiteAgentEvent,
} from '../audit-log/audit.events';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import {
  SiteAgentBackupRestoreService,
  type BackupMapping,
  type BackupPlan,
  type BackupRestoreVerdict,
} from './site-agent-backup-restore.service';
import {
  SiteAgentBackupOperationService,
  type BackupOperation,
} from './site-agent-backup-operation.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import { DELETE_UNLESS_SCRIPT, TRANSITION_SCRIPT } from './site-agent-backup.scripts';
import type { SiteAgentCommand } from './site-agent-command.types';
import {
  SITE_AGENT_BACKUP_EXPORTED,
  SITE_AGENT_BACKUP_IMPORTED,
  SITE_AGENT_BACKUP_IMPORT_ANALYSED,
  SITE_AGENT_BACKUP_IMPORT_KEY,
  SiteAgentBackupExportedEvent,
  SiteAgentBackupImportAnalysedEvent,
  SiteAgentBackupImportKeyEvent,
  SiteAgentBackupImportedEvent,
} from './site-agent-backup.event';
import type {
  AgentBackupAnalysisDto,
  AgentBackupExportDto,
  AgentBackupImportKeyDto,
  AgentBackupImportResultDto,
  AgentBackupRestoreDto,
  ApplyBackupImportDto,
  StageBackupImportDto,
} from './dto/site-agent-backup.dto';

/** Long enough for a person to read a dialog, short enough not to linger. */
const TTL_SECONDS = 10 * 60;
const KEY_PREFIX = 'site-agent-backup';

interface Owner {
  agentId: string;
  organisationId: string;
  userId: string;
}

interface ExportRecord extends Owner {
  backup?: string;
  sealedPassword?: string;
  error?: string;
}

type ImportState =
  | 'awaiting_key'
  | 'ready'
  | 'staged'
  | 'fetched'
  | 'analysed'
  | 'applying'
  | 'restoring'
  | 'restored';

interface ImportRecord extends Owner {
  state: ImportState;
  publicKey?: string;
  backup?: string;
  sealedPassword?: string;
  sourceAgentId?: string;
  /** Holds no secret: names, ids and statuses only. */
  plan?: BackupPlan;
  mappings?: BackupMapping[];
  verdict?: BackupRestoreVerdict;
}

export interface CollectedBackup {
  backup: string;
  sealedPassword: string;
}

export interface BackupImportPlanResponse extends BackupPlan {
  sourceAgentId: string;
}

/** Which keys the agent writes where; `overwrite` for entries mapped onto another display. */
export interface BackupRestoreResponse {
  assignments: Array<{ from: string; to: string; overwrite: boolean }>;
  skipped: BackupRestoreVerdict['skipped'];
}

/**
 * Relays agent backups between the dashboard and the agent.
 *
 * Deliberately blind: the file and the password only pass through sealed, and
 * what waits here while the operator maps entries is names and ids. The only
 * secret that crosses in the clear is the passphrase at the very end, on its
 * way into the database, where it is stored encrypted as always.
 *
 * An import runs in two phases: the agent opens the file and describes it
 * (`analysis`), the server plans what each entry would do, the operator maps
 * entries the organisation no longer knows (or skips them), and only then does
 * the agent restore (`restore` → `result`).
 *
 * State lives in Redis with a short TTL rather than in memory, so it survives a
 * request landing on a different instance and disappears by itself if a
 * dashboard tab is closed half-way.
 */
@Injectable()
export class SiteAgentBackupService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly agents: SiteAgentService,
    private readonly sse: SiteAgentSseService,
    private readonly restorer: SiteAgentBackupRestoreService,
    private readonly operations: SiteAgentBackupOperationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** The operation running on an agent, for the page that opens while one does. */
  async status(organisationId: string, agentId: string): Promise<BackupOperation | null> {
    await this.agents.findOne(organisationId, agentId);
    return this.operations.current(agentId);
  }

  // ── export ────────────────────────────────────────────────────────────────

  async startExport(
    organisationId: string,
    agentId: string,
    userId: string,
    recipientPublicKey: string,
  ): Promise<{ commandId: string }> {
    await this.agents.findOne(organisationId, agentId);
    const commandId = randomUUID();
    await this.operations.begin(organisationId, agentId, 'export', commandId, userId, 'exporting');
    await this.releaseOnFailure(organisationId, agentId, commandId, () =>
      this.put<ExportRecord>('export', commandId, { agentId, organisationId, userId }),
    );
    await this.pushOrRelease(organisationId, agentId, 'export', commandId, {
      commandId,
      type: SiteAgentCommandType.ExportBackup,
      recipientPublicKey,
    });
    return { commandId };
  }

  async receiveExport(
    agentId: string,
    commandId: string,
    dto: AgentBackupExportDto,
  ): Promise<void> {
    const record = await this.get<ExportRecord>('export', commandId);
    if (!record || record.agentId !== agentId || record.backup || record.error) {
      throw new NotFoundException('No export is waiting for this agent under that id');
    }

    const backup = dto.backup;
    const sealedPassword = dto.sealedPassword;
    const complete = backup !== undefined && sealedPassword !== undefined;
    const error = complete ? undefined : (dto.error ?? 'The agent sent an incomplete export');
    await this.put<ExportRecord>('export', commandId, {
      ...record,
      ...(complete ? { backup, sealedPassword } : { error }),
    });
    await this.operations.end(record.organisationId, agentId, commandId);

    this.eventEmitter.emit(
      SITE_AGENT_BACKUP_EXPORTED,
      new SiteAgentBackupExportedEvent(agentId, record.organisationId, commandId, error ?? null),
    );
    if (complete) {
      this.eventEmitter.emit(
        AUDIT_SITE_AGENT_BACKUP_EXPORTED,
        new AuditSiteAgentEvent(agentId, record.organisationId, record.userId, {
          sizeBytes: Buffer.byteLength(backup, 'base64'),
        }),
      );
    }
  }

  /** Hands the finished export to the person who asked for it, once. */
  async collectExport(
    organisationId: string,
    agentId: string,
    userId: string,
    commandId: string,
  ): Promise<CollectedBackup> {
    const record = await this.get<ExportRecord>('export', commandId);
    if (!record || !this.isOwner(record, { organisationId, agentId, userId })) {
      throw new NotFoundException('No export under that id');
    }
    if (record.error) {
      await this.redis.del(this.key('export', commandId));
      throw new BadRequestException(record.error);
    }
    if (!record.backup || !record.sealedPassword) {
      throw new ConflictException('The agent has not finished the export yet');
    }
    await this.redis.del(this.key('export', commandId));
    return { backup: record.backup, sealedPassword: record.sealedPassword };
  }

  // ── import: dashboard side ────────────────────────────────────────────────

  /** Asks the agent for a key to seal the password for. */
  async startImport(
    organisationId: string,
    agentId: string,
    userId: string,
  ): Promise<{ sessionId: string }> {
    await this.agents.findOne(organisationId, agentId);
    const sessionId = randomUUID();
    await this.operations.begin(
      organisationId,
      agentId,
      'import',
      sessionId,
      userId,
      'waiting_for_agent',
    );
    await this.releaseOnFailure(organisationId, agentId, sessionId, () =>
      this.put<ImportRecord>('import', sessionId, {
        agentId,
        organisationId,
        userId,
        state: 'awaiting_key',
      }),
    );
    await this.pushOrRelease(organisationId, agentId, 'import', sessionId, {
      commandId: sessionId,
      type: SiteAgentCommandType.BeginBackupImport,
    });
    return { sessionId };
  }

  /** Takes the sealed file from the dashboard and tells the agent to fetch it. */
  async stageImport(
    organisationId: string,
    agentId: string,
    userId: string,
    dto: StageBackupImportDto,
  ): Promise<{ commandId: string }> {
    const record = await this.requireOwnedSession(
      { organisationId, agentId, userId },
      dto.sessionId,
      'ready',
    );
    await this.transition(dto.sessionId, 'ready', {
      ...record,
      state: 'staged',
      backup: dto.backup,
      sealedPassword: dto.sealedPassword,
    });
    await this.operations.advance(organisationId, agentId, dto.sessionId, 'decrypting');
    const commandId = randomUUID();
    await this.pushOrRelease(organisationId, agentId, 'import', dto.sessionId, {
      commandId,
      type: SiteAgentCommandType.ImportBackup,
      sessionId: dto.sessionId,
    });
    return { commandId };
  }

  /** What the import would do, for the person mapping it. */
  async getPlan(
    organisationId: string,
    agentId: string,
    userId: string,
    sessionId: string,
  ): Promise<BackupImportPlanResponse> {
    const record = await this.requireOwnedSession(
      { organisationId, agentId, userId },
      sessionId,
      'analysed',
    );
    return { sourceAgentId: record.sourceAgentId as string, ...(record.plan as BackupPlan) };
  }

  /** Records the operator's mapping and tells the agent to go ahead. */
  async applyImport(
    organisationId: string,
    agentId: string,
    userId: string,
    sessionId: string,
    dto: ApplyBackupImportDto,
  ): Promise<{ commandId: string }> {
    const record = await this.requireOwnedSession(
      { organisationId, agentId, userId },
      sessionId,
      'analysed',
    );
    this.restorer.validateMappings(record.plan as BackupPlan, dto.mappings);
    await this.transition(sessionId, 'analysed', {
      ...record,
      state: 'applying',
      mappings: dto.mappings.map(({ from, to }) => ({ from, to })),
    });
    await this.operations.advance(organisationId, agentId, sessionId, 'applying');
    const commandId = randomUUID();
    await this.pushOrRelease(organisationId, agentId, 'import', sessionId, {
      commandId,
      type: SiteAgentCommandType.ApplyBackupImport,
      sessionId,
    });
    return { commandId };
  }

  /**
   * Abandons an import before it is applied — the operator closed the dialog
   * at the mapping step. The agent's copy of the opened file expires on its own.
   */
  async cancelImport(
    organisationId: string,
    agentId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const record = await this.get<ImportRecord>('import', sessionId);
    if (!record || !this.isOwner(record, { organisationId, agentId, userId })) {
      throw new NotFoundException('No import session under that id');
    }
    // Deleted only if the agent has not been told to apply in the meantime;
    // checked inside Redis, so an apply racing this cancel cannot slip past it.
    const deleted = await this.redis.eval(
      DELETE_UNLESS_SCRIPT,
      1,
      this.key('import', sessionId),
      'applying',
      'restoring',
      'restored',
    );
    if (deleted === -1) {
      throw new ConflictException('The import is already being applied');
    }
    await this.operations.end(organisationId, agentId, sessionId);
  }

  // ── import: agent side ────────────────────────────────────────────────────

  async receiveImportKey(
    agentId: string,
    sessionId: string,
    dto: AgentBackupImportKeyDto,
  ): Promise<void> {
    const record = await this.requireAgentSession(agentId, sessionId, 'awaiting_key');
    const error = dto.publicKey ? null : (dto.error ?? 'The agent sent no key');

    if (dto.publicKey) {
      await this.transition(sessionId, 'awaiting_key', {
        ...record,
        state: 'ready',
        publicKey: dto.publicKey,
      });
      await this.operations.advance(record.organisationId, agentId, sessionId, 'waiting_for_file');
    } else {
      await this.redis.del(this.key('import', sessionId));
      await this.operations.end(record.organisationId, agentId, sessionId);
    }
    this.eventEmitter.emit(
      SITE_AGENT_BACKUP_IMPORT_KEY,
      new SiteAgentBackupImportKeyEvent(
        agentId,
        record.organisationId,
        sessionId,
        dto.publicKey ?? null,
        error,
      ),
    );
  }

  /** The agent collects the file, once; the copy here is dropped as it goes. */
  async fetchImport(agentId: string, sessionId: string): Promise<CollectedBackup> {
    const record = await this.requireAgentSession(agentId, sessionId, 'staged');
    const { backup, sealedPassword, ...rest } = record;
    await this.transition(sessionId, 'staged', { ...rest, state: 'fetched' });
    return { backup: backup as string, sealedPassword: sealedPassword as string };
  }

  /** The agent has opened the file; plan it and hand it to the operator. */
  async receiveAnalysis(
    agentId: string,
    sessionId: string,
    dto: AgentBackupAnalysisDto,
  ): Promise<void> {
    const record = await this.requireAgentSession(agentId, sessionId, 'fetched');
    const plan = await this.restorer.plan(record.organisationId, agentId, dto.entries);
    await this.transition(sessionId, 'fetched', {
      ...record,
      state: 'analysed',
      sourceAgentId: dto.sourceAgentId,
      plan,
    });
    await this.operations.advance(record.organisationId, agentId, sessionId, 'waiting_for_mapping');
    this.eventEmitter.emit(
      SITE_AGENT_BACKUP_IMPORT_ANALYSED,
      new SiteAgentBackupImportAnalysedEvent(agentId, record.organisationId, sessionId),
    );
  }

  async restore(
    agentId: string,
    sessionId: string,
    dto: AgentBackupRestoreDto,
  ): Promise<BackupRestoreResponse> {
    const record = await this.requireAgentSession(agentId, sessionId, 'applying');
    // Claimed before anything changes, so a second call cannot apply it twice.
    await this.transition(sessionId, 'applying', { ...record, state: 'restoring' });
    // Only what the operator was shown: an entry the plan never listed has no
    // business being restored, whatever the agent sends.
    const planned = new Set((record.plan?.entries ?? []).map((entry) => entry.screenId));
    const verdict = await this.restorer.restore(
      record.organisationId,
      agentId,
      dto.screens.filter((screen) => planned.has(screen.screenId)),
      record.mappings ?? [],
    );
    await this.put<ImportRecord>('import', sessionId, { ...record, state: 'restored', verdict });
    // Audited here, where the rows change, rather than when the agent reports
    // back: an agent that fails or vanishes after this point must not leave
    // created and reassigned screens without a trace. Ids and field names
    // only — never the values.
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_BACKUP_IMPORTED,
      new AuditSiteAgentEvent(agentId, record.organisationId, record.userId, {
        sourceAgentId: record.sourceAgentId ?? null,
        restored: verdict.restored,
        skipped: verdict.skipped,
      }),
    );
    return {
      assignments: verdict.restored.map((entry) => ({
        from: entry.sourceScreenId,
        to: entry.screenId,
        overwrite: entry.mapped,
      })),
      skipped: verdict.skipped,
    };
  }

  /** The agent's last word on an import; ends the session either way. */
  async receiveImportResult(
    agentId: string,
    sessionId: string,
    dto: AgentBackupImportResultDto,
  ): Promise<void> {
    const record = await this.get<ImportRecord>('import', sessionId);
    if (!record || record.agentId !== agentId) {
      throw new NotFoundException('No import session for this agent under that id');
    }
    await this.redis.del(this.key('import', sessionId));
    await this.operations.end(record.organisationId, agentId, sessionId);

    if (dto.error !== undefined) {
      this.eventEmitter.emit(
        SITE_AGENT_BACKUP_IMPORTED,
        new SiteAgentBackupImportedEvent(
          agentId,
          record.organisationId,
          sessionId,
          null,
          dto.error,
        ),
      );
      return;
    }
    if (record.state !== 'restored' || !record.verdict) {
      throw new ConflictException('The import was never applied');
    }

    // Only screens the server actually handed to this agent; anything else the
    // agent claims is dropped before it reaches the dashboard.
    const restoredIds = new Set(record.verdict.restored.map((entry) => entry.screenId));
    const summary = {
      ssapRestored: dto.ssapRestored ?? 0,
      devmodeKeysRestored: dto.devmodeKeysRestored ?? 0,
      staleSsapScreenIds: (dto.staleSsapScreenIds ?? []).filter((id) => restoredIds.has(id)),
      restored: record.verdict.restored,
      skipped: record.verdict.skipped,
    };
    this.eventEmitter.emit(
      SITE_AGENT_BACKUP_IMPORTED,
      new SiteAgentBackupImportedEvent(agentId, record.organisationId, sessionId, summary, null),
    );
  }

  // ── storage ───────────────────────────────────────────────────────────────

  /**
   * Pushes a command, or — when the agent is offline — drops the record and
   * frees the agent before answering 409, so a failed start leaves nothing
   * behind that blocks the next attempt.
   */
  private async pushOrRelease(
    organisationId: string,
    agentId: string,
    kind: 'export' | 'import',
    id: string,
    command: SiteAgentCommand,
  ): Promise<void> {
    if (this.sse.push(agentId, command)) {
      return;
    }
    await this.redis.del(this.key(kind, id));
    await this.operations.end(organisationId, agentId, id);
    throw new ConflictException('Site agent is offline');
  }

  /**
   * Moves an import session on, but only from the state it was read in. A
   * session cancelled or changed in between is not written back: the caller
   * gets 409 instead of resurrecting it.
   */
  private async transition(
    sessionId: string,
    from: ImportState,
    next: ImportRecord,
  ): Promise<void> {
    const moved = await this.redis.eval(
      TRANSITION_SCRIPT,
      1,
      this.key('import', sessionId),
      from,
      JSON.stringify(next),
      String(TTL_SECONDS),
    );
    if (moved !== 1) {
      throw new ConflictException('The import session was cancelled or changed meanwhile');
    }
  }

  /** Frees the agent if storing the first record fails right after claiming it. */
  private async releaseOnFailure(
    organisationId: string,
    agentId: string,
    id: string,
    write: () => Promise<void>,
  ): Promise<void> {
    try {
      await write();
    } catch (error) {
      await this.operations.end(organisationId, agentId, id);
      throw error;
    }
  }

  private async requireOwnedSession(
    caller: Owner,
    sessionId: string,
    state: ImportState,
  ): Promise<ImportRecord> {
    const record = await this.get<ImportRecord>('import', sessionId);
    if (!record || !this.isOwner(record, caller)) {
      throw new NotFoundException('No import session under that id');
    }
    if (record.state !== state) {
      throw new ConflictException(`The import session is ${record.state}, not ${state}`);
    }
    return record;
  }

  private async requireAgentSession(
    agentId: string,
    sessionId: string,
    state: ImportState,
  ): Promise<ImportRecord> {
    const record = await this.get<ImportRecord>('import', sessionId);
    if (!record || record.agentId !== agentId) {
      throw new NotFoundException('No import session for this agent under that id');
    }
    if (record.state !== state) {
      throw new ConflictException(`The import session is ${record.state}, not ${state}`);
    }
    return record;
  }

  private isOwner(record: Owner, caller: Owner): boolean {
    return (
      record.organisationId === caller.organisationId &&
      record.agentId === caller.agentId &&
      record.userId === caller.userId
    );
  }

  private key(kind: 'export' | 'import', id: string): string {
    return `${KEY_PREFIX}:${kind}:${id}`;
  }

  private async get<T>(kind: 'export' | 'import', id: string): Promise<T | null> {
    const raw = await this.redis.get(this.key(kind, id));
    return raw ? (JSON.parse(raw) as T) : null;
  }

  private async put<T>(kind: 'export' | 'import', id: string, value: T): Promise<void> {
    await this.redis.set(this.key(kind, id), JSON.stringify(value), 'EX', TTL_SECONDS);
  }
}
