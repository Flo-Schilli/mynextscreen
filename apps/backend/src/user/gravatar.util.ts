import { createHash } from 'node:crypto';

/**
 * Default image served by Gravatar when the email has no associated avatar.
 * `identicon` produces a deterministic geometric pattern per hash, so every user
 * gets a distinct, pleasant placeholder even without a Gravatar account.
 */
const GRAVATAR_DEFAULT_IMAGE = 'identicon';

/**
 * Pixel size requested from Gravatar. Generous enough for a retina top-bar avatar
 * and a settings-page preview; the browser scales the single image down.
 */
const GRAVATAR_SIZE = 160;

/**
 * Build the Gravatar avatar URL for an email address.
 *
 * Gravatar identifies an email by the hex digest of its trimmed, lowercased form.
 * We use SHA-256 (Gravatar's current recommendation; MD5 remains supported for
 * legacy callers). Only ever call this for users who have NOT opted out — the
 * hash is derived from the email, so emitting the URL discloses it to Gravatar.
 */
export function buildGravatarUrl(email: string): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash('sha256').update(normalized).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=${GRAVATAR_DEFAULT_IMAGE}&s=${GRAVATAR_SIZE}`;
}
