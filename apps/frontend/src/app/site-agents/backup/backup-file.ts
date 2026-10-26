/**
 * Reads the plaintext header of an agent backup, for the import preview.
 *
 * The layout is defined by the agent (`apps/site-agent/src/backup/backup-crypto.ts`):
 * `"MNSBAK" | u8 version | u16 headerLength | header JSON | …`. Only the header
 * is read here; everything after it is the agent's to decrypt. A file that
 * fails here would fail on the agent too — this just says so before anything
 * is sent anywhere.
 */

const MAGIC = 'MNSBAK';
const SUPPORTED_VERSION = 1;
const PREFIX_BYTES = MAGIC.length + 3;
/** Mirrors the agent's limit, so an oversized file is refused before upload. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export interface BackupPreview {
  organisationId: string;
  sourceAgentId: string;
  createdAt: string;
  agentVersion: string;
  screenCount: number;
}

export type BackupFileProblem = 'too_large' | 'not_a_backup' | 'unsupported_version' | 'damaged';

export class BackupFileError extends Error {
  constructor(readonly problem: BackupFileProblem) {
    super(problem);
  }
}

export function readBackupPreview(bytes: Uint8Array): BackupPreview {
  if (bytes.length > MAX_BACKUP_BYTES) {
    throw new BackupFileError('too_large');
  }
  const magic = String.fromCharCode(...bytes.subarray(0, MAGIC.length));
  if (bytes.length < PREFIX_BYTES || magic !== MAGIC) {
    throw new BackupFileError('not_a_backup');
  }
  if (bytes[MAGIC.length] !== SUPPORTED_VERSION) {
    throw new BackupFileError('unsupported_version');
  }
  const headerLength = (bytes[MAGIC.length + 1] << 8) | bytes[MAGIC.length + 2];
  if (PREFIX_BYTES + headerLength > bytes.length) {
    throw new BackupFileError('damaged');
  }

  let header: unknown;
  try {
    header = JSON.parse(
      new TextDecoder().decode(bytes.subarray(PREFIX_BYTES, PREFIX_BYTES + headerLength)),
    );
  } catch {
    throw new BackupFileError('damaged');
  }
  if (!isPreview(header)) {
    throw new BackupFileError('damaged');
  }
  return {
    organisationId: header.organisationId,
    sourceAgentId: header.sourceAgentId,
    createdAt: header.createdAt,
    agentVersion: header.agentVersion,
    screenCount: header.screenCount,
  };
}

function isPreview(value: unknown): value is BackupPreview {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['organisationId'] === 'string' &&
    typeof candidate['sourceAgentId'] === 'string' &&
    typeof candidate['createdAt'] === 'string' &&
    typeof candidate['agentVersion'] === 'string' &&
    typeof candidate['screenCount'] === 'number'
  );
}
