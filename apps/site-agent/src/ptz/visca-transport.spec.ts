import { EventEmitter } from 'node:events';
import {
  ACK_TIMEOUT_MS,
  TCP_RECONNECT_COOLDOWN_MS,
  ViscaTransport,
  viscaIpFrame,
  type TcpSocketLike,
  type UdpSocketLike,
} from './visca-transport';

class FakeUdp extends EventEmitter implements UdpSocketLike {
  sent: { data: Buffer; port: number; host: string }[] = [];
  closed = false;
  failSend: Error | null = null;
  send(data: Buffer, port: number, host: string, cb: (error: Error | null) => void): void {
    this.sent.push({ data, port, host });
    cb(this.failSend);
  }
  close(): void {
    this.closed = true;
  }
}

class FakeTcp extends EventEmitter implements TcpSocketLike {
  written: Buffer[] = [];
  destroyed = false;
  writeError: Error | null = null;
  write(data: Buffer, cb: (error?: Error | null) => void): boolean {
    this.written.push(data);
    cb(this.writeError);
    return true;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

const hex = (b: Buffer): string => b.toString('hex');
const MOVE = Buffer.from('81010601181401' + '03ff', 'hex');
const udpTarget = { host: '10.0.0.5', port: 52381, protocol: 'visca_udp' } as const;
const tcpTarget = { host: '10.0.0.5', port: 5678, protocol: 'visca_tcp' } as const;

describe('viscaIpFrame', () => {
  it('writes type, big-endian length and 32-bit sequence', () => {
    expect(hex(viscaIpFrame(Buffer.from([1, 0]), 0x01020304, Buffer.from([0x81, 0xff])))).toBe(
      '0100' + '0002' + '01020304' + '81ff',
    );
  });
});

describe('ViscaTransport over UDP', () => {
  let udp: FakeUdp[];
  let transport: ViscaTransport;

  beforeEach(() => {
    jest.useFakeTimers();
    udp = [];
    transport = new ViscaTransport({
      createUdp: () => {
        const socket = new FakeUdp();
        udp.push(socket);
        return socket;
      },
      connectTcp: () => {
        throw new Error('unused');
      },
    });
  });

  afterEach(() => {
    transport.onModuleDestroy();
    jest.useRealTimers();
  });

  it('sends RESET once, then numbered commands with the header', async () => {
    await transport.send(udpTarget, [MOVE]);
    await transport.send(udpTarget, [MOVE]);

    expect(udp).toHaveLength(1);
    expect(udp[0].sent.map((s) => hex(s.data))).toEqual([
      '0200' + '0001' + '00000000' + '01',
      '0100' + '0009' + '00000001' + hex(MOVE),
      '0100' + '0009' + '00000002' + hex(MOVE),
    ]);
    expect(udp[0].sent[0]).toMatchObject({ host: '10.0.0.5', port: 52381 });
  });

  it('keeps one socket and one sequence per camera', async () => {
    await transport.send(udpTarget, [MOVE]);
    await transport.send({ ...udpTarget, host: '10.0.0.6' }, [MOVE]);

    expect(udp).toHaveLength(2);
    expect(hex(udp[1].sent[1].data)).toContain('00000001');
  });

  it('sends several messages in order', async () => {
    await transport.send(udpTarget, [Buffer.from([1]), Buffer.from([2])]);

    expect(udp[0].sent.slice(1).map((s) => s.data[s.data.length - 1])).toEqual([1, 2]);
  });

  it('sends strictly in call order even when a write is slow', async () => {
    const releases: Array<() => void> = [];
    const original = FakeUdp.prototype.send;
    FakeUdp.prototype.send = function (data, port, host, cb) {
      this.sent.push({ data, port, host });
      releases.push(() => cb(null));
    };
    try {
      const first = transport.send(udpTarget, [Buffer.from([1])]);
      const second = transport.send(udpTarget, [Buffer.from([2])]);
      await jest.advanceTimersByTimeAsync(0);

      expect(udp[0].sent).toHaveLength(1);

      for (let i = 0; i < 5; i++) {
        releases.shift()?.();
        await jest.advanceTimersByTimeAsync(0);
      }
      await Promise.all([first, second]);

      expect(udp[0].sent.map((s) => s.data[s.data.length - 1])).toEqual([1, 1, 2]);
      expect(hex(udp[0].sent[0].data).startsWith('0200')).toBe(true);
    } finally {
      FakeUdp.prototype.send = original;
    }
  });

  it('keeps the chain alive when a send fails', async () => {
    await transport.send(udpTarget, [MOVE]);
    udp[0].failSend = new Error('EHOSTUNREACH');
    await expect(transport.send(udpTarget, [MOVE])).resolves.toBeUndefined();
    udp[0].failSend = null;
    await transport.send(udpTarget, [MOVE]);

    expect(udp[0].sent).toHaveLength(4);
  });

  it('closes peers whose address is no longer referenced', async () => {
    const other = { ...udpTarget, host: '10.0.0.6' };
    await transport.send(udpTarget, [MOVE]);
    await transport.send(other, [MOVE]);

    transport.retainOnly([other]);

    expect(udp[0].closed).toBe(true);
    expect(udp[1].closed).toBe(false);
  });

  it('does not wait for a reply and tolerates a missing one', async () => {
    await transport.send(udpTarget, [MOVE]);

    jest.advanceTimersByTime(ACK_TIMEOUT_MS + 1);
  });

  it('accepts ACK, completion and error replies for a pending sequence', async () => {
    await transport.send(udpTarget, [MOVE]);
    const reply = (status: number[]): Buffer =>
      viscaIpFrame(Buffer.from([0x01, 0x11]), 1, Buffer.from(status));

    udp[0].emit('message', reply([0x90, 0x41, 0xff]));
    udp[0].emit('message', reply([0x90, 0x51, 0xff]));
    udp[0].emit('message', reply([0x90, 0x60, 0x02, 0xff]));
    udp[0].emit('message', Buffer.from([1, 2]));
    udp[0].emit('message', viscaIpFrame(Buffer.from([1, 0x11]), 99, Buffer.from([0x90, 0x41])));
  });

  it('survives a failing send', async () => {
    await transport.send(udpTarget, [MOVE]);
    udp[0].failSend = new Error('unreachable');

    await expect(transport.send(udpTarget, [MOVE])).resolves.toBeUndefined();
  });

  it('drops a failed socket and opens a new one with a fresh RESET', async () => {
    await transport.send(udpTarget, [MOVE]);
    udp[0].emit('error', new Error('boom'));
    await transport.send(udpTarget, [MOVE]);

    expect(udp[0].closed).toBe(true);
    expect(udp).toHaveLength(2);
    expect(hex(udp[1].sent[0].data)).toBe('0200' + '0001' + '00000000' + '01');
  });

  it('closes sockets on destroy', async () => {
    await transport.send(udpTarget, [MOVE]);
    transport.onModuleDestroy();

    expect(udp[0].closed).toBe(true);
  });

  it('ignores a socket that throws on close', async () => {
    await transport.send(udpTarget, [MOVE]);
    udp[0].close = () => {
      throw new Error('already closed');
    };

    expect(() => transport.onModuleDestroy()).not.toThrow();
  });
});

describe('ViscaTransport over TCP', () => {
  let tcp: FakeTcp[];
  let connectTcp: jest.Mock;
  let transport: ViscaTransport;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick'] });
    tcp = [];
    connectTcp = jest.fn((): TcpSocketLike => {
      const socket = new FakeTcp();
      tcp.push(socket);
      queueMicrotask(() => socket.emit('connect'));
      return socket;
    });
    transport = new ViscaTransport({
      createUdp: () => {
        throw new Error('unused');
      },
      connectTcp,
    });
  });

  afterEach(() => {
    transport.onModuleDestroy();
    jest.useRealTimers();
  });

  it('writes raw bytes over one lazy connection per camera', async () => {
    await transport.send(tcpTarget, [MOVE]);
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(1);
    expect(connectTcp).toHaveBeenCalledWith(5678, '10.0.0.5');
    expect(tcp[0].written.map(hex)).toEqual([hex(MOVE), hex(MOVE)]);
  });

  it('reconnects after the connection closes', async () => {
    await transport.send(tcpTarget, [MOVE]);
    tcp[0].emit('data', Buffer.from([0x90, 0x41, 0xff]));
    tcp[0].emit('close');
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(2);
    expect(tcp[0].destroyed).toBe(true);
  });

  it('reconnects after a connection error', async () => {
    await transport.send(tcpTarget, [MOVE]);
    tcp[0].emit('error', new Error('reset'));
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(2);
  });

  it('logs and drops the connection when connecting fails', async () => {
    connectTcp.mockImplementationOnce((): TcpSocketLike => {
      const socket = new FakeTcp();
      tcp.push(socket);
      queueMicrotask(() => socket.emit('error', new Error('refused')));
      return socket;
    });

    await expect(transport.send(tcpTarget, [MOVE])).resolves.toBeUndefined();
    jest.setSystemTime(Date.now() + TCP_RECONNECT_COOLDOWN_MS + 1);
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(2);
    expect(tcp[1].written).toHaveLength(1);
  });

  it('skips sends during the cool-down after a failed connect', async () => {
    connectTcp.mockImplementationOnce((): TcpSocketLike => {
      const socket = new FakeTcp();
      tcp.push(socket);
      queueMicrotask(() => socket.emit('error', new Error('refused')));
      return socket;
    });

    await transport.send(tcpTarget, [MOVE]);
    await transport.send(tcpTarget, [MOVE]);
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.now() + TCP_RECONNECT_COOLDOWN_MS + 1);
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(2);
  });

