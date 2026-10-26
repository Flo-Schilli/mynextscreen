import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { users } from '../db/schema';
import {
  SITE_AGENT_BACKUP_PROGRESS,
  SiteAgentBackupProgressEvent,
} from './site-agent-backup.event';
import { LOCK_UPDATE_SCRIPT } from './site-agent-backup.scripts';

export type BackupOperationKind = 'export' | 'import';

/** Where a running export or import stands, as the agent page shows it. */
export type BackupOperationStep =
  | 'exporting'
  | 'waiting_for_agent'
  | 'waiting_for_file'
  | 'decrypting'
  | 'waiting_for_mapping'
  | 'applying';

export interface BackupOperation {
  kind: BackupOperationKind;
  /** The export's command id or the import's session id. */
  id: string;
  step: BackupOperationStep;
  startedBy: { userId: string; name: string };
  startedAt: string;
}

/**
 * Long enough for someone to map a handful of displays, short enough that an
 * operation abandoned by a closed tab frees the agent again by itself. Every
 * step renews it.
 */
const LOCK_TTL_SECONDS = 10 * 60;

/**
 * The one backup operation an agent may run at a time, and how far it is.
 *
 * One at a time because both directions hold state on the agent (an import
 * keeps the decrypted file in memory while the operator maps entries) and
 * because two imports racing onto the same displays would leave whichever
 * finished last. Every change is announced to the organisation's admins, so
 * the agent page shows a running operation — and keeps its buttons disabled —
 * in every tab, not only the one that started it.
 */
@Injectable()
export class SiteAgentBackupOperationService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Claims the agent for an operation; 409, naming who holds it, if one runs. */
  async begin(
    organisationId: string,
    agentId: string,
    kind: BackupOperationKind,
    id: string,
    userId: string,
    step: BackupOperationStep,
  ): Promise<void> {
    const operation: BackupOperation = {
      kind,
      id,
      step,
      startedBy: { userId, name: await this.displayName(userId) },
      startedAt: new Date().toISOString(),
    };
    const claimed = await this.redis.set(
      this.key(agentId),
      JSON.stringify(operation),
      'EX',
      LOCK_TTL_SECONDS,
      'NX',
    );
    if (claimed !== 'OK') {
      const running = await this.current(agentId);
      throw new ConflictException(
        running
          ? `A backup ${running.kind} started by ${running.startedBy.name} is still running on this agent`
          : 'A backup operation is still running on this agent',
      );
    }
    this.announce(organisationId, agentId, operation);
  }

  /** Moves the operation on; ignored if the agent is busy with another one by now. */
  async advance(
    organisationId: string,
    agentId: string,
    id: string,
    step: BackupOperationStep,
  ): Promise<void> {
    const running = await this.current(agentId);
    if (!running || running.id !== id) {
      return;
    }
    const next = { ...running, step };
    // Compared again inside Redis: the lock may have lapsed and been taken by
    // another operation between the read above and this write.
    if (await this.updateLock(agentId, id, JSON.stringify(next))) {
      this.announce(organisationId, agentId, next);
    }
  }

  /** Frees the agent, but only from the operation that is ending. */
  async end(organisationId: string, agentId: string, id: string): Promise<void> {
    if (await this.updateLock(agentId, id, '')) {
      this.announce(organisationId, agentId, null);
    }
  }

  /** Sets (or, with '', deletes) the lock only while it is this operation's. */
  private async updateLock(agentId: string, id: string, value: string): Promise<boolean> {
    const changed = await this.redis.eval(
      LOCK_UPDATE_SCRIPT,
      1,
      this.key(agentId),
      id,
      value,
      String(LOCK_TTL_SECONDS),
    );
    return changed === 1;
  }

  async current(agentId: string): Promise<BackupOperation | null> {
    const raw = await this.redis.get(this.key(agentId));
    return raw ? (JSON.parse(raw) as BackupOperation) : null;
  }

  private announce(
    organisationId: string,
    agentId: string,
    operation: BackupOperation | null,
  ): void {
    this.eventEmitter.emit(
      SITE_AGENT_BACKUP_PROGRESS,
      new SiteAgentBackupProgressEvent(agentId, organisationId, operation),
    );
  }

  /** The name shown as "started by"; the address when no name was given. */
  private async displayName(userId: string): Promise<string> {
    const [user] = await this.db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user?.name || user?.email || 'unknown';
  }

  private key(agentId: string): string {
    return `site-agent-backup:active:${agentId}`;
  }
}
