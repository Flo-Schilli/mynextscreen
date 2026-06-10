import { generateApiKey, hashApiKey, verifyApiKey } from './api-key.util';

describe('API Key Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a base64url-encoded string', () => {
      const key = generateApiKey();
      // base64url uses only [A-Za-z0-9_-], no padding
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate a key of the expected length (43 chars for 32 bytes)', () => {
      const key = generateApiKey();
      // 32 bytes → 43 base64url characters (no padding)
      expect(key).toHaveLength(43);
    });

    it('should generate unique keys on each call', () => {
      const keys = new Set(Array.from({ length: 20 }, () => generateApiKey()));
      expect(keys.size).toBe(20);
    });
  });

  describe('hashApiKey', () => {
    it('should return a bcrypt hash string', async () => {
      const key = generateApiKey();
      const hash = await hashApiKey(key);
      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should produce different hashes for the same key (due to salt)', async () => {
      const key = generateApiKey();
      const hash1 = await hashApiKey(key);
      const hash2 = await hashApiKey(key);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyApiKey', () => {
    it('should return true for a matching key and hash', async () => {
      const key = generateApiKey();
      const hash = await hashApiKey(key);
      const result = await verifyApiKey(key, hash);
      expect(result).toBe(true);
    });

    it('should return false for a non-matching key', async () => {
      const key = generateApiKey();
      const hash = await hashApiKey(key);
      const wrongKey = generateApiKey();
      const result = await verifyApiKey(wrongKey, hash);
      expect(result).toBe(false);
    });

    it('should return false for an empty key', async () => {
      const key = generateApiKey();
      const hash = await hashApiKey(key);
      const result = await verifyApiKey('', hash);
      expect(result).toBe(false);
    });
  });
});
