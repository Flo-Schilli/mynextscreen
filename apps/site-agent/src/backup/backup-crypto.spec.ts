import { gzipSync } from 'node:zlib';
import {
  BackupOpenError,
  MAX_BACKUP_BYTES,
  generateBackupPassword,
  normaliseBackupPassword,
  openBackup,
  readBackupHeader,
  sealBackup,
  type BackupMeta,
} from './backup-crypto';

const META: BackupMeta = {
  organisationId: '11111111-1111-4111-8111-111111111111',
  sourceAgentId: '22222222-2222-4222-8222-222222222222',
  createdAt: '2026-10-26T12:00:00.000Z',
  agentVersion: '0.30.0',
  screenCount: 1,
};
const PAYLOAD = { screens: { a: { devmodePassphrase: 'ABC123' } } };

/** Rewrites the plaintext header in place, keeping the rest of the file. */
function withHeader(file: Buffer, edit: (header: Record<string, unknown>) => void): Buffer {
  const length = file.readUInt16BE(7);
  const header = JSON.parse(file.subarray(9, 9 + length).toString('utf8')) as Record<
    string,
    unknown
  >;
  edit(header);
  const bytes = Buffer.from(JSON.stringify(header), 'utf8');
  const prefix = Buffer.from(file.subarray(0, 9));
  prefix.writeUInt16BE(bytes.length, 7);
  return Buffer.concat([prefix, bytes, file.subarray(9 + length)]);
}

describe('backup crypto', () => {
  let password: string;
  let file: Buffer;

  beforeAll(async () => {
    password = generateBackupPassword();
    file = await sealBackup(PAYLOAD, password, META);
  });

  describe('generateBackupPassword', () => {
    it('produces six groups of four unambiguous characters', () => {
      expect(generateBackupPassword()).toMatch(
        /^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/,
      );
    });

    it('does not repeat', () => {
      const seen = new Set(Array.from({ length: 50 }, () => generateBackupPassword()));
      expect(seen.size).toBe(50);
    });
  });

  describe('normaliseBackupPassword', () => {
    it('forgives case, spacing, dashes and look-alike letters', () => {
      expect(normaliseBackupPassword(' k7qm-2xra o9il ')).toBe('K7QM2XRA0911');
    });
  });

  it('round-trips the payload with the generated password', async () => {
    const opened = await openBackup(file, password);

    expect(opened.payload).toEqual(PAYLOAD);
    expect(opened.header).toMatchObject(META);
  });

  it('accepts the password typed sloppily', async () => {
    const sloppy = ` ${password.toLowerCase().replace(/-/g, ' ')} `;

    await expect(openBackup(file, sloppy)).resolves.toMatchObject({ payload: PAYLOAD });
  });

  it('reads the header without a password', () => {
    expect(readBackupHeader(file)).toMatchObject({ ...META, formatVersion: 1 });
  });

  it('keeps the payload out of the plaintext', () => {
    expect(file.toString('latin1')).not.toContain('ABC123');
    expect(file.toString('latin1')).not.toContain('devmodePassphrase');
  });

  it('refuses the wrong password', async () => {
    await expect(openBackup(file, generateBackupPassword())).rejects.toThrow(
      'Wrong password, or the file is damaged',
    );
  });

  it.each([
    ['header', 20],
    ['ciphertext', -30],
    ['tag', -1],
  ])('refuses a flipped byte in the %s', async (_part, offset) => {
    const tampered = Buffer.from(file);
    const index = offset < 0 ? tampered.length + offset : offset;
    tampered[index] ^= 0x01;

    await expect(openBackup(tampered, password)).rejects.toBeInstanceOf(BackupOpenError);
  });

  it('refuses an edited header even when it still parses', async () => {
    const tampered = withHeader(file, (header) => {
      header.organisationId = '33333333-3333-4333-8333-333333333333';
    });

    await expect(openBackup(tampered, password)).rejects.toThrow('Wrong password');
  });

  it('refuses key-derivation settings above the ceiling before deriving anything', async () => {
    const greedy = withHeader(file, (header) => {
      (header.kdf as Record<string, unknown>).memory = 16 * 1024 * 1024;
    });

    await expect(openBackup(greedy, password)).rejects.toThrow('key-derivation settings');
  });

  it.each([
    ['garbage', Buffer.from('not a backup at all, clearly')],
    ['an empty file', Buffer.alloc(0)],
  ])('refuses %s', (_label, input) => {
    expect(() => readBackupHeader(input)).toThrow('not a myNextScreen agent backup');
  });

  it('refuses an unknown format version', () => {
    const future = Buffer.from(file);
    future.writeUInt8(9, 6);

    expect(() => readBackupHeader(future)).toThrow('Unsupported backup format version 9');
  });

  it('refuses a header length that runs past the end', () => {
    const broken = Buffer.from(file);
    broken.writeUInt16BE(4000, 7);

    expect(() => readBackupHeader(broken)).toThrow('header is damaged');
  });

  it('refuses a header that is not JSON', () => {
    const broken = Buffer.from(file);
    broken[9] = 0x7b + 1;

    expect(() => readBackupHeader(broken)).toThrow('header is damaged');
  });

  it('refuses a header with missing fields', () => {
    const broken = withHeader(file, (header) => {
      delete header.organisationId;
    });

    expect(() => readBackupHeader(broken)).toThrow('header is damaged');
  });

  it('refuses a file above the size limit', () => {
    expect(() => readBackupHeader(Buffer.alloc(MAX_BACKUP_BYTES + 1))).toThrow('too large');
  });

  it('refuses a payload that inflates past the limit', async () => {
    // A gzip bomb only gets this far by being sealed with the right password,
    // so build one through the real format and swap in the oversized payload.
    const bomb = 'x'.repeat(9 * 1024 * 1024);
    expect(gzipSync(bomb).length).toBeLessThan(MAX_BACKUP_BYTES);
    const sealed = await sealBackup(bomb, password, META);

    await expect(openBackup(sealed, password)).rejects.toThrow('contents are unreadable');
  });
});
