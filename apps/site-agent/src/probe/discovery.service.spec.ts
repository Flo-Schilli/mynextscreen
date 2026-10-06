import type { NetworkInterfaceInfo } from 'node:os';
import {
  DiscoveryService,
  normalizeMac,
  parseArp,
  sweepTargets,
  type DiscoveryHost,
} from './discovery.service';

const HEADER = 'IP address       HW type     Flags       HW address            Mask     Device';

function arp(...rows: [ip: string, flags: string, mac: string, device?: string][]): string {
  return [
    HEADER,
    ...rows.map(
      ([ip, flags, mac, device = 'eth0']) => `${ip}  0x1  ${flags}  ${mac}  *  ${device}`,
    ),
    '',
  ].join('\n');
}

function iface(address: string, netmask: string): NodeJS.Dict<NetworkInterfaceInfo[]> {
  return {
    eth0: [
      {
        address,
        netmask,
        family: 'IPv4',
        mac: '00:11:22:33:44:55',
        internal: false,
        cidr: null,
      },
    ],
  };
}

describe('parseArp', () => {
  it('reads resolved entries and normalises the MAC', () => {
    expect(parseArp(arp(['192.168.1.77', '0x2', 'AA:BB:CC:DD:EE:FF']))).toEqual([
      { ip: '192.168.1.77', mac: 'aa:bb:cc:dd:ee:ff', device: 'eth0' },
    ]);
  });

  it('skips incomplete entries', () => {
    expect(parseArp(arp(['192.168.1.77', '0x0', '00:00:00:00:00:00']))).toEqual([]);
  });

  it('copes with an empty table', () => {
    expect(parseArp(`${HEADER}\n`)).toEqual([]);
  });
});

describe('normalizeMac', () => {
  it('accepts dashes and upper case', () => {
    expect(normalizeMac('AA-BB-CC-DD-EE-FF')).toBe('aa:bb:cc:dd:ee:ff');
  });
});

describe('sweepTargets', () => {
  it('lists every host of a /24 except this machine', () => {
    const targets = sweepTargets(iface('192.168.1.5', '255.255.255.0'));

    expect(targets).toHaveLength(253);
    expect(targets).toContain('192.168.1.1');
    expect(targets).toContain('192.168.1.254');
    expect(targets).not.toContain('192.168.1.5');
    expect(targets).not.toContain('192.168.1.255');
  });

  it('refuses a subnet too large to sweep', () => {
    expect(sweepTargets(iface('10.0.0.5', '255.255.0.0'))).toEqual([]);
  });

  it('never sweeps container or VPN interfaces', () => {
    const virtual = {
      docker0: iface('172.17.0.1', '255.255.255.0').eth0,
      wg0: iface('10.8.0.2', '255.255.255.0').eth0,
    };
    expect(sweepTargets(virtual)).toEqual([]);
  });

  it('sweeps only the subnet the set was last seen in when the machine has several', () => {
    const both = {
      eth0: iface('192.168.1.5', '255.255.255.0').eth0,
      wlan0: iface('192.168.2.5', '255.255.255.0').eth0,
    };

    const targets = sweepTargets(both, '192.168.2.40');

    expect(targets).toHaveLength(253);
    expect(targets.every((ip) => ip.startsWith('192.168.2.'))).toBe(true);
  });

  it('ignores loopback', () => {
    const loopback = {
      lo: [{ ...iface('127.0.0.1', '255.0.0.0').eth0![0], internal: true }],
    };
    expect(sweepTargets(loopback)).toEqual([]);
  });
});

describe('DiscoveryService', () => {
  const MAC = 'AA:BB:CC:DD:EE:FF';
  let host: jest.Mocked<DiscoveryHost>;
  let service: DiscoveryService;

  beforeEach(() => {
    host = {
      readArp: jest.fn().mockResolvedValue(arp()),
      ssdpSearch: jest.fn().mockResolvedValue([]),
      touch: jest.fn().mockResolvedValue(undefined),
      interfaces: jest.fn().mockReturnValue(iface('192.168.1.5', '255.255.255.0')),
    };
    service = new DiscoveryService(host);
  });

  it('answers from the neighbour table without scanning when it already knows', async () => {
    host.readArp.mockResolvedValue(arp(['192.168.1.77', '0x2', 'aa:bb:cc:dd:ee:ff']));

    expect(await service.locate(MAC, '192.168.1.50')).toBe('192.168.1.77');
    expect(host.ssdpSearch).not.toHaveBeenCalled();
  });

  // The stale entry for the address that stopped answering is what is being replaced.
  it('never returns the address that stopped answering', async () => {
    host.readArp.mockResolvedValue(arp(['192.168.1.50', '0x2', 'aa:bb:cc:dd:ee:ff']));

    expect(await service.locate(MAC, '192.168.1.50')).toBeNull();
  });

  it('asks the sets over SSDP and touches whoever answers', async () => {
    host.ssdpSearch.mockResolvedValue(['192.168.1.77']);
    host.readArp
      .mockResolvedValueOnce(arp())
      .mockResolvedValue(arp(['192.168.1.77', '0x2', 'aa:bb:cc:dd:ee:ff']));

    expect(await service.locate(MAC, '192.168.1.50')).toBe('192.168.1.77');
    expect(host.touch).toHaveBeenCalledWith('192.168.1.77', 3001, expect.any(Number));
    expect(host.touch).toHaveBeenCalledTimes(1);
  });

  it('never sweeps the subnet unless the operator allowed it', async () => {
    expect(await service.locate(MAC, '192.168.1.50')).toBeNull();
    expect(host.touch).not.toHaveBeenCalled();
  });

  it('sweeps the subnet when SSDP did not turn the set up and sweeping is allowed', async () => {
    host.readArp
      .mockResolvedValueOnce(arp())
      .mockResolvedValueOnce(arp())
      .mockResolvedValue(arp(['192.168.1.77', '0x2', 'aa:bb:cc:dd:ee:ff']));

    expect(await service.locate(MAC, '192.168.1.50', true)).toBe('192.168.1.77');
    expect(host.touch).toHaveBeenCalledTimes(253);
  });

  it('reuses a recent scan for the next screen instead of sweeping again', async () => {
    await service.locate(MAC, '192.168.1.50', true);
    await service.locate('11:22:33:44:55:66', '192.168.1.51', true);

    expect(host.ssdpSearch).toHaveBeenCalledTimes(1);
    expect(host.touch).toHaveBeenCalledTimes(253);
  });

  it('does not trust a neighbour entry learnt on a container bridge', async () => {
    host.readArp.mockResolvedValue(arp(['172.17.0.9', '0x2', 'aa:bb:cc:dd:ee:ff', 'docker0']));

    expect(await service.locate(MAC, '192.168.1.50')).toBeNull();
  });

  it('returns null rather than throwing when the table cannot be read', async () => {
    host.readArp.mockRejectedValue(new Error('EACCES'));

    expect(await service.locate(MAC, '192.168.1.50')).toBeNull();
  });

  it('does not search for something that is not a MAC', async () => {
    expect(await service.locate('not-a-mac', null)).toBeNull();
    expect(host.readArp).not.toHaveBeenCalled();
  });
});
