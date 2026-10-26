import type { BackupOperation } from './site-agent-backup-operation.service';
import type { BackupRestoreVerdict } from './site-agent-backup-restore.service';

export const SITE_AGENT_BACKUP_EXPORTED = 'site-agent.backup-exported';
export const SITE_AGENT_BACKUP_IMPORT_KEY = 'site-agent.backup-import-key';
export const SITE_AGENT_BACKUP_IMPORTED = 'site-agent.backup-imported';
export const SITE_AGENT_BACKUP_IMPORT_ANALYSED = 'site-agent.backup-import-analysed';
export const SITE_AGENT_BACKUP_PROGRESS = 'site-agent.backup-progress';

/**
 * An export the dashboard asked for has arrived, or failed on the agent.
 *
 * Carries no part of the file: the stream fans out to every dashboard of the
 * organisation, and only the person who asked may collect the result.
 */
export class SiteAgentBackupExportedEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly commandId: string,
    public readonly error: string | null,
  ) {}
}

/**
 * The agent's key for an import session. A public key, so it is fine for every
 * dashboard of the organisation to see; it only lets someone seal a password
 * for that agent, and the session it belongs to is bound to one user.
 */
export class SiteAgentBackupImportKeyEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly sessionId: string,
    public readonly publicKey: string | null,
    public readonly error: string | null,
  ) {}
}

export interface SiteAgentBackupImportSummary {
  ssapRestored: number;
  devmodeKeysRestored: number;
  staleSsapScreenIds: string[];
  restored: BackupRestoreVerdict['restored'];
  skipped: BackupRestoreVerdict['skipped'];
}

/**
 * The agent has opened the file and the server has worked out what each entry
 * would do. The plan itself is fetched by the person running the import; this
 * only says it is ready.
 */
export class SiteAgentBackupImportAnalysedEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly sessionId: string,
  ) {}
}

/** A backup operation started, moved on or ended (`operation` null). */
export class SiteAgentBackupProgressEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly operation: BackupOperation | null,
  ) {}
}

export class SiteAgentBackupImportedEvent {
  constructor(
    public readonly agentId: string,
    public readonly organisationId: string,
    public readonly sessionId: string,
    public readonly summary: SiteAgentBackupImportSummary | null,
    public readonly error: string | null,
  ) {}
}
