import { Injectable, Logger } from '@nestjs/common';
import { AgentConfigStore } from '../config/agent-config.store';
import { ServerClient } from '../connection/server-client.service';
import { ConnectionStore } from '../connection/connection.store';
import type { AgentConfigMessage } from '../protocol/server-protocol';
import { DevmodeKeyService } from '../tv/devmode-key.service';
import { MANIFEST_VERSION } from '../tv/ssap-client';
import { SsapKeyStore, isStoredSsapKey, type StoredSsapKey } from '../tv/ssap-key.store';
import type { AgentBackupAssignment, AgentBackupScreenSettings } from '../protocol/server-protocol';
import {
  BackupOpenError,
  MAX_BACKUP_BYTES,
  generateBackupPassword,
  openBackup,
  sealBackup,
} from './backup-crypto';
import { generateSealedBoxKeyPair, open, seal, type SealedBoxKeyPair } from './sealed-box';

/**
 * How long a dashboard has to send the file after asking to import, and again
 * how long the opened file waits while the operator maps entries.
 */
const IMPORT_SESSION_TTL_MS = 10 * 60_000;
const MAX_NAME_LENGTH = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PEM_BYTES = 16 * 1024;
const MAX_SCREENS = 1000;

/** One screen's entry inside the encrypted payload. */
export interface BackupScreenEntry {
  /** The display's name when the backup was taken, so an operator can recognise it. */
  name?: string;
  ssap?: StoredSsapKey;
  devmodePem?: string;
  devmodePassphrase?: string;
  localIp?: string;
  macAddress?: string;
  ssapPort?: number;
}

export interface BackupPayload {
  screens: Record<string, BackupScreenEntry>;
}

interface OpenedBackup {
  sourceAgentId: string;
  screens: Record<string, BackupScreenEntry>;
}

interface ImportSession {
  keyPair: SealedBoxKeyPair;
  expiresAt: number;
  /** The validated contents, held in memory only, between opening and applying. */
  opened?: OpenedBackup;
}

