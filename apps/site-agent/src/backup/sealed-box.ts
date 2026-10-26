/**
 * Seals a short secret for one recipient, so the server relaying it cannot read
 * it.
 *
 * Used to carry the backup password between the agent and the dashboard tab
 * that asked for it: the server is the only path between the two, and the whole
 * point of the backup being password-protected is lost if the server sees the
 * password next to the file.
 *
 * ECDH on P-256 with a fresh sender key per message, HKDF-SHA256, AES-256-GCM.
 * Plain WebCrypto on purpose: the dashboard runs the identical construction in
 * the browser (`apps/frontend/src/app/site-agents/backup/sealed-box.ts`), and a
 * shared test vector in both specs is what keeps the two halves compatible —
 * see `server-protocol.ts` for why this is not one shared module.
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

/**
 * Both public keys go into the HKDF salt, binding the derived key to this exact
 * pair: a sealed message replayed against a different recipient key derives
 * garbage instead of quietly decrypting.
 */
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

function toBase64(bytes: Bytes): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(value: string): Bytes {
  return new Uint8Array(Buffer.from(value, 'base64'));
}
