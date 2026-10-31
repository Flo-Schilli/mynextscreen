import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Authenticated encryption (AES-256-GCM) for secrets that have to be
 * recoverable in plaintext — the per-org SMTP password and ntfy token, the TV
 * devmode passphrase and the screen API key parked for pairing. They cannot be
 * hashed because the backend has to hand them on.
 *
 * No secret is ever stored in the clear: `SECRETS_ENCRYPTION_KEY` is mandatory
 * (the backend refuses to boot without it), every write is encrypted and every
 * read demands the `enc:v1:` envelope. Rows written by older releases without a
 * key are re-encrypted once at boot by `SecretAtRestMigrationService`, and a
 * CHECK constraint per column makes Postgres reject any plaintext afterwards.
 */
export const ENCRYPTED_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

@Injectable()
export class SecretCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = SecretCipher.readKey(config.get<string>('SECRETS_ENCRYPTION_KEY'));
  }

  private static readKey(raw: string | undefined): Buffer {
    if (!raw) {
      throw new Error(
        'SECRETS_ENCRYPTION_KEY is required — secrets are never stored in plaintext. Generate one with: openssl rand -base64 32',
      );
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== KEY_BYTES) {
      throw new Error(
        `SECRETS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (openssl rand -base64 32)`,
      );
    }
    return key;
  }

  /** True when the value is already in the encrypted envelope. */
  static isEncrypted(value: string): boolean {
    return value.startsWith(ENCRYPTED_PREFIX);
  }

  encrypt(plaintext: string): string;
  encrypt(plaintext: string | null): string | null;
  encrypt(plaintext: string | null | undefined): string | null | undefined;
  encrypt(plaintext: string | null | undefined): string | null | undefined {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return plaintext;
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(stored: string): string;
  decrypt(stored: string | null): string | null;
  decrypt(stored: string | null | undefined): string | null | undefined;
  decrypt(stored: string | null | undefined): string | null | undefined {
    if (stored === null || stored === undefined || stored === '') {
      return stored;
    }
    if (!SecretCipher.isEncrypted(stored)) {
      // Never hand out (or silently accept) a plaintext value: it means a write
      // path bypassed the cipher or the boot migration did not run.
      throw new Error('Stored secret is not encrypted — refusing to read a plaintext value');
    }
    const [ivPart, tagPart, dataPart] = stored.slice(ENCRYPTED_PREFIX.length).split(':');
    if (!ivPart || !tagPart || dataPart === undefined) {
      throw new Error('Stored secret has a malformed encryption envelope');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivPart, 'base64'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