/**
 * Exports what this agent knows about its TVs and restores it on another.
 *
 * Every step that touches the contents happens here, on the agent: the
 * dashboard only ever holds the sealed file, and the server only relays it.
 * The password crosses the server sealed for one party at a time — for the
 * dashboard tab on export, for this agent on import — so a copy of everything
 * the server saw is still not enough to open the file.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly importSessions = new Map<string, ImportSession>();
  private readonly importedListeners: Array<() => Promise<void>> = [];

  constructor(
    private readonly configs: AgentConfigStore,
    private readonly connections: ConnectionStore,
    private readonly client: ServerClient,
    private readonly ssapKeys: SsapKeyStore,
    private readonly devmodeKeys: DevmodeKeyService,
    private readonly agentVersion: string,
  ) {}

  /** Lets the supervisor re-pull and probe once keys have been restored. */
  onImported(listener: () => Promise<void>): void {
    this.importedListeners.push(listener);
  }

  async export(commandId: string, recipientPublicKey: string | undefined): Promise<void> {
    assertUuid(commandId);
    try {
      if (!recipientPublicKey) {
        throw new Error('The request carried no key to seal the password for');
      }
      const config = await this.currentConfig();

      const payload: BackupPayload = { screens: {} };
      for (const screen of config.screens) {
        payload.screens[screen.screenId] = await this.collect(screen.screenId, {
          name: screen.name,
          devmodePassphrase: screen.devmodePassphrase ?? undefined,
          localIp: screen.localIp ?? undefined,
          macAddress: screen.macAddress ?? undefined,
          ssapPort: screen.ssapPort,
        });
      }

      const password = generateBackupPassword();
      const file = await sealBackup(payload, password, {
        organisationId: config.organisationId,
        sourceAgentId: config.agentId,
        createdAt: new Date().toISOString(),
        agentVersion: this.agentVersion,
        screenCount: config.screens.length,
      });
      const sealedPassword = await seal(recipientPublicKey, password);

      await this.client.uploadBackupExport(commandId, {
        backup: file.toString('base64'),
        sealedPassword,
      });
      this.logger.log(`Backup of ${config.screens.length} screen(s) exported`);
    } catch (error) {
      await this.reportExportFailure(commandId, error);
    }
  }

  /**
   * Opens an import: a fresh key pair whose public half goes to the dashboard
   * so it can seal the password for this agent and nobody in between.
   */
  async beginImport(sessionId: string): Promise<void> {
    assertUuid(sessionId);
    this.dropExpiredSessions();
    const keyPair = await generateSealedBoxKeyPair();
    this.importSessions.set(sessionId, {
      keyPair,
      expiresAt: Date.now() + IMPORT_SESSION_TTL_MS,
    });
    await this.client.postBackupImportKey(sessionId, { publicKey: keyPair.publicKey });
  }

  /**
   * Phase one: fetches, unseals, opens and validates the file, then describes
   * its entries to the server — names and ids only — so the operator can map
   * the ones the organisation no longer knows. The contents stay here, in
   * memory, until {@link apply}; nothing is written yet.
   */
  async import(sessionId: string): Promise<void> {
    assertUuid(sessionId);
    const session = this.importSessions.get(sessionId);

    try {
      if (!session || session.expiresAt < Date.now() || session.opened) {
        throw new Error('The import session has expired; start the import again');
      }
      // The organisation comes from the session, not the config cache: a box
      // enrolled a moment ago has no cached config until its first round, and
      // importing straight after enrolment is exactly how a box gets replaced.
      const connection = await this.connections.load();
      if (!connection) {
        throw new Error('The agent is not enrolled; enrol it before importing');
      }

      const sealed = await this.client.fetchBackupImport(sessionId);
      const password = await open(session.keyPair, sealed.sealedPassword).catch(() => {
        throw new Error('The password could not be unsealed; start the import again');
      });
      const file = Buffer.from(sealed.backup, 'base64');
      if (file.length > MAX_BACKUP_BYTES) {
        throw new BackupOpenError('The file is too large to be a backup');
      }

      const { header, payload } = await openBackup(file, password);
      if (header.organisationId !== connection.organisationId) {
        throw new Error('This backup belongs to a different organisation');
      }
      const screens = validatePayload(payload);

      this.importSessions.set(sessionId, {
        ...session,
        expiresAt: Date.now() + IMPORT_SESSION_TTL_MS,
        opened: { sourceAgentId: header.sourceAgentId, screens },
      });
      await this.client.postBackupAnalysis(sessionId, {
        sourceAgentId: header.sourceAgentId,
        entries: Object.entries(screens).map(([screenId, entry]) => ({
          screenId,
          ...(entry.name ? { name: entry.name } : {}),
        })),
      });
    } catch (error) {
      // One attempt per session: whatever went wrong, the next try starts over.
      this.importSessions.delete(sessionId);
      await this.reportImportFailure(sessionId, error);
    }
  }

  /**
   * Phase two, once the operator has mapped what needed mapping: the server
   * applies the settings and says which keys go where, and only then are they
   * written.
   */
  async apply(sessionId: string): Promise<void> {
    assertUuid(sessionId);
    // Taken out before anything else, so the opened file is used at most once.
    const session = this.importSessions.get(sessionId);
    this.importSessions.delete(sessionId);

    try {
      if (!session?.opened || session.expiresAt < Date.now()) {
        throw new Error('The import session has expired; start the import again');
      }
      const { sourceAgentId, screens } = session.opened;

      const verdict = await this.client.restoreBackupSettings(sessionId, {
        sourceAgentId,
        screens: Object.entries(screens).map(([screenId, entry]) => settingsOf(screenId, entry)),
      });

      const result = await this.writeKeys(screens, verdict.assignments);
      await this.client.postBackupImportResult(sessionId, result);
      this.logger.log(
        `Backup imported: ${result.ssapRestored} pairing key(s), ${result.devmodeKeysRestored} SSH key(s)`,
      );
      await this.notifyImported();
    } catch (error) {
      await this.reportImportFailure(sessionId, error);
    }
  }

  /**
   * The cached config, or a fresh one when there is none yet. Before its first
   * round an agent has nothing cached, and "nothing to back up" would be wrong
   * for an agent that does look after screens.
   */
  private async currentConfig(): Promise<AgentConfigMessage> {
    const cached = this.configs.current();
    if (cached) {
      return cached;
    }
    const fetched = await this.client.fetchConfig();
    await this.configs.save(fetched);
    return fetched;
  }

  private async collect(
    screenId: string,
    settings: Omit<BackupScreenEntry, 'ssap' | 'devmodePem'>,
  ): Promise<BackupScreenEntry> {
    const entry: BackupScreenEntry = { ...settings };
    const ssap = await this.ssapKeys.readRaw(screenId);
    if (ssap) {
      entry.ssap = ssap;
    }
    const pem = await this.devmodeKeys.cachedPem(screenId);
    if (pem) {
      entry.devmodePem = pem;
    }
    return entry;
  }

  /**
   * Only where the server says: each assignment names the backup entry and the
   * screen its keys belong to now. Writing a key for a screen another agent
   * looks after would leave a second copy of that venue's credentials somewhere
   * nobody would think to look.
   *
   * And only where this agent has no key of its own — the same fill-the-gaps
   * rule the server applies to the settings. A TV paired again since the
   * backup was taken holds a newer key than the file, and putting the old one
   * back would have the set answer 401 to a pairing that was working. The
   * exception is an entry the operator mapped onto a screen: that is an
   * explicit "this TV is now that display", and its keys replace the screen's.
   */
  private async writeKeys(
    screens: Record<string, BackupScreenEntry>,
    assignments: AgentBackupAssignment[],
  ): Promise<{ ssapRestored: number; devmodeKeysRestored: number; staleSsapScreenIds: string[] }> {
    let ssapRestored = 0;
    let devmodeKeysRestored = 0;
    const staleSsapScreenIds: string[] = [];

    for (const { from, to, overwrite } of assignments) {
      const entry = screens[from];
      if (!entry) {
        continue;
      }
      if (entry.ssap && (overwrite || !(await this.ssapKeys.readRaw(to)))) {
        await this.ssapKeys.restoreRaw(to, entry.ssap);
        ssapRestored += 1;
        if (entry.ssap.manifestVersion !== MANIFEST_VERSION) {
          staleSsapScreenIds.push(to);
        }
      }
      if (entry.devmodePem && (overwrite || !(await this.devmodeKeys.cachedPem(to)))) {
        await this.devmodeKeys.restorePem(to, entry.devmodePem);
        devmodeKeysRestored += 1;
      }
    }
    return { ssapRestored, devmodeKeysRestored, staleSsapScreenIds };
  }

  private async notifyImported(): Promise<void> {
    for (const listener of this.importedListeners) {
      await listener().catch((error: unknown) =>
        this.logger.warn(`Post-import refresh failed: ${describeError(error)}`),
      );
    }
  }

  private dropExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.importSessions) {
      if (session.expiresAt < now) {
        this.importSessions.delete(id);
      }
    }
  }

  private async reportExportFailure(commandId: string, error: unknown): Promise<void> {
    const message = describeError(error);
    this.logger.warn(`Backup export failed: ${message}`);
    await this.client
      .uploadBackupExport(commandId, { error: message })
      .catch((reportError: unknown) =>
        this.logger.error(`Could not report the failed export: ${describeError(reportError)}`),
      );
  }

  private async reportImportFailure(sessionId: string, error: unknown): Promise<void> {
    const message = describeError(error);
    this.logger.warn(`Backup import failed: ${message}`);
    await this.client
      .postBackupImportResult(sessionId, { error: message })
      .catch((reportError: unknown) =>
        this.logger.error(`Could not report the failed import: ${describeError(reportError)}`),
      );
  }
}

