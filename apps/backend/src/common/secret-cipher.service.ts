import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Authenticated encryption for secrets that have to be recoverable in
 * plaintext — today the per-org SMTP password and ntfy token, which the backend
 * must present to a third-party server, so they cannot simply be hashed.
 *
 * They previously sat in `org_notification_config` as plain text, which means
 * every database dump (and `ansible/download_db.yml` produces those) carried
 * every tenant's mail credentials in the clear.
 *
 * Key handling is deliberately opt-in: without `SECRETS_ENCRYPTION_KEY` the
 * values are stored as before and a warning is logged at boot, because failing
 * closed here would take an existing deployment offline on upgrade. Values are
 * tagged with a version prefix, so an encrypted store can still read the rows
 * written before the key existed, and each one is re-encrypted the next time it
 * is written.
 */
const VERSION_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

@Injectable()
export class SecretCipher {
  private readonly logger = new Logger(SecretCipher.name);
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    this.key = SecretCipher.readKey(config.get<string>('SECRETS_ENCRYPTION_KEY'));
    if (!this.key) {
      this.logger.warn(
        'SECRETS_ENCRYPTION_KEY is not set — per-org SMTP passwords and ntfy tokens are stored in plaintext. Generate one with: openssl rand -base64 32',
      );
    }
  }

  private static readKey(raw: string | undefined): Buffer | null {
    if (!raw) {
      return null;
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
    return value.startsWith(VERSION_PREFIX);
  }

  encrypt(plaintext: string | null | undefined): string | null | undefined {
    if (plaintext === null || plaintext === undefined || plaintext === '') {
      return plaintext;
    }
    if (!this.key) {
      return plaintext;
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${VERSION_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(stored: string | null | undefined): string | null | undefined {
    if (stored === null || stored === undefined || stored === '') {
      return stored;
    }
    if (!SecretCipher.isEncrypted(stored)) {
      // Written before the key existed; still usable, re-encrypted on next write.
      return stored;
    }
    if (!this.key) {
      throw new Error(
        'Stored secret is encrypted but SECRETS_ENCRYPTION_KEY is not configured — the value cannot be read',
      );
    }
    const [ivPart, tagPart, dataPart] = stored.slice(VERSION_PREFIX.length).split(':');
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivPart, 'base64'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
