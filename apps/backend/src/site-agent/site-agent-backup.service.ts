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
  ScreenRemoteControlService,
  type BackupRestoreVerdict,
} from './screen-remote-control.service';
import { SiteAgentCommandType } from './site-agent-command.enum';
import {
  SITE_AGENT_BACKUP_EXPORTED,
  SITE_AGENT_BACKUP_IMPORTED,
  SITE_AGENT_BACKUP_IMPORT_KEY,
  SiteAgentBackupExportedEvent,
  SiteAgentBackupImportKeyEvent,
  SiteAgentBackupImportedEvent,
} from './site-agent-backup.event';
import type {
  AgentBackupExportDto,
  AgentBackupImportKeyDto,
  AgentBackupImportResultDto,
  AgentBackupRestoreDto,
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

type ImportState = 'awaiting_key' | 'ready' | 'staged' | 'fetched' | 'restored';

interface ImportRecord extends Owner {
  state: ImportState;
  publicKey?: string;
  backup?: string;
  sealedPassword?: string;
  sourceAgentId?: string;
  verdict?: BackupRestoreVerdict;
}

export interface CollectedBackup {
  backup: string;
  sealedPassword: string;
}

/**
 * Relays agent backups between the dashboard and the agent.
 *
 * Deliberately blind: everything it holds is either sealed under the backup
 * password or sealed for one party's ephemeral key, so a dump of Redis — or of
 * this process — does not open a backup. The only plaintext that passes through
 * is the per-screen settings on import, which the server stores anyway.
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
    private readonly remoteControls: ScreenRemoteControlService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── export ────────────────────────────────────────────────────────────────

  async startExport(
    organisationId: string,
    agentId: string,
    userId: string,
    recipientPublicKey: string,
  ): Promise<{ commandId: string }> {
    await this.agents.findOne(organisationId, agentId);
    const commandId = randomUUID();
    await this.put<ExportRecord>('export', commandId, { agentId, organisationId, userId });
    if (
      !this.sse.push(agentId, {
        commandId,
        type: SiteAgentCommandType.ExportBackup,
        recipientPublicKey,
      })
    ) {
      await this.redis.del(this.key('export', commandId));
      throw new ConflictException('Site agent is offline');
    }
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

    const complete = dto.backup !== undefined && dto.sealedPassword !== undefined;
    const error = complete ? undefined : (dto.error ?? 'The agent sent an incomplete export');
    await this.put<ExportRecord>('export', commandId, {
      ...record,
      ...(complete ? { backup: dto.backup, sealedPassword: dto.sealedPassword } : { error }),
    });

    this.eventEmitter.emit(
      SITE_AGENT_BACKUP_EXPORTED,
      new SiteAgentBackupExportedEvent(agentId, record.organisationId, commandId, error ?? null),
    );
    if (complete) {
      this.eventEmitter.emit(
        AUDIT_SITE_AGENT_BACKUP_EXPORTED,
        new AuditSiteAgentEvent(agentId, record.organisationId, record.userId, {
          sizeBytes: Buffer.byteLength(dto.backup ?? '', 'base64'),
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

  // ── import ────────────────────────────────────────────────────────────────

  /** Asks the agent for a key to seal the password for. */
  async startImport(
    organisationId: string,
    agentId: string,
    userId: string,
  ): Promise<{ sessionId: string }> {
    await this.agents.findOne(organisationId, agentId);
    const sessionId = randomUUID();
    await this.put<ImportRecord>('import', sessionId, {
      agentId,
      organisationId,
      userId,
      state: 'awaiting_key',
    });
    if (
      !this.sse.push(agentId, {
        commandId: sessionId,
        type: SiteAgentCommandType.BeginBackupImport,
      })
    ) {
      await this.redis.del(this.key('import', sessionId));
      throw new ConflictException('Site agent is offline');
    }
    return { sessionId };
  }

  async receiveImportKey(
    agentId: string,
    sessionId: string,
    dto: AgentBackupImportKeyDto,
  ): Promise<void> {
    const record = await this.requireAgentSession(agentId, sessionId, 'awaiting_key');
    const error = dto.publicKey ? null : (dto.error ?? 'The agent sent no key');

    if (dto.publicKey) {
      await this.put<ImportRecord>('import', sessionId, {
        ...record,
        state: 'ready',
        publicKey: dto.publicKey,
      });
    } else {
      await this.redis.del(this.key('import', sessionId));
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

  /** Takes the sealed file from the dashboard and tells the agent to fetch it. */
  async stageImport(
    organisationId: string,
    agentId: string,
    userId: string,
    dto: StageBackupImportDto,
  ): Promise<{ commandId: string }> {
    const record = await this.get<ImportRecord>('import', dto.sessionId);
    if (!record || !this.isOwner(record, { organisationId, agentId, userId })) {
      throw new NotFoundException('No import session under that id');
    }
    if (record.state !== 'ready') {
      throw new ConflictException('This import session is not waiting for a file');
    }

    await this.put<ImportRecord>('import', dto.sessionId, {
      ...record,
      state: 'staged',
      backup: dto.backup,
      sealedPassword: dto.sealedPassword,
    });
    const commandId = randomUUID();
    if (
      !this.sse.push(agentId, {
        commandId,
        type: SiteAgentCommandType.ImportBackup,
        sessionId: dto.sessionId,
      })
    ) {
      await this.redis.del(this.key('import', dto.sessionId));
      throw new ConflictException('Site agent is offline');
    }
    return { commandId };
  }

  /** The agent collects the file, once; the copy here is dropped as it goes. */
  async fetchImport(agentId: string, sessionId: string): Promise<CollectedBackup> {
    const record = await this.requireAgentSession(agentId, sessionId, 'staged');
    const { backup, sealedPassword, ...rest } = record;
    await this.put<ImportRecord>('import', sessionId, { ...rest, state: 'fetched' });
    return { backup: backup as string, sealedPassword: sealedPassword as string };
  }

  async restore(
    agentId: string,
    sessionId: string,
    dto: AgentBackupRestoreDto,
  ): Promise<{ assignedScreenIds: string[]; skipped: BackupRestoreVerdict['skipped'] }> {
    const record = await this.requireAgentSession(agentId, sessionId, 'fetched');
    const verdict = await this.remoteControls.restoreFromBackup(
      record.organisationId,
      agentId,
      dto.screens,
    );
    await this.put<ImportRecord>('import', sessionId, {
      ...record,
      state: 'restored',
      sourceAgentId: dto.sourceAgentId,
      verdict,
    });
    // Audited here, where the rows change, rather than when the agent reports
    // back: an agent that fails or vanishes after this point must not leave
    // created and reassigned screens without a trace. Ids and field names
    // only — never the values.
    this.eventEmitter.emit(
      AUDIT_SITE_AGENT_BACKUP_IMPORTED,
      new AuditSiteAgentEvent(agentId, record.organisationId, record.userId, {
        sourceAgentId: dto.sourceAgentId,
        restored: verdict.restored,
        skipped: verdict.skipped,
      }),
    );
    return {
      assignedScreenIds: verdict.restored.map((entry) => entry.screenId),
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
    // agent claims is dropped before it reaches every dashboard of the org.
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
