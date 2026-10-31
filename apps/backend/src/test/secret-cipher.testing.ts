import type { ConfigService } from '@nestjs/config';
import { SecretCipher } from '../common/secret-cipher.service';

/** Fixed 32-byte key for specs — never used outside tests. */
export const TEST_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

/** A real cipher keyed with {@link TEST_ENCRYPTION_KEY}. */
export function createTestSecretCipher(): SecretCipher {
  return new SecretCipher({ get: () => TEST_ENCRYPTION_KEY } as unknown as ConfigService);
}

/** Nest provider for specs whose module under test injects `SecretCipher`. */
export const TEST_SECRET_CIPHER_PROVIDER = {
  provide: SecretCipher,
  useFactory: createTestSecretCipher,
};
