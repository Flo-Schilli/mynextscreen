import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import { Injectable, Logger } from '@nestjs/common';
import type { AgentNetworkKindValue, AgentNetworkMessage } from '../protocol/server-protocol';

/** `iw` answers in milliseconds; a hung driver must not stall the heartbeat. */
const IW_TIMEOUT_MS = 2_000;

/**
 * Kernel interface names: at most 15 characters, no slashes, no whitespace.
 * The leading alphanumeric also rules out `.`/`..` in a sysfs path and a name
 * `iw` would read as an option.
 */
const INTERFACE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,14}$/;

/** C0/C1 control characters: nothing a network name should show. */
const CONTROL_CHARACTERS = /\p{Cc}/gu;

const UNKNOWN_NETWORK: AgentNetworkMessage = {
  interfaceName: null,
  kind: 'unknown',
  ssid: null,
  ipAddress: null,
};

/**
 * The host operations the service needs, injectable so tests do not depend on
 * the machine they run on.
 */
export interface NetworkHost {
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  interfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>;
  /** Raw output of `iw dev <iface> link`. */
  iwLink(interfaceName: string): Promise<string>;
}

export const systemNetworkHost: NetworkHost = {
  readFile: (path) => readFile(path, 'utf8'),
  exists: (path) =>
    access(path).then(
      () => true,
      () => false,
    ),
  interfaces: () => networkInterfaces(),
  iwLink: (interfaceName) =>
    new Promise((resolve, reject) => {
      execFile('iw', ['dev', interfaceName, 'link'], { timeout: IW_TIMEOUT_MS }, (error, stdout) =>
        error ? reject(error) : resolve(stdout),
      );
    }),
};

/**
 * How this machine reaches the venue network: the interface carrying the
 * default route, whether it is wired or wireless, the SSID on Wi-Fi and the
 * address it holds.
 *
 * Works from inside the container because the agent runs with host
 * networking: `/proc/net/route`, `/sys/class/net` and nl80211 (via `iw`) all
 * describe the host's interfaces. None of it needs a capability. Every part is
 * best-effort — a field that cannot be read is reported as unknown rather than
 * failing the heartbeat it rides on.
 */
@Injectable()
export class NetworkInfoService {
  private readonly logger = new Logger(NetworkInfoService.name);

  constructor(private readonly host: NetworkHost = systemNetworkHost) {}

  /** Never throws: the heartbeat this rides on matters more than the diagnostic. */
  async collect(): Promise<AgentNetworkMessage> {
    try {
      return await this.read();
    } catch (error) {
      this.logger.warn(`Could not read the network attachment: ${describe(error)}`);
      return UNKNOWN_NETWORK;
    }
  }

  private async read(): Promise<AgentNetworkMessage> {
    const interfaceName = (await this.defaultRouteInterface()) ?? this.firstExternalInterface();
    if (!interfaceName) {
      return UNKNOWN_NETWORK;
    }

    const kind = await this.kindOf(interfaceName);
    return {
      interfaceName,
      kind,
      ssid: kind === 'wifi' ? await this.ssidOf(interfaceName) : null,
      ipAddress: this.addressOf(interfaceName),
    };
  }

  /** The interface of the IPv4 default route with the lowest metric. */
  private async defaultRouteInterface(): Promise<string | null> {
    let table: string;
    try {
      table = await this.host.readFile('/proc/net/route');
    } catch (error) {
      this.logger.debug(`Could not read the routing table: ${describe(error)}`);
      return null;
    }
    return parseDefaultRoute(table);
  }

  /** Fallback when there is no default route: the first non-loopback IPv4 interface. */
  private firstExternalInterface(): string | null {
    for (const [name, entries] of Object.entries(this.host.interfaces())) {
      if (entries?.some((entry) => entry.family === 'IPv4' && !entry.internal)) {
        return isInterfaceName(name) ? name : null;
      }
    }
    return null;
  }

  private async kindOf(interfaceName: string): Promise<AgentNetworkKindValue> {
    const base = `/sys/class/net/${interfaceName}`;
    if (
      (await this.host.exists(`${base}/wireless`)) ||
      (await this.host.exists(`${base}/phy80211`))
    ) {
      return 'wifi';
    }
    // Only a physical device counts as LAN. A bridge, VPN tunnel or bond has no
    // `device` link and may sit on top of Wi-Fi, so calling it LAN would lie.
    return (await this.host.exists(`${base}/device`)) ? 'ethernet' : 'unknown';
  }

  private async ssidOf(interfaceName: string): Promise<string | null> {
    try {
      return parseIwSsid(await this.host.iwLink(interfaceName));
    } catch (error) {
      // Missing `iw`, a driver without nl80211, or not associated: the
      // dashboard then shows Wi-Fi without a network name.
      this.logger.debug(`Could not read the SSID of ${interfaceName}: ${describe(error)}`);
      return null;
    }
  }

  /** IPv4 first; a global IPv6 address only on an IPv6-only interface. */
  private addressOf(interfaceName: string): string | null {
    const entries = (this.host.interfaces()[interfaceName] ?? []).filter((e) => !e.internal);
    const ipv4 = entries.find((entry) => entry.family === 'IPv4');
    if (ipv4) {
      return ipv4.address;
    }
    const ipv6 = entries.find(
      (entry) => entry.family === 'IPv6' && !entry.address.toLowerCase().startsWith('fe80:'),
    );
    return ipv6?.address ?? null;
  }
}

/**
 * Picks the default route from `/proc/net/route`: destination and mask both
 * `00000000`, lowest metric wins when there are several (wired and Wi-Fi up at
 * the same time).
 */
export function parseDefaultRoute(table: string): string | null {
  let best: { name: string; metric: number } | null = null;
  for (const line of table.split('\n').slice(1)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 8) {
      continue;
    }
    const [name, destination, , , , , metricField, mask] = fields;
    if (destination !== '00000000' || mask !== '00000000' || !isInterfaceName(name)) {
      continue;
    }
    const metric = Number.parseInt(metricField, 10);
    const normalised = Number.isNaN(metric) ? Number.MAX_SAFE_INTEGER : metric;
    if (!best || normalised < best.metric) {
      best = { name, metric: normalised };
    }
  }
  return best?.name ?? null;
}

/**
 * Reads the SSID from `iw dev <iface> link`. `iw` prints bytes outside
 * printable ASCII as `\xNN`; those are decoded back so an umlaut in a network
 * name shows up as one.
 */
export function parseIwSsid(output: string): string | null {
  const match = /^\s*SSID: (.*)$/m.exec(output);
  if (!match) {
    return null;
  }
  // Split into escapes and literal runs, so a literal character outside the
  // BMP is encoded whole rather than one surrogate at a time.
  const parts = match[1].split(/(\\x[0-9a-fA-F]{2})/);
  const bytes = Buffer.concat(
    parts.map((part) =>
      /^\\x[0-9a-fA-F]{2}$/.test(part)
        ? Buffer.from([Number.parseInt(part.slice(2), 16)])
        : Buffer.from(part, 'utf8'),
    ),
  );
  const ssid = bytes.toString('utf8').replace(CONTROL_CHARACTERS, '');
  return ssid.length > 0 ? ssid : null;
}

function isInterfaceName(name: string): boolean {
  return INTERFACE_NAME.test(name);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
