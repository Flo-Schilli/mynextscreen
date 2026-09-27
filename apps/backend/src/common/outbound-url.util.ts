import { isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';

/**
 * Guards every outbound request whose target an organisation can configure
 * (ntfy URL, per-org SMTP host, live-stream source). Without this the backend is
 * an SSRF proxy into its own network: cloud metadata (169.254.169.254), Redis,
 * Postgres and any internal admin UI sit one org-admin setting away.
 *
 * Two layers, because neither alone is enough:
 * - the *syntax* check runs in the DTO, so a bad value is rejected at save time
 *   with a field error instead of failing later inside a channel;
 * - the *resolved* check runs right before the request, because a hostname that
 *   looked public at save time can resolve into the private ranges later
 *   (DNS rebinding).
 *
 * Deployments that legitimately talk to an internal host (a self-hosted ntfy or
 * SMTP relay on the LAN) list it in `OUTBOUND_ALLOWED_HOSTS`.
 */

export const DEFAULT_OUTBOUND_SCHEMES = ['http:', 'https:'] as const;

/** Hostnames that must never be reachable regardless of what DNS says. */
const BLOCKED_HOST_SUFFIXES = ['localhost'] as const;

export class BlockedOutboundUrlError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'BlockedOutboundUrlError';
  }
}

export interface DnsLookupResult {
  address: string;
  family: number;
}

export type DnsLookupFn = (hostname: string) => Promise<DnsLookupResult[]>;

export interface OutboundUrlOptions {
  /** Allowed URL schemes, including the colon. Defaults to http + https. */
  schemes?: readonly string[];
  /** Hosts that bypass the range check (operator opt-in for internal targets). */
  allowlist?: readonly string[];
  /** Injectable for tests; defaults to a real DNS lookup of every address. */
  lookup?: DnsLookupFn;
}

const defaultLookup: DnsLookupFn = async (hostname) => {
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map(({ address, family }) => ({ address, family }));
};

/** Reads the operator allowlist. Env, not ConfigService: DTO validators have no DI. */
export function getConfiguredOutboundAllowlist(): readonly string[] {
  return (process.env.OUTBOUND_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function normaliseHost(host: string): string {
  // URL keeps IPv6 literals in brackets; strip them so isIP() recognises them.
  const unbracketed = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  return unbracketed.toLowerCase();
}

function isAllowlisted(host: string, allowlist: readonly string[] | undefined): boolean {
  const entries = allowlist ?? getConfiguredOutboundAllowlist();
  return entries.includes(normaliseHost(host));
}

function ipv4ToInt(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4) {
    return null;
  }
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null;
    }
    value = value * 256 + octet;
  }
  return value;
}

/** [firstAddress, prefixLength] pairs that must never be dialled. */
const BLOCKED_V4_RANGES: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. 255.255.255.255
];

function isBlockedIpv4(address: string): boolean {
  const value = ipv4ToInt(address);
  if (value === null) {
    return false;
  }
  return BLOCKED_V4_RANGES.some(([base, prefix]) => {
    const baseValue = ipv4ToInt(base);
    if (baseValue === null) {
      return false;
    }
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) >>> 0 === (baseValue & mask) >>> 0;
  });
}

function isBlockedIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  // IPv4-mapped (::ffff:1.2.3.4) and IPv4-compatible forms carry a v4 address.
  const mapped = /^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }
  if (lower === '::' || lower === '::1') {
    return true;
  }
  const firstWord = lower.split(':')[0];
  const head = parseInt(firstWord === '' ? '0' : firstWord, 16);
  if (Number.isNaN(head)) {
    return false;
  }
  const isUniqueLocal = (head & 0xfe00) === 0xfc00; // fc00::/7
  const isLinkLocal = (head & 0xffc0) === 0xfe80; // fe80::/10
  const isMulticast = (head & 0xff00) === 0xff00; // ff00::/8
  return isUniqueLocal || isLinkLocal || isMulticast;
}

