import { createSocket } from 'node:dgram';
import { readFile } from 'node:fs/promises';
import { Socket } from 'node:net';
import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os';
import { Injectable, Logger } from '@nestjs/common';

const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
/** The service every webOS set advertises while it is on. */
const SSDP_SEARCH_TARGET = 'urn:lge-com:service:webos-second-screen:1';
const SSDP_LISTEN_MS = 3_000;

/** Port knocked on to make the kernel resolve an address; SSAP, which a set has open. */
const TOUCH_PORT = 3001;
const TOUCH_TIMEOUT_MS = 700;
const SWEEP_CONCURRENCY = 32;

/** Larger subnets are not swept: 1022 hosts is a /22, far beyond a venue LAN. */
const MAX_SWEEP_HOSTS = 1022;

/**
 * A scan is shared by every screen looking for itself within this window. As
 * long as a screen's own search cooldown, so several missing sets with offset
 * cooldowns do not between them start a scan every round.
 */
const SCAN_REUSE_MS = 2 * 60_000;

/**
 * Container, VM and VPN interfaces: never the venue LAN, so neither swept nor
 * trusted as the source of a neighbour entry.
 */
const VIRTUAL_INTERFACE =
  /^(lo|docker|br-|veth|virbr|vnet|tun|tap|wg|podman|cni|flannel|cali|vxlan|zt|tailscale)/;

/** `/proc/net/arp` flag for a resolved entry. */
const ATF_COM = 0x2;

const MAC_PATTERN = /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i;

/** The host operations discovery needs, injectable so tests do not touch the network. */
export interface DiscoveryHost {
  /** Raw contents of `/proc/net/arp`. */
  readArp(): Promise<string>;
  /** Addresses that answered an SSDP search within the listen window. */
  ssdpSearch(searchTarget: string, listenMs: number): Promise<string[]>;
  /** Opens and drops a TCP connection; resolves either way. */
  touch(ip: string, port: number, timeoutMs: number): Promise<void>;
  interfaces(): NodeJS.Dict<NetworkInterfaceInfo[]>;
}

export const systemDiscoveryHost: DiscoveryHost = {
  readArp: () => readFile('/proc/net/arp', 'utf8'),
  ssdpSearch: (searchTarget, listenMs) =>
    new Promise((resolve) => {
      const found = new Set<string>();
      const socket = createSocket({ type: 'udp4', reuseAddr: true });
      let timer: ReturnType<typeof setTimeout> | null = null;
      let finished = false;
      // Idempotent: an asynchronous send error and the listen timer can both
      // end the search, and closing a closed socket throws outside any catch.
      const finish = (): void => {
        if (finished) {
          return;
        }
        finished = true;
        if (timer) {
          clearTimeout(timer);
        }
        try {
          socket.close();
        } catch {
          // Already closed by the error that brought us here.
        }
        resolve([...found]);
      };
      socket.on('message', (_message, remote) => found.add(remote.address));
      socket.on('error', finish);
      socket.bind(() => {
        const request = Buffer.from(
          [
            'M-SEARCH * HTTP/1.1',
            `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}`,
            'MAN: "ssdp:discover"',
            'MX: 2',
            `ST: ${searchTarget}`,
            '',
            '',
          ].join('\r\n'),
        );
        timer = setTimeout(finish, listenMs);
        socket.send(request, SSDP_PORT, SSDP_ADDRESS, (error) => {
          if (error) {
            finish();
          }
        });
      });
    }),
  touch: (ip, port, timeoutMs) =>
    new Promise((resolve) => {
      const socket = new Socket();
      const done = (): void => {
        socket.destroy();
        resolve();
      };
      socket.setTimeout(timeoutMs);
      socket.once('connect', done);
      socket.once('timeout', done);
      socket.once('error', done);
      socket.connect(port, ip);
    }),
  interfaces: () => networkInterfaces(),
};

/**
 * Finds a TV by its MAC address after its IP has changed.
 *
 * Needed where nobody can pin the sets' addresses in the router: every DHCP
 * lease renewal may move a display, and the agent would otherwise keep knocking
 * on an address that now belongs to something else.
 *
 * The MAC-to-IP mapping comes from the kernel's neighbour table, which only
 * holds hosts this machine has recently talked to. So a lookup first asks every
 * webOS set to announce itself over SSDP and touches whoever answers, and only
 * if the set is still missing — and the operator allowed it — sweeps the local
 * subnet. Both run on the host's
 * network stack, which is why the container uses host networking — and both
 * find only a set that is on: a TV in standby answers neither.
 */
