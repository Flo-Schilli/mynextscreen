import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

/**
 * Generates a crypto-random 32-byte API key, base64url-encoded.
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hashes an API key using bcrypt.
 */
export async function hashApiKey(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/**
 * Compares a plaintext API key against a bcrypt hash.
 */
export async function verifyApiKey(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
