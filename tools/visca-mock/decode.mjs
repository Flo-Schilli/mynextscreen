// Decoder für VISCA-Befehle (Kameraadresse 1) und das VISCA-over-IP-Framing.

const DIRECTIONS = new Map([
  ['01:03', 'left'],
  ['02:03', 'right'],
  ['03:01', 'up'],
  ['03:02', 'down'],
  ['01:01', 'up_left'],
  ['02:01', 'up_right'],
  ['01:02', 'down_left'],
  ['02:02', 'down_right'],
]);

export const toHex = (bytes) => Buffer.from(bytes).toString('hex').match(/../g)?.join(' ') ?? '';

/** Dekodiert eine VISCA-Nachricht (ohne IP-Header) in ein Objekt mit `text`. */
export function decodeVisca(bytes) {
  const b = [...bytes];
  const hex = (n) => n.toString(16).padStart(2, '0');
  const unknown = () => ({ command: 'unknown', text: toHex(b), hex: toHex(b) });
  if (b.length < 3 || b[0] !== 0x81 || b[b.length - 1] !== 0xff || b[1] !== 0x01) {
    return unknown();
  }
  const [, , cat, sub] = b;

  if (cat === 0x06 && sub === 0x01 && b.length === 9) {
    const [, , , , pan, tilt, pp, tt] = b;
    if (pp === 0x03 && tt === 0x03) {
      return { command: 'stop', text: 'stop' };
    }
    const direction = DIRECTIONS.get(`${hex(pp)}:${hex(tt)}`);
    if (direction) {
      return {
        command: 'pan_tilt',
        direction,
        pan,
        tilt,
        text: `pan_tilt ${direction} pan=${pan} tilt=${tilt}`,
      };
    }
  }
  if (cat === 0x04 && sub === 0x07 && b.length === 6) {
    const kind = b[4] >> 4;
    const speed = b[4] & 0x0f;
    if (b[4] === 0x00) {
      return { command: 'zoom_stop', text: 'zoom_stop' };
    }
    if (kind === 2 || kind === 3) {
      const direction = kind === 2 ? 'in' : 'out';
      return { command: 'zoom', direction, speed, text: `zoom ${direction} speed=${speed}` };
    }
  }
  if (cat === 0x06 && sub === 0x04 && b.length === 5) {
    return { command: 'home', text: 'home' };
  }
  if (cat === 0x04 && sub === 0x3f && b.length === 7 && (b[4] === 0x01 || b[4] === 0x02)) {
    const command = b[4] === 0x02 ? 'preset_recall' : 'preset_store';
    return { command, preset: b[5], text: `${command} ${b[5]}` };
  }
  return unknown();
}

/** Zerlegt einen Byte-Strom an den 0xFF-Terminatoren; Rest bleibt im Puffer. */
export function splitMessages(buffer) {
  const messages = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0xff) {
      messages.push(buffer.subarray(start, i + 1));
      start = i + 1;
    }
  }
  return { messages, rest: buffer.subarray(start) };
}

/** Zerlegt ein VISCA-over-IP-Datagramm. Gibt null zurück, wenn es zu kurz ist. */
export function parseIpFrame(datagram) {
  if (datagram.length < 8) {
    return null;
  }
  const length = datagram.readUInt16BE(2);
  return {
    type: datagram.readUInt16BE(0),
    seq: datagram.readUInt32BE(4),
    payload: datagram.subarray(8, 8 + length),
  };
}

export function buildIpFrame(type, seq, payload) {
  const header = Buffer.alloc(8);
  header.writeUInt16BE(type, 0);
  header.writeUInt16BE(payload.length, 2);
  header.writeUInt32BE(seq, 4);
  return Buffer.concat([header, Buffer.from(payload)]);
}
