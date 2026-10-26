import { describe, expect, it } from 'vitest';
import { BackupFileError, MAX_BACKUP_BYTES, readBackupPreview } from './backup-file';

const HEADER = {
  formatVersion: 1,
  kdf: { alg: 'argon2id' },
  iv: 'x',
  organisationId: 'org-1',
  sourceAgentId: 'agent-1',
  createdAt: '2026-10-26T12:00:00.000Z',
  agentVersion: '0.30.0',
  screenCount: 3,
};

/** Builds a file the way the agent lays it out, with a dummy body. */
function backupFile(header: unknown = HEADER, version = 1, lengthOverride?: number): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(header));
  const length = lengthOverride ?? json.length;
  const prefix = new Uint8Array([
    ...new TextEncoder().encode('MNSBAK'),
    version,
    length >> 8,
    length & 0xff,
  ]);
  const out = new Uint8Array(prefix.length + json.length + 32);
  out.set(prefix, 0);
  out.set(json, prefix.length);
  return out;
}

function problemOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof BackupFileError ? error.problem : 'other';
  }
  return 'none';
}

describe('readBackupPreview', () => {
  it('reads the plaintext header', () => {
    expect(readBackupPreview(backupFile())).toEqual({
      organisationId: 'org-1',
      sourceAgentId: 'agent-1',
      createdAt: '2026-10-26T12:00:00.000Z',
      agentVersion: '0.30.0',
      screenCount: 3,
    });
  });

  it.each([
    ['too_large', () => readBackupPreview(new Uint8Array(MAX_BACKUP_BYTES + 1))],
    ['not_a_backup', () => readBackupPreview(new TextEncoder().encode('PK\u0003\u0004 a zip'))],
    ['not_a_backup', () => readBackupPreview(new Uint8Array(0))],
    ['unsupported_version', () => readBackupPreview(backupFile(HEADER, 2))],
    ['damaged', () => readBackupPreview(backupFile(HEADER, 1, 60_000))],
    ['damaged', () => readBackupPreview(backupFile({ organisationId: 'org-1' }))],
    ['damaged', () => readBackupPreview(backupFile(null))],
  ])('reports %s', (problem, run) => {
    expect(problemOf(run)).toBe(problem);
  });

  it('reports a header that is not JSON as damaged', () => {
    const file = backupFile();
    file[9] = 0x00;

    expect(problemOf(() => readBackupPreview(file))).toBe('damaged');
  });
});
