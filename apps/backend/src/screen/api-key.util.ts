import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

/**
 * Generates a crypto-random 32-byte API key, base64url-encoded.
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generates a crypto-random 32-byte pairing secret, base64url-encoded.
 * Used as a high-entropy bearer token on the polling status endpoint.
 */
export function generatePairingSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 hex digest. Fast, deterministic — used to fingerprint the
 * high-entropy pairing secret on a frequently-polled endpoint (no bcrypt).
 */
export function sha256hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
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
