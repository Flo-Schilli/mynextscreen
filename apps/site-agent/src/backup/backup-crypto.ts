import { argon2, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

/**
 * The encrypted backup file: everything an agent knows about its TVs that would
 * be expensive to get back, sealed under a password the agent generates.
 *
 * Layout: `"MNSBAK" | u8 version | u16 headerLength | header JSON | ciphertext | tag`.
 *
 * The header is plaintext on purpose — the dashboard reads it to show which
 * agent and organisation a file came from before anyone types a password — and
 * it is the GCM additional data, so none of it can be edited without the tag
 * failing. The KDF parameters live there too, so a later version can raise them
 * without making older files unreadable.
 */

const MAGIC = Buffer.from('MNSBAK', 'ascii');
const FORMAT_VERSION = 1;
const PREFIX_BYTES = MAGIC.length + 1 + 2;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/** argon2id, per RFC 9106's second recommendation; memory in KiB. */
const KDF_DEFAULTS = { memory: 65_536, passes: 3, parallelism: 1 } as const;

/**
 * Ceilings for what a file may ask for. The parameters are read from a file
 * anyone could have crafted, and a header demanding 16 GiB of memory would take
 * the agent down before the tag ever got checked.
 */
const KDF_LIMITS = { memory: 262_144, passes: 10, parallelism: 4 } as const;

/** A venue with a few dozen TVs is a few hundred KiB; this is generous. */
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
/** Caps the inflated payload, so a small file cannot unpack into gigabytes. */
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
const MAX_HEADER_BYTES = 4096;

/** Crockford base32: no I, L, O or U, so nothing is misread off a screen. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PASSWORD_BYTES = 15;
const PASSWORD_GROUP = 4;

export interface BackupKdfParams {
  alg: 'argon2id';
  memory: number;
  passes: number;
  parallelism: number;
  salt: string;
}

export interface BackupHeader {
  formatVersion: number;
  kdf: BackupKdfParams;
  iv: string;
  organisationId: string;
  sourceAgentId: string;
  createdAt: string;
  agentVersion: string;
  screenCount: number;
}

export type BackupMeta = Pick<
  BackupHeader,
  'organisationId' | 'sourceAgentId' | 'createdAt' | 'agentVersion' | 'screenCount'
>;

/** Thrown for every way a file fails to open, so the caller can say one thing. */
export class BackupOpenError extends Error {}

/**
 * 120 bits from the CSPRNG, shown as six groups of four. Generated rather than
 * chosen because the backup holds SSH keys and pairing keys for a whole venue,
 * and a password a person picks is the weakest link there would be.
 */
export function generateBackupPassword(): string {
  const chars = toBase32(randomBytes(PASSWORD_BYTES));
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += PASSWORD_GROUP) {
    groups.push(chars.slice(i, i + PASSWORD_GROUP));
  }
  return groups.join('-');
}

/**
 * Forgives what typing a password off a screen produces: lower case, spaces,
 * dashes, and the letters Crockford maps onto digits.
 */
export function normaliseBackupPassword(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
}

export async function sealBackup(
  payload: unknown,
  password: string,
  meta: BackupMeta,
): Promise<Buffer> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const header: BackupHeader = {
    formatVersion: FORMAT_VERSION,
    kdf: { alg: 'argon2id', ...KDF_DEFAULTS, salt: salt.toString('base64') },
    iv: iv.toString('base64'),
    ...meta,
  };
  const headerBytes = Buffer.from(JSON.stringify(header), 'utf8');
  const prefix = encodePrefix(headerBytes.length);
  const aad = Buffer.concat([prefix, headerBytes]);

  const key = await deriveKey(normaliseBackupPassword(password), header.kdf);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'))),
    cipher.final(),
  ]);
  return Buffer.concat([aad, ciphertext, cipher.getAuthTag()]);
}

/** Reads the plaintext header without the password. Validates it on the way. */
export function readBackupHeader(file: Buffer): BackupHeader {
  return splitBackup(file).header;
}

/**
 * Decrypts and inflates. A wrong password and a tampered file are deliberately
 * indistinguishable: GCM cannot tell them apart, and guessing would mislead.
 */
