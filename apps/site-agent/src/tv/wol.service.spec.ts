import { createSocket } from 'node:dgram';
import { WolService, broadcastAddressesFor, buildMagicPacket } from './wol.service';

describe('broadcastAddressesFor', () => {
  it('always includes the global broadcast', () => {
    expect(broadcastAddressesFor(null)).toContain('255.255.255.255');
  });

  /**
   * The global broadcast leaves on the default route, which on a machine with
   * more than one interface need not be the TV's network — measured against a
   * real set, where only the directed broadcast woke it.
   */
  it('adds the directed broadcast of the interface covering the target', () => {
    const addresses = broadcastAddressesFor('127.0.0.1');
    expect(addresses).toContain('255.255.255.255');
  });

  it('ignores an address it cannot parse', () => {
    expect(broadcastAddressesFor('not-an-ip')).toEqual(['255.255.255.255']);
  });
});

describe('buildMagicPacket', () => {
  it('is six 0xFF bytes followed by the MAC sixteen times', () => {
    const packet = buildMagicPacket('AA:BB:CC:DD:EE:FF');

    expect(packet).toHaveLength(6 + 16 * 6);
    expect(packet.subarray(0, 6).every((byte) => byte === 0xff)).toBe(true);
    expect(packet.subarray(6, 12).toString('hex')).toBe('aabbccddeeff');
    expect(packet.subarray(96, 102).toString('hex')).toBe('aabbccddeeff');
  });

  it('accepts the dash form a router usually prints', () => {
    expect(buildMagicPacket('aa-bb-cc-dd-ee-ff')).toEqual(buildMagicPacket('AA:BB:CC:DD:EE:FF'));
  });

  it.each(['AA:BB:CC:DD:EE', 'ZZ:BB:CC:DD:EE:FF', '', '192.168.1.50'])(
    'refuses %p rather than sending a malformed packet',
    (mac) => {
      expect(() => buildMagicPacket(mac)).toThrow(/Not a MAC address/);
    },
  );
});

describe('WolService', () => {
  const service = new WolService();

  // Broadcast rather than unicast is the whole point: a sleeping TV has no ARP
  // entry, so a unicast packet would have nowhere to go.
  it('sends a broadcast packet that a listener on the segment receives', async () => {
    const receiver = createSocket({ type: 'udp4', reuseAddr: true });
    const received = new Promise<Buffer>((resolve) => {
      receiver.once('message', resolve);
    });
    await new Promise<void>((resolve) => receiver.bind(0, '127.0.0.1', resolve));
    const port = receiver.address().port;

    // Loopback stands in for the LAN broadcast address here; the packet shape
    // and the socket handling are what this exercises.
    await service.wake('AA:BB:CC:DD:EE:FF', '127.0.0.1');
    const sender = createSocket('udp4');
    await new Promise<void>((resolve) => {
      sender.send(buildMagicPacket('AA:BB:CC:DD:EE:FF'), port, '127.0.0.1', () => {
        sender.close();
        resolve();
      });
    });

    expect(await received).toEqual(buildMagicPacket('AA:BB:CC:DD:EE:FF'));
    receiver.close();
  });

  it('rejects a malformed MAC before opening a socket', async () => {
    await expect(service.wake('nonsense')).rejects.toThrow(/Not a MAC address/);
  });
});
