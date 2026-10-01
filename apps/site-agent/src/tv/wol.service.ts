import { createSocket } from 'node:dgram';
import { Injectable, Logger } from '@nestjs/common';

/** Magic packets are conventionally sent to the discard or echo port. */
const WOL_PORT = 9;
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

  async wake(macAddress: string, broadcastAddress = '255.255.255.255'): Promise<void> {
    const packet = buildMagicPacket(macAddress);
    const socket = createSocket('udp4');

    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject);
      socket.bind(() => {
        socket.setBroadcast(true);
        socket.send(packet, WOL_PORT, broadcastAddress, (error) => {
          socket.close();
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });

    this.logger.log(`Sent Wake-on-LAN packet to ${macAddress}`);
  }
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
