export const SITE_AGENT_BACKUP_EXPORTED = 'site-agent.backup-exported';
export const SITE_AGENT_BACKUP_IMPORT_KEY = 'site-agent.backup-import-key';
export const SITE_AGENT_BACKUP_IMPORTED = 'site-agent.backup-imported';

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
  restored: Array<{ screenId: string; created: boolean; filled: string[] }>;
  skipped: Array<{ screenId: string; reason: string }>;
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
