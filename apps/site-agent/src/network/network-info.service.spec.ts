import type { NetworkInterfaceInfo } from 'node:os';
import {
  NetworkInfoService,
  parseDefaultRoute,
  parseIwSsid,
  type NetworkHost,
} from './network-info.service';

const ROUTE_HEADER =
  'Iface\tDestination\tGateway\tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT';

function route(iface: string, destination: string, metric: number, mask: string): string {
  return `${iface}\t${destination}\t0101A8C0\t0003\t0\t0\t${metric}\t${mask}\t0\t0\t0`;
}

function ipv4(address: string): NetworkInterfaceInfo {
  return {
    address,
    netmask: '255.255.255.0',
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal: false,
    cidr: `${address}/24`,
  };
}

function ipv6(address: string): NetworkInterfaceInfo {
  return {
    address,
    netmask: 'ffff:ffff:ffff:ffff::',
    family: 'IPv6',
    mac: '00:00:00:00:00:00',
    internal: false,
    cidr: `${address}/64`,
    scopeid: 0,
  };
}

function fakeHost(overrides: Partial<NetworkHost> = {}): NetworkHost {
  return {
    readFile: jest
      .fn()
      .mockResolvedValue([ROUTE_HEADER, route('eth0', '00000000', 100, '00000000')].join('\n')),
    exists: jest.fn(async (path: string) => path === '/sys/class/net/eth0/device'),
    interfaces: jest.fn().mockReturnValue({ eth0: [ipv4('192.168.1.5')] }),
    iwLink: jest.fn().mockRejectedValue(new Error('not called')),
    ...overrides,
  };
}

describe('parseDefaultRoute', () => {
  it('returns the interface of the default route', () => {
    const table = [
      ROUTE_HEADER,
      route('eth0', '0001A8C0', 0, '00FFFFFF'),
      route('eth0', '00000000', 100, '00000000'),
    ].join('\n');

    expect(parseDefaultRoute(table)).toBe('eth0');
  });

  // Wired and Wi-Fi up at the same time: the kernel uses the lower metric.
  it('prefers the default route with the lowest metric', () => {
    const table = [
      ROUTE_HEADER,
      route('wlan0', '00000000', 600, '00000000'),
      route('eth0', '00000000', 100, '00000000'),
    ].join('\n');

    expect(parseDefaultRoute(table)).toBe('eth0');
  });

  it('returns null without a default route', () => {
    expect(
      parseDefaultRoute([ROUTE_HEADER, route('eth0', '0001A8C0', 0, '00FFFFFF')].join('\n')),
    ).toBeNull();
  });

  it.each(['..', '-h'])('ignores the interface name %p', (name) => {
    expect(
      parseDefaultRoute([ROUTE_HEADER, route(name, '00000000', 0, '00000000')].join('\n')),
    ).toBeNull();
  });

  it('ignores interface names that could escape a sysfs path', () => {
    expect(
      parseDefaultRoute([ROUTE_HEADER, route('../x', '00000000', 0, '00000000')].join('\n')),
    ).toBeNull();
  });
});

describe('parseIwSsid', () => {
  it('reads the SSID of an associated interface', () => {
    const output = [
      'Connected to aa:bb:cc:dd:ee:ff (on wlan0)',
      '\tSSID: VenueNet',
      '\tfreq: 5180',
    ].join('\n');

    expect(parseIwSsid(output)).toBe('VenueNet');
  });

  it('decodes the byte escapes iw prints for non-ASCII names', () => {
    expect(parseIwSsid('\tSSID: B\\xc3\\xbchne 2\n')).toBe('Bühne 2');
  });

  it('keeps a literal character outside the BMP intact', () => {
    expect(parseIwSsid('\tSSID: Stage 🎸\n')).toBe('Stage 🎸');
  });

  it('drops control characters a hostile access point could advertise', () => {
    expect(parseIwSsid('\tSSID: Venue\\x0aNet\\x00\n')).toBe('VenueNet');
  });

  it('returns null when not connected', () => {
    expect(parseIwSsid('Not connected.\n')).toBeNull();
  });
});

