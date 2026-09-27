/**
 * Content-sniffing for uploads.
 *
 * The client-supplied `Content-Type` is attacker-controlled and was previously
 * both trusted at upload and echoed back on download, which let an SVG with a
 * `<script>` in it be stored as `image/svg+xml` and then executed from the API
 * origin. The bytes decide instead, and only formats on this list are accepted:
 * SVG has no binary signature, so it can never match — which is the point, and
 * it is not a useful signage format anyway.
 */

export type MediaKind = 'image' | 'video';

export interface DetectedMediaType {
  mime: string;
  kind: MediaKind;
}

interface Signature extends DetectedMediaType {
  /** Bytes that must match at `offset`. */
  magic: readonly number[];
  offset: number;
  /** Optional second match, e.g. the ISOBMFF brand or the RIFF form type. */
  brand?: { offset: number; values: readonly string[] };
}

const ISOBMFF_FTYP_OFFSET = 4;

const SIGNATURES: readonly Signature[] = [
  { mime: 'image/jpeg', kind: 'image', offset: 0, magic: [0xff, 0xd8, 0xff] },
  {
    mime: 'image/png',
    kind: 'image',
    offset: 0,
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: 'image/gif', kind: 'image', offset: 0, magic: [0x47, 0x49, 0x46, 0x38] },
  {
    mime: 'image/webp',
    kind: 'image',
    offset: 0,
    magic: [0x52, 0x49, 0x46, 0x46], // "RIFF"
    brand: { offset: 8, values: ['WEBP'] },
  },
  {
    mime: 'video/x-msvideo',
    kind: 'video',
    offset: 0,
    magic: [0x52, 0x49, 0x46, 0x46], // "RIFF"
    brand: { offset: 8, values: ['AVI '] },
  },
  {
    mime: 'image/avif',
    kind: 'image',
    offset: ISOBMFF_FTYP_OFFSET,
    magic: [0x66, 0x74, 0x79, 0x70], // "ftyp"
    brand: { offset: 8, values: ['avif', 'avis'] },
  },
  {
    mime: 'image/heic',
    kind: 'image',
    offset: ISOBMFF_FTYP_OFFSET,
    magic: [0x66, 0x74, 0x79, 0x70],
    brand: { offset: 8, values: ['heic', 'heix', 'hevc', 'mif1'] },
  },
  {
    mime: 'video/quicktime',
    kind: 'video',
    offset: ISOBMFF_FTYP_OFFSET,
    magic: [0x66, 0x74, 0x79, 0x70],
    brand: { offset: 8, values: ['qt  '] },
  },
  {
    mime: 'video/mp4',
    kind: 'video',
    offset: ISOBMFF_FTYP_OFFSET,
    magic: [0x66, 0x74, 0x79, 0x70],
    brand: {
      offset: 8,
      values: ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'mmp4'],
    },
  },
  {
    mime: 'video/webm',
    kind: 'video',
    offset: 0,
    magic: [0x1a, 0x45, 0xdf, 0xa3], // EBML — WebM and Matroska share it
  },
  {
    mime: 'video/mpeg',
    kind: 'video',
    offset: 0,
    magic: [0x00, 0x00, 0x01, 0xba], // MPEG program stream
  },
];

/** Every MIME type the platform is willing to store and serve. */
export const SUPPORTED_MEDIA_TYPES: readonly string[] = Array.from(
  new Set(SIGNATURES.map((signature) => signature.mime)),
);

function matchesAt(buffer: Buffer, offset: number, magic: readonly number[]): boolean {
  if (buffer.length < offset + magic.length) {
    return false;
  }
  return magic.every((byte, index) => buffer[offset + index] === byte);
}

function matchesBrand(buffer: Buffer, brand: Signature['brand']): boolean {
  if (!brand) {
    return true;
  }
  if (buffer.length < brand.offset + 4) {
    return false;
  }
  const value = buffer.toString('latin1', brand.offset, brand.offset + 4);
  return brand.values.includes(value);
}

/**
 * Identifies the media type from the leading bytes. Returns null for anything
 * not on the allow-list — including SVG, HTML and any other text payload.
 */
export function detectMediaType(buffer: Buffer): DetectedMediaType | null {
  for (const signature of SIGNATURES) {
    if (
      matchesAt(buffer, signature.offset, signature.magic) &&
      matchesBrand(buffer, signature.brand)
    ) {
      return { mime: signature.mime, kind: signature.kind };
    }
  }
  return null;
}

/** True when the stored MIME type is one this server produced itself. */
export function isSupportedMediaType(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && SUPPORTED_MEDIA_TYPES.includes(mime);
}
