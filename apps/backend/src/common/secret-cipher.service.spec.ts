import type { ConfigService } from '@nestjs/config';
import { SecretCipher } from './secret-cipher.service';

function makeCipher(key: string | undefined): SecretCipher {
  return new SecretCipher({ get: () => key } as unknown as ConfigService);
}

const KEY = Buffer.alloc(32, 3).toString('base64');

describe('SecretCipher', () => {
  it('round-trips a secret', () => {
    const cipher = makeCipher(KEY);

    const stored = cipher.encrypt('smtp-password');

    expect(stored).not.toBe('smtp-password');
    expect(stored).toContain('enc:v1:');
    expect(cipher.decrypt(stored)).toBe('smtp-password');
  });

  it('produces a different ciphertext every time (random IV)', () => {
    const cipher = makeCipher(KEY);

    expect(cipher.encrypt('same')).not.toBe(cipher.encrypt('same'));
  });

  it('refuses a tampered ciphertext instead of returning garbage', () => {
    const cipher = makeCipher(KEY);
    const stored = cipher.encrypt('smtp-password') as string;
    const tampered = stored.slice(0, -4) + 'AAA=';

    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('cannot read a secret with a different key', () => {
    const stored = makeCipher(KEY).encrypt('smtp-password');

    expect(() => makeCipher(Buffer.alloc(32, 9).toString('base64')).decrypt(stored)).toThrow();
  });

  it.each([null, undefined, ''])('passes %p through untouched', (value) => {
    const cipher = makeCipher(KEY);

    expect(cipher.encrypt(value)).toBe(value);
    expect(cipher.decrypt(value)).toBe(value);
  });

  describe('without a configured key', () => {
    it('stores plaintext rather than failing the deployment', () => {
      const cipher = makeCipher(undefined);

      expect(cipher.encrypt('smtp-password')).toBe('smtp-password');
      expect(cipher.decrypt('smtp-password')).toBe('smtp-password');
    });

    it('reports clearly that an encrypted value cannot be read', () => {
      const stored = makeCipher(KEY).encrypt('smtp-password');

      expect(() => makeCipher(undefined).decrypt(stored)).toThrow(/SECRETS_ENCRYPTION_KEY/);
    });
  });

  it('rejects a key of the wrong length at construction', () => {
    expect(() => makeCipher(Buffer.alloc(16, 1).toString('base64'))).toThrow(/32 bytes/);
  });

  it('reads a value written before the key existed', () => {
    expect(makeCipher(KEY).decrypt('legacy-plaintext')).toBe('legacy-plaintext');
  });
});
