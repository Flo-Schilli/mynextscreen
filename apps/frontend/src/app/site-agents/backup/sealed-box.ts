/**
 * The dashboard's half of the sealed box the site agent uses to pass the backup
 * password through the server without the server being able to read it.
 *
 * Must stay byte-compatible with `apps/site-agent/src/backup/sealed-box.ts`:
 * ECDH P-256 with a fresh sender key, HKDF-SHA256 salted with both public keys,
 * AES-256-GCM. Both specs open the same pinned vector, which is what catches a
 * drift between the two.
 *
 * Wire format, base64: `senderPublicKey (65, raw) | iv (12) | ciphertext+tag`.
 */

const CURVE = { name: 'ECDH', namedCurve: 'P-256' } as const;
const PUBLIC_KEY_BYTES = 65;
const IV_BYTES = 12;
const INFO = new TextEncoder().encode('mynextscreen-sealed-box-v1');

/** WebCrypto wants buffers it can prove are not shared; this is that type. */
type Bytes = Uint8Array<ArrayBuffer>;

export interface SealedBoxKeyPair {
  /** Raw uncompressed point, base64. Safe to send anywhere. */
  publicKey: string;
  /** Never leaves the tab: not extractable, held only in memory. */
  privateKey: CryptoKey;
}

export async function generateSealedBoxKeyPair(): Promise<SealedBoxKeyPair> {
  const pair = await crypto.subtle.generateKey(CURVE, false, ['deriveBits']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { publicKey: toBase64(raw), privateKey: pair.privateKey };
}

export async function seal(recipientPublicKey: string, plaintext: string): Promise<string> {
  const recipientRaw = fromBase64(recipientPublicKey);
  if (recipientRaw.length !== PUBLIC_KEY_BYTES) {
    throw new Error('Recipient public key is not a P-256 point');
  }
  const recipient = await crypto.subtle.importKey('raw', recipientRaw, CURVE, false, []);
  const sender = await crypto.subtle.generateKey(CURVE, true, ['deriveBits']);
  const senderRaw = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey));

  const key = await deriveKey(sender.privateKey, recipient, senderRaw, recipientRaw);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  );
  return toBase64(concat(senderRaw, iv, ciphertext));
}

export async function open(recipient: SealedBoxKeyPair, sealed: string): Promise<string> {
  const bytes = fromBase64(sealed);
  if (bytes.length <= PUBLIC_KEY_BYTES + IV_BYTES) {
    throw new Error('Sealed message is truncated');
  }
  const senderRaw = bytes.subarray(0, PUBLIC_KEY_BYTES);
  const iv = bytes.subarray(PUBLIC_KEY_BYTES, PUBLIC_KEY_BYTES + IV_BYTES);
  const ciphertext = bytes.subarray(PUBLIC_KEY_BYTES + IV_BYTES);

  const sender = await crypto.subtle.importKey('raw', senderRaw, CURVE, false, []);
  const key = await deriveKey(
    recipient.privateKey,
    sender,
    senderRaw,
    fromBase64(recipient.publicKey),
  );
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

async function deriveKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  senderRaw: Bytes,
  recipientRaw: Bytes,
): Promise<CryptoKey> {
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: concat(senderRaw, recipientRaw), info: INFO },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function fromBase64(value: string): Bytes {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
