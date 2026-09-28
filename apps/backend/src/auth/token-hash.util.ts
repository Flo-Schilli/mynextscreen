import { createHash } from 'node:crypto';

/**
 * One-way fingerprint for the single-use tokens mailed to a user (email
 * verification, password reset, email change).
 *
 * They used to sit in the database in plaintext, so anyone who could read a
 * row — a database dump, a backup, a support query, the super-admin member
 * routes before D11 — could take over the account the token belonged to,
 * without knowing the password. SHA-256 is the right primitive here rather
 * than bcrypt: the tokens are 256 bits of CSPRNG output, so there is nothing to
 * brute-force, and the lookup must stay an indexed equality match.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