/**
 * Checks everything the agent is about to write, before it writes any of it.
 * The tag already proves the file came from an agent holding the password; this
 * is about not trusting that agent's version to have produced sane contents.
 */
export function validatePayload(payload: unknown): Record<string, BackupScreenEntry> {
  if (!isRecord(payload) || !isRecord(payload.screens)) {
    throw new BackupOpenError('The backup contents are not in the expected shape');
  }
  const entries = Object.entries(payload.screens);
  if (entries.length > MAX_SCREENS) {
    throw new BackupOpenError('The backup lists more screens than any venue has');
  }

  const screens: Record<string, BackupScreenEntry> = {};
  for (const [screenId, raw] of entries) {
    if (!UUID.test(screenId) || !isRecord(raw)) {
      throw new BackupOpenError('The backup contains an entry that is not a screen');
    }
    screens[screenId] = validateEntry(raw);
  }
  return screens;
}

function validateEntry(raw: Record<string, unknown>): BackupScreenEntry {
  const entry: BackupScreenEntry = {};
  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string' || raw.name.length > MAX_NAME_LENGTH) {
      throw new BackupOpenError('The backup contains a malformed display name');
    }
    entry.name = raw.name;
  }
  if (raw.ssap !== undefined) {
    if (!isStoredSsapKey(raw.ssap)) {
      throw new BackupOpenError('The backup contains a malformed pairing key');
    }
    entry.ssap = { key: raw.ssap.key, manifestVersion: raw.ssap.manifestVersion };
  }
  if (raw.devmodePem !== undefined) {
    const pem = raw.devmodePem;
    if (typeof pem !== 'string' || !pem.startsWith('-----BEGIN ') || pem.length > MAX_PEM_BYTES) {
      throw new BackupOpenError('The backup contains a malformed SSH key');
    }
    entry.devmodePem = pem;
  }
  // The settings are only passed on: the server validates them against the same
  // rules as a dashboard edit, so the agent checks types and nothing more.
  for (const field of ['devmodePassphrase', 'localIp', 'macAddress'] as const) {
    if (raw[field] !== undefined) {
      if (typeof raw[field] !== 'string') {
        throw new BackupOpenError(`The backup contains a malformed ${field}`);
      }
      entry[field] = raw[field];
    }
  }
  if (raw.ssapPort !== undefined) {
    if (!Number.isInteger(raw.ssapPort)) {
      throw new BackupOpenError('The backup contains a malformed ssapPort');
    }
    entry.ssapPort = raw.ssapPort as number;
  }
  return entry;
}

function settingsOf(screenId: string, entry: BackupScreenEntry): AgentBackupScreenSettings {
  return {
    screenId,
    devmodePassphrase: entry.devmodePassphrase,
    localIp: entry.localIp,
    macAddress: entry.macAddress,
    ssapPort: entry.ssapPort,
    hasSsapKey: entry.ssap !== undefined,
    hasDevmodeKey: entry.devmodePem !== undefined,
  };
}

/** Command ids end up in a URL path; anything but a UUID is refused outright. */
function assertUuid(id: string): void {
  if (!UUID.test(id)) {
    throw new Error(`Refusing backup command with id "${id}": not a UUID`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
