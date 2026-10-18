#!/usr/bin/env node
// VISCA-Kameramock für den Laboreinsatz. Keine Abhängigkeiten.
import { createServer } from 'node:net';
import { createSocket } from 'node:dgram';
import { buildIpFrame, decodeVisca, parseIpFrame, splitMessages } from './decode.mjs';

const UDP_PORT = Number(process.env.VISCA_UDP_PORT ?? 52381);
const TCP_PORT = Number(process.env.VISCA_TCP_PORT ?? 5678);
const JSON_OUTPUT = process.argv.includes('--json');

const TYPE_COMMAND = 0x0100;
const TYPE_REPLY = 0x0111;
const TYPE_CONTROL = 0x0200;
const TYPE_CONTROL_REPLY = 0x0201;
const ACK = [0x90, 0x41, 0xff];
const COMPLETION = [0x90, 0x51, 0xff];

function log(proto, decoded, extra = {}) {
  if (JSON_OUTPUT) {
    const { text, ...fields } = decoded;
    console.log(JSON.stringify({ proto, ...extra, ...fields }));
  } else {
    console.log(`[${proto}] ${decoded.text}`);
  }
}

const udp = createSocket('udp4');
udp.on('message', (datagram, remote) => {
  const frame = parseIpFrame(datagram);
  if (!frame) {
    log('udp', { command: 'unknown', text: `short datagram ${datagram.toString('hex')}` });
    return;
  }
  if (frame.type === TYPE_CONTROL) {
    log('udp', { command: 'reset', text: 'reset' }, { seq: frame.seq });
    udp.send(buildIpFrame(TYPE_CONTROL_REPLY, frame.seq, [0x01]), remote.port, remote.address);
    return;
  }
  if (frame.type !== TYPE_COMMAND) {
    log('udp', { command: 'unknown', text: `type ${frame.type.toString(16)}` }, { seq: frame.seq });
    return;
  }
  log('udp', decodeVisca(frame.payload), { seq: frame.seq });
  for (const reply of [ACK, COMPLETION]) {
    udp.send(buildIpFrame(TYPE_REPLY, frame.seq, reply), remote.port, remote.address);
  }
});
udp.on('error', (error) => console.error(`UDP-Fehler: ${error.message}`));
udp.bind(UDP_PORT, () => console.error(`VISCA-Mock: UDP ${UDP_PORT}`));

const tcp = createServer((socket) => {
  let pending = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    const { messages, rest } = splitMessages(Buffer.concat([pending, chunk]));
    pending = rest;
    for (const message of messages) {
      log('tcp', decodeVisca(message));
      socket.write(Buffer.from([...ACK, ...COMPLETION]));
    }
  });
  socket.on('error', (error) => console.error(`TCP-Fehler: ${error.message}`));
});
tcp.listen(TCP_PORT, () => console.error(`VISCA-Mock: TCP ${TCP_PORT}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    udp.close();
    tcp.close();
    process.exit(0);
  });
}