describe('NetworkInfoService', () => {
  it('reports a wired connection with its address', async () => {
    const service = new NetworkInfoService(fakeHost());

    await expect(service.collect()).resolves.toEqual({
      interfaceName: 'eth0',
      kind: 'ethernet',
      ssid: null,
      ipAddress: '192.168.1.5',
    });
  });

  it('reports Wi-Fi with the SSID iw reads', async () => {
    const host = fakeHost({
      readFile: jest
        .fn()
        .mockResolvedValue([ROUTE_HEADER, route('wlan0', '00000000', 600, '00000000')].join('\n')),
      exists: jest.fn(async (path: string) => path.startsWith('/sys/class/net/wlan0')),
      interfaces: jest.fn().mockReturnValue({ wlan0: [ipv4('10.0.0.23')] }),
      iwLink: jest.fn().mockResolvedValue('Connected to aa:bb (on wlan0)\n\tSSID: VenueNet\n'),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toEqual({
      interfaceName: 'wlan0',
      kind: 'wifi',
      ssid: 'VenueNet',
      ipAddress: '10.0.0.23',
    });
    expect(host.iwLink).toHaveBeenCalledWith('wlan0');
  });

  it('still reports Wi-Fi when iw is unavailable', async () => {
    const host = fakeHost({
      exists: jest.fn(async (path: string) => path === '/sys/class/net/eth0/phy80211'),
      iwLink: jest.fn().mockRejectedValue(new Error('spawn iw ENOENT')),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toMatchObject({
      kind: 'wifi',
      ssid: null,
    });
  });

  // A bridge or VPN tunnel has no device link and may sit on top of Wi-Fi.
  it('does not call a virtual interface LAN', async () => {
    const host = fakeHost({
      readFile: jest
        .fn()
        .mockResolvedValue([ROUTE_HEADER, route('br0', '00000000', 0, '00000000')].join('\n')),
      exists: jest.fn(async (path: string) => path === '/sys/class/net/br0'),
      interfaces: jest.fn().mockReturnValue({ br0: [ipv4('192.168.1.5')] }),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toMatchObject({
      interfaceName: 'br0',
      kind: 'unknown',
      ipAddress: '192.168.1.5',
    });
  });

  it('reports unknown instead of throwing when the host cannot be read', async () => {
    const host = fakeHost({
      interfaces: jest.fn(() => {
        throw new Error('uv_interface_addresses failed');
      }),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toEqual({
      interfaceName: null,
      kind: 'unknown',
      ssid: null,
      ipAddress: null,
    });
  });

  it('falls back to the first external interface without a routing table', async () => {
    const host = fakeHost({
      readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
      interfaces: jest.fn().mockReturnValue({
        lo: [{ ...ipv4('127.0.0.1'), internal: true }],
        eth0: [ipv4('192.168.1.5')],
      }),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toMatchObject({
      interfaceName: 'eth0',
      ipAddress: '192.168.1.5',
    });
  });

  it('uses a global IPv6 address on an IPv6-only link, never the link-local one', async () => {
    const host = fakeHost({
      interfaces: jest.fn().mockReturnValue({
        eth0: [ipv6('fe80::1'), ipv6('2001:db8::5')],
      }),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toMatchObject({
      ipAddress: '2001:db8::5',
    });
  });

  it('reports everything unknown when no interface is up', async () => {
    const host = fakeHost({
      readFile: jest.fn().mockResolvedValue(ROUTE_HEADER),
      interfaces: jest.fn().mockReturnValue({}),
    });

    await expect(new NetworkInfoService(host).collect()).resolves.toEqual({
      interfaceName: null,
      kind: 'unknown',
      ssid: null,
      ipAddress: null,
    });
  });
});