@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private lastSsdpAt = 0;
  private lastSweepAt = 0;
  private scanning: Promise<void> | null = null;

  constructor(private readonly host: DiscoveryHost = systemDiscoveryHost) {}

  /**
   * The address that currently belongs to `macAddress`, or null.
   *
   * `currentIp` is the address that stopped answering; it is never returned,
   * because a neighbour entry pointing at it is the stale one being replaced.
   * The subnet sweep runs only with `allowSweep`: it touches every address on
   * the LAN, which the operator has to switch on. Without it only sets that
   * answered SSDP themselves are contacted.
   * Never throws: failing to find a set is the expected outcome while it is off.
   */
  async locate(
    macAddress: string,
    currentIp: string | null,
    allowSweep = false,
  ): Promise<string | null> {
    if (!MAC_PATTERN.test(macAddress)) {
      return null;
    }
    const wanted = normalizeMac(macAddress);
    try {
      return (
        (await this.lookup(wanted, currentIp)) ??
        (await this.afterScan(() => this.ssdpScan(), wanted, currentIp)) ??
        (allowSweep ? await this.afterScan(() => this.sweep(currentIp), wanted, currentIp) : null)
      );
    } catch (error) {
      this.logger.warn(`Discovery failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  private async afterScan(
    scan: () => Promise<void>,
    wanted: string,
    currentIp: string | null,
  ): Promise<string | null> {
    // One scan at a time: eighteen screens looking for themselves in one round
    // must not start eighteen sweeps side by side.
    while (this.scanning) {
      await this.scanning;
    }
    this.scanning = scan().finally(() => {
      this.scanning = null;
    });
    await this.scanning;
    return this.lookup(wanted, currentIp);
  }

  private async ssdpScan(): Promise<void> {
    if (Date.now() - this.lastSsdpAt < SCAN_REUSE_MS) {
      return;
    }
    this.lastSsdpAt = Date.now();
    const responders = await this.host.ssdpSearch(SSDP_SEARCH_TARGET, SSDP_LISTEN_MS);
    // Replies arrive over UDP, which does not reliably leave a resolved entry
    // behind; a connection attempt does.
    await Promise.all(responders.map((ip) => this.host.touch(ip, TOUCH_PORT, TOUCH_TIMEOUT_MS)));
    this.logger.debug(`SSDP: ${responders.length} webOS set(s) answered`);
  }

  private async sweep(currentIp: string | null): Promise<void> {
    if (Date.now() - this.lastSweepAt < SCAN_REUSE_MS) {
      return;
    }
    this.lastSweepAt = Date.now();
    const targets = sweepTargets(this.host.interfaces(), currentIp);
    for (let i = 0; i < targets.length; i += SWEEP_CONCURRENCY) {
      await Promise.all(
        targets
          .slice(i, i + SWEEP_CONCURRENCY)
          .map((ip) => this.host.touch(ip, TOUCH_PORT, TOUCH_TIMEOUT_MS)),
      );
    }
    this.logger.debug(`Swept ${targets.length} address(es)`);
  }

  private async lookup(wanted: string, currentIp: string | null): Promise<string | null> {
    const entry = parseArp(await this.host.readArp()).find(
      (neighbour) =>
        neighbour.mac === wanted &&
        neighbour.ip !== currentIp &&
        !VIRTUAL_INTERFACE.test(neighbour.device),
    );
    return entry?.ip ?? null;
  }
}

export interface Neighbour {
  ip: string;
  mac: string;
  device: string;
}

/** Resolved IPv4 neighbours from `/proc/net/arp`, MACs normalised. */
export function parseArp(contents: string): Neighbour[] {
  return contents
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(
      ([ip, , flags, mac]) =>
        !!ip &&
        !!mac &&
        (Number.parseInt(flags ?? '0', 16) & ATF_COM) !== 0 &&
        MAC_PATTERN.test(mac) &&
        normalizeMac(mac) !== '00:00:00:00:00:00',
    )
    .map(([ip, , , mac, , device]) => ({ ip, mac: normalizeMac(mac), device: device ?? '' }));
}

export function normalizeMac(mac: string): string {
  return mac.toLowerCase().replace(/-/g, ':');
}

interface Subnet {
  host: number;
  network: number;
  size: number;
}

/**
 * The host addresses worth sweeping: the subnet the set was last seen in when
 * one of the machine's interfaces covers it, otherwise every physical subnet
 * small enough. Virtual interfaces are never swept.
 */
export function sweepTargets(
  interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>,
  lastKnownIp: string | null = null,
): string[] {
  const subnets = physicalSubnets(interfaces);
  const last = lastKnownIp ? toInt(lastKnownIp) : null;
  const covering = subnets.filter(
    (subnet) => last !== null && last >= subnet.network && last < subnet.network + subnet.size,
  );

  const targets = new Set<string>();
  for (const subnet of covering.length > 0 ? covering : subnets) {
    for (let offset = 1; offset < subnet.size - 1; offset++) {
      const candidate = subnet.network + offset;
      if (candidate !== subnet.host) {
        targets.add(fromInt(candidate));
      }
    }
  }
  return [...targets];
}

function physicalSubnets(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>): Subnet[] {
  const subnets: Subnet[] = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    if (VIRTUAL_INTERFACE.test(name)) {
      continue;
    }
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) {
        continue;
      }
      const host = toInt(entry.address);
      const mask = toInt(entry.netmask);
      if (host === null || mask === null) {
        continue;
      }
      const size = (~mask >>> 0) + 1;
      if (size - 2 > MAX_SWEEP_HOSTS || size < 4) {
        continue;
      }
      subnets.push({ host, network: (host & mask) >>> 0, size });
    }
  }
  return subnets;
}

function toInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return parts.reduce((acc, part) => (acc << 8) | part, 0) >>> 0;
}

function fromInt(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join('.');
}
