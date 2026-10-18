import { createSocket } from 'node:dgram';
import { EventEmitter } from 'node:events';
import { connect } from 'node:net';
import { Logger, type OnModuleDestroy } from '@nestjs/common';
import type { PtzProtocolValue } from '../protocol/server-protocol';

export interface ViscaTarget {
  host: string;
  port: number;
  protocol: PtzProtocolValue;
}

/** What the transport needs from a UDP socket. */
export interface UdpSocketLike extends EventEmitter {
  send(msg: Buffer, port: number, host: string, cb: (error: Error | null) => void): void;
  close(): void;
}

/** What the transport needs from a TCP connection. */
export interface TcpSocketLike extends EventEmitter {
  write(data: Buffer, cb: (error?: Error | null) => void): boolean;
  destroy(): void;
}

export interface ViscaSocketFactories {
  createUdp: () => UdpSocketLike;
  connectTcp: (port: number, host: string) => TcpSocketLike;
}

export const systemSocketFactories: ViscaSocketFactories = {
  createUdp: () => createSocket('udp4'),
  connectTcp: (port, host) => connect({ port, host }),
};

/** How long to wait for an ACK before giving up on it (never blocks the caller). */
export const ACK_TIMEOUT_MS = 500;
export const CONNECT_TIMEOUT_MS = 2000;
/** After a failed TCP connect, further sends to that camera are dropped for this long. */
export const TCP_RECONNECT_COOLDOWN_MS = 2000;

const PAYLOAD_VISCA_COMMAND = Buffer.from([0x01, 0x00]);
const PAYLOAD_CONTROL = Buffer.from([0x02, 0x00]);
const HEADER_BYTES = 8;
const RESET_PAYLOAD = Buffer.from([0x01]);

/** `01 00 | length | seq | payload`, big-endian throughout. */
export function viscaIpFrame(type: Buffer, seq: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(HEADER_BYTES);
  type.copy(header, 0);
  header.writeUInt16BE(payload.length, 2);
  header.writeUInt32BE(seq >>> 0, 4);
  return Buffer.concat([header, payload]);
}

interface UdpPeer {
  socket: UdpSocketLike;
  seq: number;
  pending: Map<number, NodeJS.Timeout>;
}

/**
 * Carries VISCA bytes to a camera. Failures are logged and swallowed by
 * `send`'s caller contract: a lost move command is stopped by the dead-man.
 *
 * UDP is Sony's VISCA-over-IP (8-byte header, RESET control message once per
 * camera before the first command); TCP is raw VISCA as PTZOptics speaks it.
 * ACK/completion replies are read in the background and only logged, so a
 * silent camera never delays the next command.
 *
 * Sends to one camera are serialized in call order (RESET, then the first
 * command, then the rest), so a slow UDP write can never be overtaken.
 */
export class ViscaTransport implements OnModuleDestroy {
  private readonly logger = new Logger(ViscaTransport.name);
  private readonly udp = new Map<string, UdpPeer>();
  private readonly tcp = new Map<string, Promise<TcpSocketLike>>();
  private readonly tcpCooldownUntil = new Map<string, number>();
  private readonly chains = new Map<string, Promise<void>>();

  constructor(private readonly factories: ViscaSocketFactories = systemSocketFactories) {}

  send(target: ViscaTarget, messages: readonly Buffer[]): Promise<void> {
    const key = this.key(target);
    const previous = this.chains.get(key) ?? Promise.resolve();
    // A failing delivery must not break the chain for the sends queued behind it.
    const run = previous.then(() => this.deliver(target, messages)).catch(() => undefined);
    this.chains.set(key, run);
    void run.then(() => {
      if (this.chains.get(key) === run) {
        this.chains.delete(key);
      }
    });
    return run;
  }

  /** Closes the sockets of every camera address that is not in `targets` any more. */
  retainOnly(targets: readonly ViscaTarget[]): void {
    const keep = new Set(targets.map((target) => this.key(target)));
    for (const [key, peer] of this.udp) {
      if (!keep.has(key)) {
        this.closePeer(peer);
        this.udp.delete(key);
      }
    }
    for (const key of [...this.tcp.keys()]) {
      if (!keep.has(key)) {
        this.dropTcp(key);
      }
    }
    for (const key of [...this.tcpCooldownUntil.keys()]) {
      if (!keep.has(key)) {
        this.tcpCooldownUntil.delete(key);
      }
    }
  }

  private async deliver(target: ViscaTarget, messages: readonly Buffer[]): Promise<void> {
    for (const message of messages) {
      if (target.protocol === 'visca_udp') {
        await this.sendUdp(target, message);
      } else {
        await this.sendTcp(target, message);
      }
    }
  }

  onModuleDestroy(): void {
    for (const peer of this.udp.values()) {
      this.closePeer(peer);
    }
    this.udp.clear();
    for (const connection of this.tcp.values()) {
      void connection.then((socket) => socket.destroy()).catch(() => undefined);
    }
    this.tcp.clear();
    this.tcpCooldownUntil.clear();
  }

