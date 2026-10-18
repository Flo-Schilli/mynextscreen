import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildIpFrame, decodeVisca, parseIpFrame, splitMessages } from './decode.mjs';

const bytes = (hex) => Buffer.from(hex.replace(/\s/g, ''), 'hex');

test('decodes pan/tilt in all eight directions', () => {
  const cases = {
    '01 03': 'left',
    '02 03': 'right',
    '03 01': 'up',
    '03 02': 'down',
    '01 01': 'up_left',
    '02 01': 'up_right',
    '01 02': 'down_left',
    '02 02': 'down_right',
  };
  for (const [pptt, direction] of Object.entries(cases)) {
    const decoded = decodeVisca(bytes(`81 01 06 01 08 06 ${pptt} ff`));
    assert.equal(decoded.text, `pan_tilt ${direction} pan=8 tilt=6`);
  }
});

test('decodes stop, zoom, home and presets', () => {
  assert.equal(decodeVisca(bytes('81 01 06 01 01 01 03 03 ff')).text, 'stop');
  assert.equal(decodeVisca(bytes('81 01 04 07 00 ff')).text, 'zoom_stop');
  assert.equal(decodeVisca(bytes('81 01 04 07 23 ff')).text, 'zoom in speed=3');
  assert.equal(decodeVisca(bytes('81 01 04 07 37 ff')).text, 'zoom out speed=7');
  assert.equal(decodeVisca(bytes('81 01 06 04 ff')).text, 'home');
  assert.equal(decodeVisca(bytes('81 01 04 3f 02 02 ff')).text, 'preset_recall 2');
  assert.equal(decodeVisca(bytes('81 01 04 3f 01 0f ff')).text, 'preset_store 15');
});

test('reports unknown messages as hex', () => {
  assert.deepEqual(decodeVisca(bytes('81 09 04 00 ff')), {
    command: 'unknown',
    text: '81 09 04 00 ff',
    hex: '81 09 04 00 ff',
  });
  assert.equal(decodeVisca(bytes('00')).command, 'unknown');
});

test('exposes structured fields for --json', () => {
  const decoded = decodeVisca(bytes('81 01 06 01 18 14 01 03 ff'));
  assert.equal(decoded.command, 'pan_tilt');
  assert.equal(decoded.pan, 24);
  assert.equal(decoded.tilt, 20);
});

test('splits a byte stream at terminators and keeps the remainder', () => {
  const { messages, rest } = splitMessages(bytes('81 01 06 04 ff 81 01 04'));
  assert.equal(messages.length, 1);
  assert.equal(rest.toString('hex'), '810104');
});

test('round-trips the VISCA-over-IP header', () => {
  const frame = buildIpFrame(0x0100, 7, bytes('81 01 06 04 ff'));
  assert.equal(frame.toString('hex'), '0100' + '0005' + '00000007' + '81010604ff');
  const parsed = parseIpFrame(frame);
  assert.equal(parsed.type, 0x0100);
  assert.equal(parsed.seq, 7);
  assert.equal(parsed.payload.toString('hex'), '81010604ff');
  assert.equal(parseIpFrame(Buffer.from([1, 2])), null);
});
