import { ConfigService } from '@nestjs/config';
import { SecretCipher } from '../common/secret-cipher.service';

/** Fixed 32-byte key for specs — never used outside tests. */
export const TEST_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

/** A real cipher keyed with {@link TEST_ENCRYPTION_KEY}. */
export function createTestSecretCipher(): SecretCipher {
  return new SecretCipher(new ConfigService({ SECRETS_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY }));
}

/** Nest provider for specs whose module under test injects `SecretCipher`. */
export const TEST_SECRET_CIPHER_PROVIDER = {
  provide: SecretCipher,
  useFactory: createTestSecretCipher,
};

/**
 * Asserts that a write was refused by the named CHECK constraint (SQLSTATE
 * 23514) — not by any other error. Drizzle wraps the pg error in `cause`.
 */
export async function expectCheckViolation(
  write: PromiseLike<unknown>,
  constraint: string,
): Promise<void> {
  let caught: unknown;
  try {
    await write;
  } catch (error: unknown) {
    caught = error;
  }
  const pgError = ((caught as { cause?: unknown } | undefined)?.cause ?? caught) as
    { code?: string; constraint?: string } | undefined;
  expect(pgError?.code).toBe('23514');
  expect(pgError?.constraint).toBe(constraint);
}
