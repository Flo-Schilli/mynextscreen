import { detectMediaType, isSupportedMediaType } from './media-type.util';

function bytes(...values: number[]): Buffer {
  return Buffer.from(values);
}

function isobmff(brand: string): Buffer {
  return Buffer.concat([
    bytes(0x00, 0x00, 0x00, 0x18),
    Buffer.from('ftyp', 'latin1'),
    Buffer.from(brand, 'latin1'),
    Buffer.alloc(16),
  ]);
}

function riff(form: string): Buffer {
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    bytes(0x00, 0x00, 0x00, 0x00),
    Buffer.from(form, 'latin1'),
    Buffer.alloc(8),
  ]);
}

describe('detectMediaType', () => {
  it.each([
    ['image/jpeg', bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10)],
    ['image/png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ['image/gif', Buffer.from('GIF89a and pixels', 'latin1')],
    ['image/webp', riff('WEBP')],
    ['video/x-msvideo', riff('AVI ')],
    ['image/avif', isobmff('avif')],
    ['image/heic', isobmff('heic')],
    ['video/quicktime', isobmff('qt  ')],
    ['video/mp4', isobmff('isom')],
    ['video/mp4', isobmff('mp42')],
    ['video/webm', bytes(0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00)],
    ['video/mpeg', bytes(0x00, 0x00, 0x01, 0xba, 0x44, 0x00)],
  ])('detects %s from its magic bytes', (mime, buffer) => {
    expect(detectMediaType(buffer)?.mime).toBe(mime);
  });

  it('classifies images and videos', () => {
    expect(detectMediaType(bytes(0xff, 0xd8, 0xff))?.kind).toBe('image');
    expect(detectMediaType(isobmff('isom'))?.kind).toBe('video');
  });

  it('rejects an SVG, whatever the upload claims it is', () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    expect(detectMediaType(svg)).toBeNull();
  });

  it.each([
    ['HTML', Buffer.from('<!DOCTYPE html><script>alert(1)</script>')],
    ['a shell script', Buffer.from('#!/bin/sh\nrm -rf /')],
    ['an empty file', Buffer.alloc(0)],
    ['a truncated header', bytes(0xff, 0xd8)],
    ['a RIFF container that is neither WebP nor AVI', riff('WAVE')],
    ['an ISOBMFF file with an unknown brand', isobmff('crx ')],
  ])('rejects %s', (_label, buffer) => {
    expect(detectMediaType(buffer)).toBeNull();
  });

  it('does not care what extension or header the client claimed', () => {
    // Video bytes uploaded as image/png must come back as the video type.
    expect(detectMediaType(isobmff('isom'))?.mime).toBe('video/mp4');
  });
});

describe('isSupportedMediaType', () => {
  it.each(['image/png', 'video/mp4'])('accepts %s', (mime) => {
    expect(isSupportedMediaType(mime)).toBe(true);
  });

  it.each(['image/svg+xml', 'text/html', 'application/octet-stream', null, undefined, ''])(
    'rejects %s',
    (mime) => {
      expect(isSupportedMediaType(mime)).toBe(false);
    },
  );
});