  private key(target: ViscaTarget): string {
    return `${target.host}:${target.port}`;
  }

  private async sendUdp(target: ViscaTarget, message: Buffer): Promise<void> {
    const key = this.key(target);
    let peer = this.udp.get(key);
    if (!peer) {
      peer = this.openPeer(key);
      this.udp.set(key, peer);
      // RESET puts the camera's sequence counter back to 0, so the first
      // command after it carries 1.
      await this.udpWrite(peer, target, viscaIpFrame(PAYLOAD_CONTROL, 0, RESET_PAYLOAD));
    }
    peer.seq = (peer.seq + 1) >>> 0;
    const seq = peer.seq;
    await this.udpWrite(peer, target, viscaIpFrame(PAYLOAD_VISCA_COMMAND, seq, message));
    this.expectAck(peer, seq);
  }

  private openPeer(key: string): UdpPeer {
    const socket = this.factories.createUdp();
    const peer: UdpPeer = { socket, seq: 0, pending: new Map() };
    socket.on('message', (data: Buffer) => this.onReply(peer, data));
    socket.on('error', (error: Error) => {
      this.logger.warn(`VISCA UDP socket for ${key} failed: ${error.message}`);
      this.closePeer(peer);
      if (this.udp.get(key) === peer) {
        this.udp.delete(key);
      }
    });
    return peer;
  }

  private udpWrite(peer: UdpPeer, target: ViscaTarget, data: Buffer): Promise<void> {
    return new Promise((resolve) => {
      peer.socket.send(data, target.port, target.host, (error) => {
        if (error) {
          this.logger.warn(`VISCA UDP send failed: ${error.message}`);
        }
        resolve();
      });
    });
  }

  private expectAck(peer: UdpPeer, seq: number): void {
    const timer = setTimeout(() => {
      peer.pending.delete(seq);
      this.logger.debug(`No VISCA reply for sequence ${seq} within ${ACK_TIMEOUT_MS} ms`);
    }, ACK_TIMEOUT_MS);
    timer.unref();
    peer.pending.set(seq, timer);
  }

  private onReply(peer: UdpPeer, data: Buffer): void {
    if (data.length <= HEADER_BYTES) {
      return;
    }
    const seq = data.readUInt32BE(4);
    const status = data[HEADER_BYTES + 1] ?? 0;
    const kind = status >> 4;
    if (kind === 0x6) {
      this.logger.warn(`Camera rejected command ${seq} (error ${status.toString(16)})`);
    }
    // ACK (4y) leaves the timer for the completion (5y); either one answers.
    if (kind === 0x5 || kind === 0x6 || kind === 0x4) {
      const timer = peer.pending.get(seq);
      if (timer) {
        clearTimeout(timer);
        peer.pending.delete(seq);
      }
    }
  }

  private closePeer(peer: UdpPeer): void {
    for (const timer of peer.pending.values()) {
      clearTimeout(timer);
    }
    peer.pending.clear();
    try {
      peer.socket.close();
    } catch {
      // Already closed.
    }
  }

  private async sendTcp(target: ViscaTarget, message: Buffer): Promise<void> {
    const key = this.key(target);
    const cooldownUntil = this.tcpCooldownUntil.get(key) ?? 0;
    if (Date.now() < cooldownUntil) {
      this.logger.debug(`Skipping VISCA TCP send to ${key}: reconnect cool-down`);
      return;
    }
    let socket: TcpSocketLike;
    try {
      socket = await this.tcpConnection(target);
    } catch (error) {
      this.tcpCooldownUntil.set(key, Date.now() + TCP_RECONNECT_COOLDOWN_MS);
      this.logger.warn(`VISCA TCP connect to ${key} failed: ${errorMessage(error)}`);
      this.dropTcp(key);
      return;
    }
    try {
      await new Promise<void>((resolve, reject) => {
        socket.write(message, (error) => (error ? reject(error) : resolve()));
      });
    } catch (error) {
      this.logger.warn(`VISCA TCP send failed: ${errorMessage(error)}`);
      this.dropTcp(key);
    }
  }

  private tcpConnection(target: ViscaTarget): Promise<TcpSocketLike> {
    const key = this.key(target);
    const existing = this.tcp.get(key);
    if (existing) {
      return existing;
    }
    const connection = new Promise<TcpSocketLike>((resolve, reject) => {
      const socket = this.factories.connectTcp(target.port, target.host);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('connect timed out'));
      }, CONNECT_TIMEOUT_MS);
      timer.unref();
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.on('error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
        this.dropTcp(key);
      });
      socket.on('close', () => {
        clearTimeout(timer);
        this.dropTcp(key);
      });
      // Replies carry nothing the agent acts on; draining keeps the socket flowing.
      socket.on('data', () => undefined);
    });
    this.tcp.set(key, connection);
    return connection;
  }

  private dropTcp(key: string): void {
    const connection = this.tcp.get(key);
    if (!connection) {
      return;
    }
    this.tcp.delete(key);
    void connection.then((socket) => socket.destroy()).catch(() => undefined);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