  it('closes sockets whose address is no longer referenced', async () => {
    await transport.send(tcpTarget, [MOVE]);

    transport.retainOnly([]);
    await Promise.resolve();
    await Promise.resolve();

    expect(tcp[0].destroyed).toBe(true);
  });

  it('drops the connection when a write fails', async () => {
    await transport.send(tcpTarget, [MOVE]);
    tcp[0].writeError = new Error('EPIPE');
    await transport.send(tcpTarget, [MOVE]);
    await transport.send(tcpTarget, [MOVE]);

    expect(connectTcp).toHaveBeenCalledTimes(2);
  });

  it('gives up on a connect that never completes', async () => {
    jest.useFakeTimers();
    try {
      connectTcp.mockImplementationOnce((): TcpSocketLike => {
        const socket = new FakeTcp();
        tcp.push(socket);
        return socket;
      });
      const sending = transport.send(tcpTarget, [MOVE]);
      await jest.advanceTimersByTimeAsync(2500);
      await sending;

      expect(tcp[0].destroyed).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('closes connections on destroy', async () => {
    await transport.send(tcpTarget, [MOVE]);
    transport.onModuleDestroy();
    await Promise.resolve();
    await Promise.resolve();

    expect(tcp[0].destroyed).toBe(true);
  });
});