/**
 * True for loopback, private, link-local, CGNAT, multicast and reserved
 * addresses — i.e. everything that is "inside" rather than on the public
 * internet. Used both to refuse outbound targets and to recognise a request
 * that arrived from a proxy on the internal network.
 */
export function isInternalIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return isBlockedIpv4(address);
  }
  if (version === 6) {
    return isBlockedIpv6(address);
  }
  return false;
}

function assertHostSyntax(host: string, options: OutboundUrlOptions): void {
  const normalised = normaliseHost(host);
  if (normalised.length === 0) {
    throw new BlockedOutboundUrlError('Host is empty');
  }
  if (isAllowlisted(normalised, options.allowlist)) {
    return;
  }
  if (
    BLOCKED_HOST_SUFFIXES.some(
      (suffix) => normalised === suffix || normalised.endsWith(`.${suffix}`),
    )
  ) {
    throw new BlockedOutboundUrlError('Host points at the local machine');
  }
  if (isInternalIpAddress(normalised)) {
    throw new BlockedOutboundUrlError('Host points at a private or reserved address');
  }
}

/** Parses and syntactically validates an outbound URL. Performs no DNS lookup. */
export function parseOutboundUrl(raw: string, options: OutboundUrlOptions = {}): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedOutboundUrlError('Not a valid URL');
  }
  const schemes = options.schemes ?? DEFAULT_OUTBOUND_SCHEMES;
  if (!schemes.includes(url.protocol)) {
    throw new BlockedOutboundUrlError(`Scheme ${url.protocol} is not allowed`);
  }
  if (url.username !== '' || url.password !== '') {
    throw new BlockedOutboundUrlError('URL must not carry credentials');
  }
  assertHostSyntax(url.hostname, options);
  return url;
}

/** Boolean form of {@link parseOutboundUrl} for use inside class-validator. */
export function isSafeOutboundUrlSyntax(raw: string, options: OutboundUrlOptions = {}): boolean {
  try {
    parseOutboundUrl(raw, options);
    return true;
  } catch {
    return false;
  }
}

/** Boolean syntax check for a bare host (SMTP has no URL to parse). */
export function isSafeOutboundHostSyntax(host: string, options: OutboundUrlOptions = {}): boolean {
  try {
    assertHostSyntax(host, options);
    return true;
  } catch {
    return false;
  }
}

async function assertResolvesPublicly(host: string, options: OutboundUrlOptions): Promise<void> {
  if (isAllowlisted(host, options.allowlist)) {
    return;
  }
  if (isIP(host) !== 0) {
    // A literal address was already checked syntactically; nothing to resolve.
    return;
  }
  const lookup = options.lookup ?? defaultLookup;
  let addresses: DnsLookupResult[];
  try {
    addresses = await lookup(host);
  } catch {
    throw new BlockedOutboundUrlError('Host could not be resolved');
  }
  if (addresses.length === 0) {
    throw new BlockedOutboundUrlError('Host could not be resolved');
  }
  // Every address must be public: a split-horizon answer is still a way in.
  if (addresses.some(({ address }) => isInternalIpAddress(address))) {
    throw new BlockedOutboundUrlError('Host resolves to a private or reserved address');
  }
}

/**
 * Full check to run immediately before an outbound request: syntax, then the
 * resolved addresses. Throws {@link BlockedOutboundUrlError}; callers translate
 * it into a generic client-facing error so it cannot be used as a network oracle.
 */
export async function assertOutboundUrlAllowed(
  raw: string,
  options: OutboundUrlOptions = {},
): Promise<URL> {
  const url = parseOutboundUrl(raw, options);
  await assertResolvesPublicly(normaliseHost(url.hostname), options);
  return url;
}

/** {@link assertOutboundUrlAllowed} for a bare host, e.g. an SMTP server. */
export async function assertOutboundHostAllowed(
  host: string,
  options: OutboundUrlOptions = {},
): Promise<void> {
  assertHostSyntax(host, options);
  await assertResolvesPublicly(normaliseHost(host), options);
}

/** Outbound-facing name for {@link isInternalIpAddress}. */
export const isBlockedIpAddress = isInternalIpAddress;
