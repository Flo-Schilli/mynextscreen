import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import { Injectable, Logger } from '@nestjs/common';

/** Magic packets are conventionally sent to the discard or echo port. */
const WOL_PORTS = [9, 7];
const MAC_BYTES = 6;
const REPEAT_COUNT = 16;

/**
 * Sends a Wake-on-LAN magic packet.
 *
 * Broadcast rather than unicast on purpose: a sleeping TV has no ARP entry, so
 * a unicast packet has nowhere to go. This is also why the container needs host
 * networking — a bridged network would not carry the broadcast to the LAN.
 *
 * Two traps worth knowing, both documented against real sets: a TV's wired and
 * wireless interfaces have different MACs, and after the set has been fully
 * disconnected from power, Wake-on-LAN stays dead until it is switched on once
 * with the remote.
 */
@Injectable()
export class WolService {
  private readonly logger = new Logger(WolService.name);

  /**
   * @param targetIp the set's address, used only to pick the broadcast that
   *   actually reaches its network. Optional: without it only the global
   *   broadcast is used.
   */
  async wake(macAddress: string, targetIp?: string | null): Promise<void> {
    const packet = buildMagicPacket(macAddress);
    const targets = broadcastAddressesFor(targetIp);
    const socket = createSocket('udp4');

    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject);
      socket.bind(() => {
        socket.setBroadcast(true);
        const sends = targets.flatMap((address) =>
          WOL_PORTS.map(
            (port) =>
              new Promise<void>((done) => {
                // One address being unroutable must not sink the others, so a
                // failure is logged and the rest still go out.
                socket.send(packet, port, address, (error) => {
                  if (error) {
                    this.logger.debug(
                      `Magic packet to ${address}:${port} failed: ${error.message}`,
                    );
                  }
                  done();
                });
              }),
          ),
        );
        void Promise.all(sends).then(() => {
          socket.close();
          resolve();
        });
      });
    });

    this.logger.log(`Sent Wake-on-LAN packet to ${macAddress} via ${targets.join(', ')}`);
  }
}

/**
 * Where to send the magic packet.
 *
 * `255.255.255.255` alone is not enough on a machine with more than one
 * interface: the kernel sends it out of the default route, which need not be
 * the network the TV is on. The directed broadcast of the interface that
 * actually covers the set's address is the one that arrives — measured against
 * a real TV, where the global broadcast did nothing and the directed one woke
 * it. Both are sent, cheaply, rather than betting on either.
 */
export function broadcastAddressesFor(targetIp?: string | null): string[] {
  const addresses = new Set<string>(['255.255.255.255']);
  if (!targetIp) {
    return [...addresses];
  }

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) {
        continue;
      }
      const directed = directedBroadcast(entry.address, entry.netmask, targetIp);
      if (directed) {
        addresses.add(directed);
      }
    }
  }
  return [...addresses];
}

/** The interface's broadcast address, but only when it covers `targetIp`. */
function directedBroadcast(address: string, netmask: string, targetIp: string): string | null {
  const toInt = (ip: string): number | null => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return null;
    }
    return parts.reduce((acc, part) => (acc << 8) | part, 0) >>> 0;
  };

  const host = toInt(address);
  const mask = toInt(netmask);
  const target = toInt(targetIp);
  if (host === null || mask === null || target === null) {
    return null;
  }
  if ((host & mask) >>> 0 !== (target & mask) >>> 0) {
    return null;
  }
  const broadcast = ((host & mask) | (~mask >>> 0)) >>> 0;
  return [24, 16, 8, 0].map((shift) => (broadcast >>> shift) & 0xff).join('.');
}

/** Six 0xFF bytes followed by the MAC repeated sixteen times. */
export function buildMagicPacket(macAddress: string): Buffer {
  const bytes = macAddress.split(/[:-]/).map((part) => Number.parseInt(part, 16));
  if (bytes.length !== MAC_BYTES || bytes.some((byte) => Number.isNaN(byte))) {
    throw new Error(`Not a MAC address: ${macAddress}`);
  }
  const mac = Buffer.from(bytes);
  return Buffer.concat([Buffer.alloc(MAC_BYTES, 0xff), ...Array(REPEAT_COUNT).fill(mac)]);
}