export async function openBackup(
  file: Buffer,
  password: string,
): Promise<{ header: BackupHeader; payload: unknown }> {
  const { header, aad, ciphertext, tag } = splitBackup(file);
  const key = await deriveKey(normaliseBackupPassword(password), header.kdf);

  let compressed: Buffer;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(header.iv, 'base64'));
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new BackupOpenError('Wrong password, or the file is damaged');
  }

  try {
    const json = gunzipSync(compressed, { maxOutputLength: MAX_PAYLOAD_BYTES }).toString('utf8');
    return { header, payload: JSON.parse(json) as unknown };
  } catch {
    throw new BackupOpenError('The backup contents are unreadable');
  }
}

function splitBackup(file: Buffer): {
  header: BackupHeader;
  aad: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
} {
  if (file.length > MAX_BACKUP_BYTES) {
    throw new BackupOpenError('The file is too large to be a backup');
  }
  if (file.length < PREFIX_BYTES + TAG_BYTES || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new BackupOpenError('This is not a myNextScreen agent backup');
  }
  const version = file.readUInt8(MAGIC.length);
  if (version !== FORMAT_VERSION) {
    throw new BackupOpenError(`Unsupported backup format version ${version}`);
  }
  const headerLength = file.readUInt16BE(MAGIC.length + 1);
  const headerEnd = PREFIX_BYTES + headerLength;
  if (headerLength > MAX_HEADER_BYTES || headerEnd + TAG_BYTES > file.length) {
    throw new BackupOpenError('The backup header is damaged');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(file.subarray(PREFIX_BYTES, headerEnd).toString('utf8'));
  } catch {
    throw new BackupOpenError('The backup header is damaged');
  }

  return {
    header: validateHeader(parsed),
    aad: file.subarray(0, headerEnd),
    ciphertext: file.subarray(headerEnd, file.length - TAG_BYTES),
    tag: file.subarray(file.length - TAG_BYTES),
  };
}

function validateHeader(value: unknown): BackupHeader {
  if (!isRecord(value) || !isRecord(value.kdf)) {
    throw new BackupOpenError('The backup header is damaged');
  }
  const { kdf } = value;
  const withinLimits =
    kdf.alg === 'argon2id' &&
    isIntIn(kdf.memory, 8, KDF_LIMITS.memory) &&
    isIntIn(kdf.passes, 1, KDF_LIMITS.passes) &&
    isIntIn(kdf.parallelism, 1, KDF_LIMITS.parallelism) &&
    typeof kdf.salt === 'string' &&
    Buffer.from(kdf.salt, 'base64').length === SALT_BYTES;
  if (!withinLimits) {
    throw new BackupOpenError('The backup asks for key-derivation settings this agent refuses');
  }

  const fieldsValid =
    value.formatVersion === FORMAT_VERSION &&
    typeof value.iv === 'string' &&
    Buffer.from(value.iv, 'base64').length === IV_BYTES &&
    typeof value.organisationId === 'string' &&
    typeof value.sourceAgentId === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.agentVersion === 'string' &&
    isIntIn(value.screenCount, 0, 10_000);
  if (!fieldsValid) {
    throw new BackupOpenError('The backup header is damaged');
  }
  return value as unknown as BackupHeader;
}

function deriveKey(password: string, kdf: BackupKdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      'argon2id',
      {
        message: Buffer.from(password, 'utf8'),
        nonce: Buffer.from(kdf.salt, 'base64'),
        memory: kdf.memory,
        passes: kdf.passes,
        parallelism: kdf.parallelism,
        tagLength: KEY_BYTES,
      },
      (error, key) => (error ? reject(error) : resolve(Buffer.from(key))),
    );
  });
}

function encodePrefix(headerLength: number): Buffer {
  const prefix = Buffer.alloc(PREFIX_BYTES);
  MAGIC.copy(prefix, 0);
  prefix.writeUInt8(FORMAT_VERSION, MAGIC.length);
  prefix.writeUInt16BE(headerLength, MAGIC.length + 1);
  return prefix;
}

function toBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    // Only the unconsumed bits matter; dropping the rest keeps `value` inside 32 bits.
    value &= (1 << bits) - 1;
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
